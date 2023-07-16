import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { Logger } from 'winston';
import { IKnowledgeBase, IFile } from './KnowledgeBase';

const modules = { path };

export interface IKbFilesystemSync {
  kb: IKnowledgeBase;
  dispose(): void;
}

async function stat(path: string): Promise<fs.Stats | null> {
  let st: fs.Stats | null = null;
  try {
    st = await fsp.stat(path);
  } catch {
    // ignore
  }
  return st;
}

/** Enumerating filesystem files in the knowledge base folder through asynchronous generator. */
export async function* findKbFiles(log: Logger, kb: IKnowledgeBase, path?: string): AsyncGenerator<IFile> {
  const fullPath =
    path === undefined || path === null || path === '' || path === '.'
      ? kb.root
      : modules.path.resolve(kb.root, path);

  const st = await stat(fullPath);
  if (st === null) {
    log.debug(`findKbFiles: failed to stat "${fullPath}".`);
    return;
  }

  if (!st.isDirectory()) {
    // path is not a folder, but a file, so return it
    const file = kb.createFile(fullPath, st.mtime);
    if (file !== null) {
      yield file;
    }
    return;
  }

  const all: string[] = [];
  try {
    all.push(...await fsp.readdir(fullPath));
  } catch {
    log.info(`findKbFiles: failed to read the folder "${fullPath}".`);
    return;
  }

  log.debug(`findKbFiles: "${fullPath}" all: ${JSON.stringify(all)}`);

  const filtered =
    all.filter(item => kb.isAccepted(modules.path.join(fullPath, item)));

  log.debug(`findKbFiles: "${fullPath}" filtered: ${JSON.stringify(filtered)}`);

  for await (const item of filtered) {
    // item is a folder or file name with extension

    const itemFullPath = modules.path.join(fullPath, item);
    const itemRelativePath = modules.path.relative(kb.root, itemFullPath);

    const st = await stat(itemFullPath);

    if (st === null) {
      log.debug(`findKbFiles: failed to stat "${fullPath}".`);
      continue;
    }

    if (st.isDirectory()) {
      yield* findKbFiles(log, kb, itemRelativePath);
    } else {
      const fileInfo = kb.createFile(itemFullPath, st.mtime);
      if (fileInfo !== null) {
        yield fileInfo;
      }
    }
  }
}

export async function createKbFilesystemSync(log: Logger, kb: IKnowledgeBase): Promise<IKbFilesystemSync> {
  const files = [];
  for await (const file of findKbFiles(log, kb)) {
    files.push(file);
  }
  kb.addFiles(files);

  log.info(`KbFilesystemSync: added ${files.length} files to the knowledge base.`);

  const ac = new AbortController();

  const sync : IKbFilesystemSync = {
    kb,
    dispose: () => {
      log.info(`KbFilesystemSync: stopping monitoring "${kb.root}".`);
      ac.abort();
    }
  };

  // event-based filesystem monitoring
  (async () => {
    log.info(`Watcher: starting monitoring "${kb.root}".`);

    try {
      const watcher = fsp.watch(kb.root, { recursive: true, signal: ac.signal });

      for await (const event of watcher) {
        if (event === null || event === undefined) {
          log.debug(`Watcher: skipping, event is empty.`);
          continue;
        }

        const filename = event.filename;

        if (filename === undefined || filename === null || filename === '') {
          log.debug(`Watcher: skipping, event filename is empty, event is ${JSON.stringify(event)}.`);
          continue;
        }

        const itemFullName = path.join(kb.root, filename);
        if (!kb.isAccepted(itemFullName)) {
          log.debug(`Watcher: skipping, event path "${itemFullName}" is excluded, event is ${JSON.stringify(event)}.`);
          continue;
        }

        log.debug(`Watcher: the file or folder "${itemFullName}" was changed, removing and adding its files, event is ${JSON.stringify(event)}.`);

        const existing = kb.filesWithFilesystemPath(itemFullName);
        kb.removeFiles(existing);

        const added : IFile[] = [];
        for await (const file of findKbFiles(log, kb, itemFullName)) {
          added.push(file);
        }
        kb.addFiles(added);
      }
    } catch (err: any) {
      if (err && err.name === 'AbortError') {
        log.info(`Watcher: stopped monitoring "${kb.root}".`);
        return;
      }
      throw err;
    }
  })();

  return sync;
}
