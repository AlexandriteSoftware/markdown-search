import assert from 'assert';
import fs from 'fs';
import path from 'path';
import vscode from 'vscode';
import MiniSearch from 'minisearch';
import { MiniSearchCommand } from '../../MiniSearchCommands';
import { loggers } from '../support/loggers';
import { processMiniSearchCommands } from '../../processMiniSearchCommands';
import { AsyncIterableQueue } from '../../AsyncIterableQueue';
import { getTestTempDir } from '../support/testTempDirs';

suite('processMiniSearchCommands Tests', () =>
{
  vscode.window.showInformationMessage('Start processMiniSearchCommands Tests');

  const logger = loggers().getNullLogger();

  test(
    'adds and removes files from the index',
    async () =>
    {
      const index = miniSearch();
      const queue = new AsyncIterableQueue<MiniSearchCommand>();
      processMiniSearchCommands(logger, queue, index);

      const tmpDir = getTestTempDir();
      fs.writeFileSync(path.join(tmpDir, 'test.md'), 'test');

      // add the file to the index
      queue.enqueue({ action: 'index', path: '/test.md', root: tmpDir });
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.strictEqual(index.search('test').length, 1);

      // remove the file from the index
      queue.enqueue({ action: 'remove', path: '/test.md', root: tmpDir });
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.strictEqual(index.search('test').length, 0);

      // add it second time
      queue.enqueue({ action: 'index', path: '/test.md', root: tmpDir });
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.strictEqual(index.search('test').length, 1);

      assert.ok(true);
    });

  test(
    'adds and removes multiple files from the index',
    async () => {
      const index = miniSearch();
      const queue = new AsyncIterableQueue<MiniSearchCommand>();
      processMiniSearchCommands(logger, queue, index);

      const tmpDir = getTestTempDir();
      fs.writeFileSync(path.join(tmpDir, 'test1.md'), 'test - ok');
      fs.writeFileSync(path.join(tmpDir, 'test2.md'), 'asdf - ok');

      // add the file to the index
      queue.enqueue({ action: 'index', path: '/test1.md', root: tmpDir });
      queue.enqueue({ action: 'index', path: '/test2.md', root: tmpDir });
      await new Promise(resolve => setTimeout(resolve, 100));

      assert.strictEqual(index.search('test').length, 1);
      assert.strictEqual(index.search('asdf').length, 1);
      assert.strictEqual(index.search('ok').length, 2);

      // remove the file from the index
      queue.enqueue({ action: 'remove', path: '/test1.md', root: tmpDir });
      await new Promise(resolve => setTimeout(resolve, 100));

      assert.strictEqual(index.search('test').length, 0);
      assert.strictEqual(index.search('asdf').length, 1);
      assert.strictEqual(index.search('ok').length, 1);

      assert.ok(true);
    });

  test(
    'removes file that is not in the index',
    async () => {
      const index = miniSearch();
      const queue = new AsyncIterableQueue<MiniSearchCommand>();
      processMiniSearchCommands(logger, queue, index);

      const tmpDir = getTestTempDir();

      // remove the file from the index
      queue.enqueue({ action: 'remove', path: '/test1.md', root: tmpDir });
      await new Promise(resolve => setTimeout(resolve, 100));

      assert.ok(true);
    });

  test(
    'adds files to the index multiple times',
    async () => {
      const index = miniSearch();
      const queue = new AsyncIterableQueue<MiniSearchCommand>();
      processMiniSearchCommands(logger, queue, index);

      const tmpDir = getTestTempDir();
      fs.writeFileSync(path.join(tmpDir, 'test1.md'), 'test - ok');
      fs.writeFileSync(path.join(tmpDir, 'test2.md'), 'asdf - ok');

      // add the file to the index
      queue.enqueue({ action: 'index', path: '/test1.md', root: tmpDir });
      queue.enqueue({ action: 'index', path: '/test2.md', root: tmpDir });
      await new Promise(resolve => setTimeout(resolve, 100));

      assert.strictEqual(index.search('test').length, 1);
      assert.strictEqual(index.search('asdf').length, 1);
      assert.strictEqual(index.search('ok').length, 2);

      // add the file to the index again
      queue.enqueue({ action: 'index', path: '/test1.md', root: tmpDir });
      queue.enqueue({ action: 'index', path: '/test2.md', root: tmpDir });
      await new Promise(resolve => setTimeout(resolve, 100));

      assert.strictEqual(index.search('test').length, 1);
      assert.strictEqual(index.search('asdf').length, 1);
      assert.strictEqual(index.search('ok').length, 2);

      assert.ok(true);
    });
  
  function miniSearch()
  {
    return new MiniSearch({
      fields: ['title', 'text'],
      storeFields: ['title', 'path']
    });
  }
});

