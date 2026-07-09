import assert
  from 'node:assert';
import vscode
  from 'vscode';
import path
  from 'node:path'
import { loggers }
  from '../support/loggers';
import { TmpDir }
  from 'asljs-tmpdir';
import { AsyncIterableQueue }
  from '../AsyncIterableQueue';
import { KbEvent,
         KbAddedEvent }
  from '../KbEvents';
import { IndexFile, MiniSearchEvent}
  from '../MiniSearchEvents';
import { processKbEvents }
  from './processKbEvents';

suite(
  'processKbEvents Tests',
  () =>
  {
    vscode.window.showInformationMessage(
      'Start processKbEvents Tests');

    const logger =
      loggers().getNullLogger();

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
