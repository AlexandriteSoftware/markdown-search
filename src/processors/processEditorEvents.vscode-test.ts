import assert
  from 'assert';
import vscode
  from 'vscode';
import fsp
  from 'fs/promises';
import path
  from 'node:path';
import { loggers }
  from '../support/loggers';
import { TmpDir }
  from 'asljs-tmpdir';
import { AsyncIterableQueue }
  from '../AsyncIterableQueue';
import { EditorEvent }
  from '../EditorEvents';
import { KbAddedEvent,
         KbEvent,
         KbFileAddedEvent }
  from '../KbEvents';
import { processEditorEvents }
  from './processEditorEvents';

suite(
  'processEditorEvents Tests',
  () =>
  {
    vscode.window.showInformationMessage(
      'Start processEditorEvents Tests');

    const logger =
      loggers().getNullLogger();

    test(
      'should transform folder added event to kb added event',
      async function ()
      {
        await using tmpDir = new TmpDir();

        const input = new AsyncIterableQueue<EditorEvent>();
        const output = new AsyncIterableQueue<KbEvent>();

        const dispose = processEditorEvents(logger, input, output);

        input.enqueue({ event: 'folder-added', path: tmpDir.path, exclude: {} });

        const result =
          (await output[Symbol.asyncIterator]().next()).value as KbAddedEvent;

        assert.strictEqual(result.event, 'kb-added');
        assert.strictEqual(result.root, tmpDir.path);
        assert.deepStrictEqual(result.exclude, {});

        dispose();
      });

    test(
      'should transform file updated event to kb file added event',
      async function ()
      {
        await using tmpDir = new TmpDir();

        const input = new AsyncIterableQueue<EditorEvent>();
        const output = new AsyncIterableQueue<KbEvent>();

        const dispose = processEditorEvents(logger, input, output);

        input.enqueue({ event: 'folder-added', path: tmpDir.path, exclude: {} });

        const kbAdded =
          (await output[Symbol.asyncIterator]().next()).value as KbAddedEvent;
        assert.strictEqual(kbAdded.event, 'kb-added');

        const file = path.join(tmpDir.path, 'test.md');
        await fsp.writeFile(file, 'test');

        input.enqueue({ event: 'file-updated', path: file });

        const kbFileAdded =
          (await output[Symbol.asyncIterator]().next()).value as KbFileAddedEvent;

        assert.strictEqual(kbFileAdded.event, 'kb-file-added');
        assert.strictEqual(kbFileAdded.path, '/test.md');
        assert.strictEqual(kbFileAdded.root, tmpDir.path);

        dispose();
      });
  });
