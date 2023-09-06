import assert from 'assert';
import fs from 'fs';
import path from 'path';
import vscode from 'vscode';
import { getTestTempDir } from '../support/testTempDirs';
import { replaceWorkspaceFolder } from '../support/workspaceHelpers';

suite('Extension Test Suite', () =>
{
  vscode.window.showInformationMessage('Start Extension Test Suite.');

  test(
    'should index markdown files, search, and navigate',
    async function ()
    {
      this.timeout(10000);

      const tmpDir = getTestTempDir();
      fs.writeFileSync(path.join(tmpDir, 'test.md'), '# Test\n\nThis is a test.');

      const workspaceFolder = await replaceWorkspaceFolder(tmpDir);

      const extension = vscode.extensions.getExtension('AlexandriteSoftware.markdown-search');

      if (!extension) {
        assert.fail('Extension not found');
      }

      if (!extension.isActive) {
        await extension.activate();
      }

      assert.ok(extension.isActive);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await vscode.commands.executeCommand('markdown-search.search') as any;
      const quickPick = result.quickPick as vscode.QuickPick<vscode.QuickPickItem>;
      quickPick.value = 'test';

      await new Promise(resolve => setTimeout(resolve, 500));

      assert.strictEqual(quickPick.items.length, 1);

      quickPick.dispose();

      if (workspaceFolder) {
        await replaceWorkspaceFolder(workspaceFolder);
      }
    });

  test(
    'should help create links',
    async function () {
      this.timeout(10000);

      const ws = vscode.workspace;

      const tmpDir = getTestTempDir();
      fs.writeFileSync(path.join(tmpDir, 'test.md'), '# Test\n\nThis is a test.');
      fs.writeFileSync(path.join(tmpDir, 'edit.md'), '');

      const workspaceFolder = await replaceWorkspaceFolder(tmpDir);

      const extension = vscode.extensions.getExtension('AlexandriteSoftware.markdown-search');

      if (!extension) {
        assert.fail('Extension not found');
      }

      if (!extension.isActive) {
        await extension.activate();
      }

      assert.ok(extension.isActive);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const fileUri = vscode.Uri.file(path.join(tmpDir, 'edit.md'));
      const document = await ws.openTextDocument(fileUri);
      const editor = await vscode.window.showTextDocument(document);
      editor.edit(editBuilder => { editBuilder.insert(new vscode.Position(0, 0), ''); });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await vscode.commands.executeCommand('markdown-search.add-or-replace-link') as any;
      const quickPick = result.quickPick as vscode.QuickPick<vscode.QuickPickItem>;
      quickPick.value = 'test';

      await new Promise(resolve => setTimeout(resolve, 1000));

      assert.strictEqual(quickPick.items.length, 1);

      quickPick.dispose();

      await document.save();
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

      if (workspaceFolder) {
        await replaceWorkspaceFolder(workspaceFolder);
      }
    });
});
