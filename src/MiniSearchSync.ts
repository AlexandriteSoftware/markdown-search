import MiniSearch from 'minisearch';
import { Logger } from 'winston';
import { IKnowledgeBase, IFile } from './KnowledgeBase';
import { AsyncIterableQueue, IEnqueue } from './AsyncIterableQueue';

export interface IMiniSearchEvent {
  action: 'added' | 'removed';
  path?: string;
  file?: IFile
}

export function createMiniSearchEventQueue(log: Logger, miniSearch: MiniSearch): AsyncIterableQueue<IMiniSearchEvent> {
  async function addFileToSearchIndex(log: Logger, file: IFile): Promise<boolean> {
    log.debug(`addFileToSearchIndex(${file.fullPath})`);

    const content = await file.readText();
    if (content === null) {
      return false;
    }

    miniSearch.add({
      id: file.fullPath,
      title: file.basename,
      path: file.path,
      text: content
    });

    return true;
  }

  function removePathFromSearchIndex(log: Logger, fileFullPath: string) {
    log.debug(`removePathFromSearchIndex(${fileFullPath})`);

    try {
      miniSearch.discard(fileFullPath);
    } catch (e) {
      log.debug(`removePathFromSearchIndex(...): ${(e || "").toString()}`);
    }
  }

  const iterator = new AsyncIterableQueue<IMiniSearchEvent>(() => { });
  (async () => {
    for await (const event of iterator) {
      switch (event.action) {
        case 'added':
          await addFileToSearchIndex(log, event.file!);
          break;
        case 'removed':
          removePathFromSearchIndex(log, event.path!);
          break;
      }
    }
  })();
  return iterator;
}

export interface IMiniSearchSync {
  kb: IKnowledgeBase;
  dispose(): void;
}

export async function createMiniSearchSync(log: Logger, queue: IEnqueue<IMiniSearchEvent>, kb: IKnowledgeBase): Promise<IMiniSearchSync> {
  const isMarkdownFile = (file: IFile) => file.type === 'markdown';

  for (const file of kb.files.filter(isMarkdownFile)) {
    queue.enqueue({ action: 'added', file });
  }

  kb.onFilesChanged((files) => {
    for (const file of (files?.removed || []).filter(isMarkdownFile)) {
      queue.enqueue({ action: 'removed', path : file.fullPath });
    }
    for (const file of (files?.added || []).filter(isMarkdownFile)) {
      queue.enqueue({ action: 'added', file });
    }
  });

  return {
    kb,
    dispose: () => {
      for (const file of kb.files.filter(isMarkdownFile)) {
        queue.enqueue({ action: 'removed', path : file.fullPath });
      }
    }
  };
}