import fs from 'fs';
import fsp from 'fs/promises';
import { sep } from 'path';
import { Logger } from 'winston';
import { Enqueuer } from './AsyncIterableQueue';
import
{
  IFile,
  IKnowledgeBase,
  KnowledgeBase
} from './KnowledgeBase';
import
{
  IKbFilesystemSync,
  createKbFilesystemEventsIterator
} from './KbFilesystemSync';
import
{
  EditorEvent,
  isFolderAddedEvent,
  isFolderRemovedEvent,
  isFileUpdatedEvent,
  isFileDeletedEvent
} from './EditorEvents';
import { KbEvent } from './KbEvents';

export function translateEditorEventsToKbEvents
  (log: Logger,
    queue: AsyncIterable<EditorEvent>,
    enqueuer: Enqueuer<KbEvent>)
  : () => void
{
  const context = "translateEditorEventsToKbEvents";

  /** The list of loaded knowledge bases. Each corresponds to the workspace's folder. */
  const knowledgeBases: IKnowledgeBase[] = [];

  /** The list of filesystem watchers. Each corresponds to the workspace's folder
   *  and the loaded knowledge base associated with it. */
  const kbFsSyncs: IKbFilesystemSync[] = [];

  let disposed = false;

  (async () =>
  {
    for await (const event of queue) {
      if (disposed) {
        break;
      }

      if (isFolderAddedEvent(event)) {
        await addKb(event.path, event.exclude || {});
      } else if (isFolderRemovedEvent(event)) {
        await removeKb(event.path);
      } else if (isFileUpdatedEvent(event)) {
        await addFile(event.path);
      } else if (isFileDeletedEvent(event)) {
        await deleteFile(event.path);
      }
    }
  })();

  return () => { disposed = true; };

  async function addKb
    (root: string,
      exclude: { [key: string]: boolean })
    : Promise<IKnowledgeBase | null>
  {
    log.info(`[${context}] Adding knowledge base: ${root}`);

    const existing = knowledgeBases.find(kb => kb.root === root);
    if (existing) {
      log.info(`[${context}] The knowledge base "${root}" has been added already.`);
      return null;
    }

    const st = await stat(root);
    if (st === null) {
      log.info(`[${context}] The knowledge base "${root}" does not exist.`);
      return null;
    }

    const kb = new KnowledgeBase(root, exclude);
    knowledgeBases.push(kb);

    enqueuer.enqueue({
      event: 'kb-added',
      exclude,
      root: kb.root,
      files: kb.files.map(file => file.path)
    });

    kb.onFilesChanged((files) =>
    {
      const isMarkdownFile =
        (file: IFile) => file.type === 'markdown';

      for (const file of (files?.removed || []).filter(isMarkdownFile)) {
        enqueuer.enqueue({
          event: 'kb-file-removed',
          path: file.path,
          root: kb.root
        });
      }

      for (const file of (files?.added || []).filter(isMarkdownFile)) {
        enqueuer.enqueue({
          event: 'kb-file-added',
          path: file.path,
          root: kb.root
        });
      }
    });

    const sync = await createKbFilesystemEventsIterator(log, kb);
    kbFsSyncs.push(sync);

    return kb;
  }

  async function removeKb
    (root: string)
    : Promise<IKnowledgeBase | null>
  {
    const kb = knowledgeBases.find(kb => kb.root === root);
    if (!kb) {
      return null;
    }

    enqueuer.enqueue({
      event: 'kb-removed',
      root: kb.root,
      files: kb.files.map(file => file.path)
    });

    knowledgeBases.splice(knowledgeBases.indexOf(kb), 1);

    const sync = kbFsSyncs.find(item => item.kb === kb);
    if (sync) {
      sync.dispose();
      kbFsSyncs.splice(kbFsSyncs.indexOf(sync), 1);
    }

    return kb;
  }

  async function addFile
    (path: string)
    : Promise<void>
  {
    const kb = knowledgeBases.find(kb => path.startsWith(kb.root + sep));
    if (!kb) {
      return;
    }

    const st = await stat(path);
    if (st === null) {
      log.debug(`path: failed to stat "${path}".`);
      return;
    }

    const existing = kb.filesWithFilesystemPath(path);
    kb.removeFiles(existing);

    const file = kb.createFile(path, st.mtime);
    if (!file) {
      return;
    }

    kb.addFiles([file]);
  }

  async function deleteFile
    (path: string)
    : Promise<void>
  {
    const kb = knowledgeBases.find(kb => path.startsWith(kb.root + sep));
    if (!kb) {
      return;
    }

    const file = kb.files.find(file => file.fullPath === path);
    if (!file) {
      return;
    }

    kb.removeFiles([file]);
  }
}

async function stat
  (path: string)
  : Promise<fs.Stats | null>
{
  let st: fs.Stats | null = null;
  try {
    st = await fsp.stat(path);
  } catch {
    // ignore
  }
  return st;
}
