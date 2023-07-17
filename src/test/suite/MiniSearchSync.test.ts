import vscode from 'vscode';
import MiniSearch from 'minisearch';
import { IKnowledgeBase, KnowledgeBase, IFile } from '../../KnowledgeBase';
import { createMiniSearchSync, createMiniSearchEventQueue } from '../../MiniSearchSync';
import { createLogger } from 'winston';
import { waitFor } from '../helpers';

suite('MiniSearchSync Tests', () => {
  vscode.window.showInformationMessage('Start MiniSearchSync Tests');

  const logger = createLogger({ silent: true });

  const createTestFile = (kb: IKnowledgeBase, path: string, content: string): IFile => {
    const folder = path.substring(0, path.lastIndexOf('/'));
    const name = path.substring(path.lastIndexOf('/') + 1);
    const basename = name.substring(0, name.lastIndexOf('.'));
    const extension = name.substring(name.lastIndexOf('.'));
    return {
      fullPath: kb.root + path.replace(/\//g, '\\'),
      folder: folder,
      path: path,
      basename: basename,
      extension: extension,
      type: extension.toUpperCase() === '.MD' ? 'markdown' : 'other',
      modified: new Date(),
      readText: () => Promise.resolve(content)
    };
  };

  test('syncs kb files with index', async () => {
    const miniSearch = new MiniSearch({
      fields: ['title', 'text'],
      storeFields: ['title', 'path']
    });

    const queue = createMiniSearchEventQueue(logger, miniSearch);

    const kb = new KnowledgeBase('c:\\projects\\kb');

    const sync = await createMiniSearchSync(logger, queue, kb);

    const file1 = createTestFile(kb, '/test.md', 'test');

    kb.addFiles([file1]);
    await waitFor(() => miniSearch.search('test').length === 1, 1000);

    kb.removeFiles([file1]);
    await waitFor(() => miniSearch.search('test').length === 0, 1000);

    kb.addFiles([file1]);
    await waitFor(() => miniSearch.search('test').length === 1, 1000);

    sync.dispose();
  });
});

