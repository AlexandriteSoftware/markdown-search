import assert from 'assert';
import vscode from 'vscode';
import { wsEvents } from '../../wsEvents';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start Extension Test Suite.');

  test('ok', () => {
    assert.ok(true);
  });

  test('should activate the extension', async () => {
    const extension = vscode.extensions.getExtension('AlexandriteSoftware.markdown-search');

    if (!extension) {
      assert.fail('Extension not found');
    }

    await extension.activate();

    assert.ok(extension.isActive);
  });

  test('should watch for vscode events', async () => {
    const events = wsEvents();

    setTimeout(() => { events.dispose(); }, 1000);

    const folders = [];
    for await (const event of events) {
      folders.push(event.folder);
    }

    assert.equal(folders.length, 0);
  });
});
