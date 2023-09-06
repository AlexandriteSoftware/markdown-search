import assert from 'assert';
import path from 'path';
import vscode from 'vscode';
import os from 'os';
import fs from 'fs/promises';
import { KnowledgeBase } from '../../KnowledgeBase';
import { createLogger } from 'winston';
import { createKbFilesystemEventsIterator } from '../../KbFilesystemSync';
import
{
  waitFor,
  retry
} from '../support/controlFlowHelpers';

suite('KbFilesystemSync Tests', () =>
{
  vscode.window.showInformationMessage('Start KbFilesystemSync Tests');

  const logger = createLogger({ silent: true });
  test('syncs kb files with filesystem', async function ()
  {
    this.timeout(5000);

    const tmpPathBase = path.join(os.tmpdir(), 'test-');
    const tmpFolder = await fs.mkdtemp(tmpPathBase);

    const kb = new KnowledgeBase(tmpFolder);
    const sync = await createKbFilesystemEventsIterator(logger, kb);
    try {
      // adding file
      await fs.writeFile(path.join(tmpFolder, 'test.md'), 'test', { encoding: 'utf8' });
      await waitFor(() => kb.files.find(item => item.path === '/test.md') !== undefined, 1000);

      // deleting file
      await fs.unlink(path.join(tmpFolder, 'test.md'));
      await waitFor(() => kb.files.length === 0, 1000);

      // moving folder
      await fs.mkdir(path.join(tmpFolder, 'sf'));
      await fs.writeFile(path.join(tmpFolder, 'sf\\test.md'), 'test', { encoding: 'utf8' });
      await waitFor(() => kb.files.find(item => item.path === '/sf/test.md') !== undefined, 1000);
      await fs.rename(path.join(tmpFolder, 'sf'), path.join(tmpFolder, 'sf2'));
      await waitFor(() => kb.files.find(item => item.path === '/sf2/test.md') !== undefined, 1000);

      assert.ok(true);
    } finally {
      sync.dispose();
      await retry(() => fs.rm(tmpFolder, { recursive: true, force: true }));
    }
  });
});

