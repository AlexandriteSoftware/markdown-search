import assert
  from 'node:assert';
import path
  from 'node:path';
import vscode
  from 'vscode';
import MiniSearch
  from 'minisearch';
import { MiniSearchEvent }
  from '../MiniSearchEvents';
import { loggers }
  from '../support/loggers';
import { processMiniSearchEvents }
  from './processMiniSearchEvents';
import { AsyncIterableQueue }
  from '../AsyncIterableQueue';
import { TmpDir }
  from 'asljs-tmpdir';

suite(
  'processMiniSearchEvents Tests',
  () =>
  {
    vscode.window.showInformationMessage(
      'Start processMiniSearchEvents Tests');

    const logger =
      loggers().getNullLogger();

    test(
      'adds and removes files from the index',
      async () =>
      {
        const index = miniSearch();
        const queue = new AsyncIterableQueue<MiniSearchEvent>();
        processMiniSearchEvents(logger, queue, index);

        await using tmpDir = new TmpDir();

        await tmpDir.writeText('test.md', 'test');

        // add the file to the index
        queue.enqueue({ event: 'index', path: '/test.md', root: tmpDir.path });
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.strictEqual(index.search('test').length, 1);

        // remove the file from the index
        queue.enqueue({ event: 'remove', path: '/test.md', root: tmpDir.path });
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.strictEqual(index.search('test').length, 0);

        // add it second time
        queue.enqueue({ event: 'index', path: '/test.md', root: tmpDir.path });
        await new Promise(resolve => setTimeout(resolve, 100));
        assert.strictEqual(index.search('test').length, 1);

        assert.ok(true);
      });

    test(
      'adds and removes multiple files from the index',
      async () => {
        const index = miniSearch();
        const queue = new AsyncIterableQueue<MiniSearchEvent>();
        processMiniSearchEvents(logger, queue, index);

        await using tmpDir =
          new TmpDir();

        await tmpDir.writeText('test1.md', 'test - ok');
        await tmpDir.writeText('test2.md', 'asdf - ok');

        // add the file to the index
        queue.enqueue({ event: 'index', path: '/test1.md', root: tmpDir.path });
        queue.enqueue({ event: 'index', path: '/test2.md', root: tmpDir.path });
        await new Promise(resolve => setTimeout(resolve, 100));

        assert.strictEqual(index.search('test').length, 1);
        assert.strictEqual(index.search('asdf').length, 1);
        assert.strictEqual(index.search('ok').length, 2);

        // remove the file from the index
        queue.enqueue({ event: 'remove', path: '/test1.md', root: tmpDir.path });
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
        const queue = new AsyncIterableQueue<MiniSearchEvent>();
        processMiniSearchEvents(logger, queue, index);

        await using tmpDir = new TmpDir();

        // remove the file from the index
        queue.enqueue({ event: 'remove', path: path.join(tmpDir.path, 'test1.md'), root: tmpDir.path });
        await new Promise(resolve => setTimeout(resolve, 100));

        assert.ok(true);
      });

    test(
      'adds files to the index multiple times',
      async () => {
        const index = miniSearch();
        const queue = new AsyncIterableQueue<MiniSearchEvent>();
        processMiniSearchEvents(logger, queue, index);

        await using tmpDir =
          new TmpDir();
        
        await tmpDir.writeText('test1.md', 'test - ok');
        await tmpDir.writeText('test2.md', 'asdf - ok');

        // add the file to the index
        queue.enqueue({ event: 'index', path: '/test1.md', root: tmpDir.path });
        queue.enqueue({ event: 'index', path: '/test2.md', root: tmpDir.path });
        await new Promise(resolve => setTimeout(resolve, 100));

        assert.strictEqual(index.search('test').length, 1);
        assert.strictEqual(index.search('asdf').length, 1);
        assert.strictEqual(index.search('ok').length, 2);

        // add the file to the index again
        queue.enqueue({ event: 'index', path: '/test1.md', root: tmpDir });
        queue.enqueue({ event: 'index', path: '/test2.md', root: tmpDir });
        await new Promise(resolve => setTimeout(resolve, 100));

        assert.strictEqual(index.search('test').length, 1);
        assert.strictEqual(index.search('asdf').length, 1);
        assert.strictEqual(index.search('ok').length, 2);

        assert.ok(true);
      });
    
    function miniSearch(
      ): MiniSearch<any>
    {
      return new MiniSearch(
        { fields: ['title', 'text'],
          storeFields: ['title', 'path'] });
    }
  });

