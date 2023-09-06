import assert from 'assert';
import vscode from 'vscode';
import fsp from 'fs/promises';
import { loggers } from '../support/loggers';
import { getTestTempDir } from '../support/testTempDirs';
import { AsyncIterableQueue } from '../../AsyncIterableQueue';
import { EditorEvent } from '../../EditorEvents';
import
{
  KbAddedEvent,
  KbEvent,
  KbFileAddedEvent
} from '../../KbEvents';
import { translateEditorEventsToKbEvents } from '../../translateEditorEventsToKbEvents';

suite('translateEditorEventsToKbEvents Tests', () =>
{
  vscode.window.showInformationMessage('Start translateEditorEventsToKbEvents Tests');

  const logger = loggers().getNullLogger();

  test(
    'should transform folder added event to kb added event',
    async function ()
    {
      const tmpFolder = getTestTempDir();

      const input = new AsyncIterableQueue<EditorEvent>();
      const output = new AsyncIterableQueue<KbEvent>();

      const dispose = translateEditorEventsToKbEvents(logger, input, output);

      input.enqueue({ event: 'folder-added', path: tmpFolder, exclude: {} });

      const result = (await output[Symbol.asyncIterator]().next()).value as KbAddedEvent;

      assert.strictEqual(result.event, 'kb-added');
      assert.strictEqual(result.root, tmpFolder);
      assert.deepStrictEqual(result.exclude, {});

      dispose();
    });

  test(
    'should transform file updated event to kb file added event',
    async function ()
    {
      const tmpFolder = getTestTempDir();

      const input = new AsyncIterableQueue<EditorEvent>();
      const output = new AsyncIterableQueue<KbEvent>();

      const dispose = translateEditorEventsToKbEvents(logger, input, output);

      input.enqueue({ event: 'folder-added', path: tmpFolder, exclude: {} });

      const kbAdded = (await output[Symbol.asyncIterator]().next()).value as KbAddedEvent;
      assert.strictEqual(kbAdded.event, 'kb-added');

      const file = `${tmpFolder}/test.md`;
      await fsp.writeFile(file, 'test');

      input.enqueue({ event: 'file-updated', path: file });

      const kbFileAdded = (await output[Symbol.asyncIterator]().next()).value as KbFileAddedEvent;

      assert.strictEqual(kbFileAdded.event, 'kb-file-added');
      assert.strictEqual(kbFileAdded.path, '/test.md');
      assert.strictEqual(kbFileAdded.root, tmpFolder);

      dispose();
    });
});
