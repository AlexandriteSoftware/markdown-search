import assert
  from 'node:assert';
import vscode
  from 'vscode';
import path
  from 'node:path'
import fsp
  from 'node:fs/promises';
import { loggers }
  from '../support/loggers';
import { getTestTempDir }
  from '../support/testTempDirs';
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

        const tmpFolder = getTestTempDir();

        await fsp.writeFile(path.join(tmpFolder, 'test.md'), 'test');

        const input = new AsyncIterableQueue<KbEvent>();
        const output = new AsyncIterableQueue<MiniSearchEvent>();

        const dispose = processKbEvents(logger, input, output);

        input.enqueue<KbAddedEvent>(
          { event: 'kb-added',
            root: tmpFolder,
            files: [ '/test.md' ],
            exclude: { } });

        const result =
          (await output[Symbol.asyncIterator]().next()).value as IndexFile;

        assert.strictEqual(result.event, 'index');
        assert.strictEqual(result.path, '/test.md');
        assert.strictEqual(result.root, tmpFolder);

        dispose();
      });
  });
