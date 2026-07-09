import assert
  from 'node:assert';
import * as vscode
  from 'vscode';
import path
  from 'node:path';
import { getNullLogger }
  from '../support/loggers.js';
import { TmpDir }
  from 'asljs-tmpdir';
import { AsyncIterableQueue }
  from '../AsyncIterableQueue.js';
import { KbEvent,
         KbAddedEvent }
  from '../KbEvents.js';
import { IndexFile,
         MiniSearchEvent }
  from '../MiniSearchEvents.js';
import { processKbEvents }
  from './processKbEvents.js';

suite(
  'processKbEvents Tests',
  () =>
  {
    vscode.window.showInformationMessage(
      'Start processKbEvents Tests');

    const logger =
      getNullLogger();

    test(
      'should transform kb added event to minisearch index file event',
      async function ()
      {
        this.timeout(10000);

        await using tmpDir = new TmpDir();

        await tmpDir.writeText('test.md', 'test');

        const input = new AsyncIterableQueue<KbEvent>();
        const output = new AsyncIterableQueue<MiniSearchEvent>();

        const dispose = processKbEvents(logger, input, output);

        input.enqueue<KbAddedEvent>(
          { event: 'kb-added',
            root: tmpDir.path,
            files: [ path.join(tmpDir.path, 'test.md') ],
            exclude: { } });

        const result =
          (await output[Symbol.asyncIterator]().next()).value as IndexFile;

        assert.strictEqual(result.event, 'index');
        assert.strictEqual(result.path, path.join(tmpDir.path, 'test.md'));
        assert.strictEqual(result.root, tmpDir.path);

        dispose();
      });
  });
