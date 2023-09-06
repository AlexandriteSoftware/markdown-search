import assert from 'assert';
import vscode from 'vscode';
import path from 'path';
import { AsyncIterableQueue } from '../../AsyncIterableQueue';
import
{
  EditorEvent,
  isFolderAddedEvent,
  isFileUpdatedEvent
} from '../../EditorEvents';
import { translateWorkspaceToEditorEvents } from '../../translateWorkspaceToEditorEvents';
import { getTestTempDir } from '../support/testTempDirs';
import { replaceWorkspaceFolder } from '../support/workspaceHelpers';
import { loggers } from '../support/loggers';

suite('translateWorkspaceToEditorEvents Tests', () =>
{
  vscode.window.showInformationMessage('Start translateWorkspaceToEditorEvents Tests');

  const logger = loggers().getNullLogger();

  test(
    'should notify about the folder added event and the file updated events',
    async function ()
    {
      this.timeout(10000);

      const ws = vscode.workspace;

      logger.info('create a temporary folder for test workspace files');
      const tmpFolder = getTestTempDir();

      logger.info('add a file to the temp workspace');
      const fileUri = vscode.Uri.file(path.join(tmpFolder, 'test.txt'));
      await ws.fs.writeFile(fileUri, Buffer.from('test'));

      const queue = new AsyncIterableQueue<EditorEvent>();

      logger.info('create iterator');
      const dispose = translateWorkspaceToEditorEvents(logger, queue);

      logger.info('and start iterating');
      const iterator = queue[Symbol.asyncIterator]();

      logger.info('set the current workspace to the temp folder (remove all other folders)');
      const folder = await replaceWorkspaceFolder(tmpFolder);

      await new Promise(resolve => setTimeout(resolve, 500));

      logger.info('the above should generate the `folder-added` event');
      while (true) {
        const event = (await iterator.next()).value;
        logger.info(`Expecting FolderAddedEvent, received: ${JSON.stringify(event)}`);
        if (isFolderAddedEvent(event)) {
          logger.info(`Received FolderAddedEvent`);
          break;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      logger.info('open the file, edit, and save it');
      const document = await ws.openTextDocument(fileUri);
      const editor = await vscode.window.showTextDocument(document);
      editor.edit(editBuilder => { editBuilder.insert(new vscode.Position(0, 0), 'test'); });
      await document.save();
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

      await new Promise(resolve => setTimeout(resolve, 500));

      logger.info('it should generate the `file-updated` event');
      while (true) {
        const event = (await iterator.next()).value;
        logger.info(`Expecting FileUpdatedEvent, received: ${JSON.stringify(event)}`);
        if (isFileUpdatedEvent(event)) {
          logger.info(`Received FileUpdatedEvent`);
          break;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      logger.info('unsubscribe from vscode events');
      dispose();

      if (folder) {
        logger.info('revert back to the original folder.');
        await replaceWorkspaceFolder(folder);
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      assert.ok(true);
    });
});
