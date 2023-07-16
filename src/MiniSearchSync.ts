import MiniSearch from 'minisearch';
import { Logger } from 'winston';
import { IKnowledgeBase, IFile } from './KnowledgeBase';

export interface IMiniSearchSync {
  kb: IKnowledgeBase;

  /** Waits until the sync is not busy. */
  busy(): Promise<void>;

  dispose(): void;
}

const isMarkdownFile = (file : IFile) => file.type === 'markdown';

export async function createMiniSearchSync(log: Logger, miniSearch : MiniSearch, kb : IKnowledgeBase) : Promise<IMiniSearchSync> {
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
  
  async function replaceFileInSearchIndex(log: Logger, file: IFile) {
    log.debug(`replaceFileInSearchIndex(${file.fullPath})`);
  
    const content = await file.readText();
    if (content === null) {
      return false;
    }
  
    miniSearch.replace({
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

  const tasks : Promise<boolean>[] = [];
  let busy : Promise<void> | null = null;
  let done : (() => void) | null = null;

  const indexed = [];
  const failures = [];

  for (const file of kb.files.filter(isMarkdownFile)) {
    // if added successfully, continue
    if (await addFileToSearchIndex(log, file)) {
      indexed.push(file);
      continue;
    }

    failures.push(file);
  }

  log.info(`Indexed ${indexed.length} files in the knowledge base.`);

  kb.onFilesChanged((files) => {
    for (const file of (files?.removed || []).filter(isMarkdownFile)) {
      removePathFromSearchIndex(log, file.fullPath);
    }
    for (const file of (files?.added || []).filter(isMarkdownFile)) {
      const task = addFileToSearchIndex(log, file);

      if (tasks.length === 0) {
        busy = new Promise((resolve) => done = () => { resolve(); });
      }

      tasks.push(task);

      task.then(() => {
        tasks.splice(tasks.indexOf(task), 1);
        if (tasks.length === 0) {
          done?.();
          done = null;
          busy = null;
        }
      });
    }
  });

  return {
    kb,
    busy() : Promise<void> {
      return busy || Promise.resolve();
    },
    dispose : () => {
      for (const file of kb.files.filter(isMarkdownFile)) {
        removePathFromSearchIndex(log, file.fullPath);
      }
    }
  };
}