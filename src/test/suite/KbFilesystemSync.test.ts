import assert from 'assert';
import path from 'path';
import vscode from 'vscode';
import os from 'os';
import fs from 'fs/promises';
import { KnowledgeBase } from '../../KnowledgeBase';
import { createLogger, transports } from 'winston';
import { createKbFilesystemSync } from '../../KbFilesystemSync';

suite('KbFilesystemSync Tests', () => {
  vscode.window.showInformationMessage('Start KbFilesystemSync Tests');

  const logger = createLogger({ silent: true });

  const waitFor: (predicate: () => boolean, timeout: number) => Promise<void> =
    (predicate, timeout) => {
      const start = Date.now();
      return new Promise((resolve, reject) => {
        let interval: NodeJS.Timer | null = null;
        interval = setInterval(() => {
          if (Date.now() - start > timeout) {
            if (interval !== null) {
              clearInterval(interval);
            }
            reject(new Error('Timeout'));
            return;
          }

          if (predicate()) {
            if (interval !== null) {
              clearInterval(interval);
            }
            resolve();
          }
        }, 20);
      });
    };

  test('syncs kb files with filesystem', async () => {
    const tmpPathBase = path.join(os.tmpdir(), 'test-');
    const tmpFolder = await fs.mkdtemp(tmpPathBase);

    const kb = new KnowledgeBase(tmpFolder);
    const sync = await createKbFilesystemSync(logger, kb);
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
      await fs.rm(tmpFolder, { recursive: true });
    }
  });
});

