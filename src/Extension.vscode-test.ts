import assert
  from 'node:assert';
import path
  from 'node:path';
import { setTimeout }
  from 'node:timers/promises';
import { TmpDir }
  from 'asljs-tmpdir';
import vscode
  from 'vscode';
import { replaceWorkspaceFolder }
  from './support/workspaceHelpers';

suite(
  'Extension Test Suite',
  () =>
  {
    vscode.window.showInformationMessage(
      'Start Extension Test Suite.');

    test(
      'should index markdown files, search, and navigate',
      async function ()
      {
        this.timeout(10000);

        await using tmpDir =
          new TmpDir();

        await tmpDir.writeText(
          'test.md',
          '# Test\n\nThis is a test.');

        const workspaceFolder =
          await replaceWorkspaceFolder(tmpDir.path);

        const extension =
          vscode.extensions.getExtension(
            'AlexandriteSoftware.markdown-search');

        if (!extension) {
          assert.fail(
            'Extension not found');
        }

        if (!extension.isActive) {
          await extension.activate();
        }

        assert.ok(
          extension.isActive);

        await setTimeout(1000);

        console.log(await vscode.commands.getCommands(true));

        const result =
          await vscode.commands.executeCommand('markdown-search.search') as any;

        const quickPick =
          result.quickPick as vscode.QuickPick<vscode.QuickPickItem>;

        quickPick.value = 'test';

        await setTimeout(500);

        await vscode.commands.executeCommand(
          'workbench.action.acceptSelectedQuickOpenItem');

        await setTimeout(500);

        assert.strictEqual(
          quickPick.items.length,
          1);

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

        await using tmpDir = new TmpDir();

        await tmpDir.writeText(
          'test.md',
          '# Test\n\nThis is a test.');

        await tmpDir.writeText(
          'edit.md',
          '');

        const workspaceFolder =
          await replaceWorkspaceFolder(tmpDir.path);

        const extension =
          vscode.extensions.getExtension(
            'AlexandriteSoftware.markdown-search');

        if (!extension) {
          assert.fail('Extension not found');
        }

        if (!extension.isActive) {
          await extension.activate();
        }

        assert.ok(extension.isActive);

        await setTimeout(2000);

        const fileUri = vscode.Uri.file(path.join(tmpDir.path, 'edit.md'));
        const document = await ws.openTextDocument(fileUri);
        const editor = await vscode.window.showTextDocument(document);
        editor.edit(editBuilder => { editBuilder.insert(new vscode.Position(0, 0), ''); });

        await setTimeout(1000);

        const result =
          await vscode.commands.executeCommand(
            'markdown-search.add-or-replace-link') as any;

        const quickPick =
          result.quickPick as vscode.QuickPick<vscode.QuickPickItem>;

        quickPick.value = 'test';

        await setTimeout(500);

        await vscode.commands.executeCommand(
          'workbench.action.acceptSelectedQuickOpenItem');

        await setTimeout(1000);

        const text = editor.document.getText();

        quickPick.dispose();

        await document.save();

        await vscode.commands.executeCommand(
          'workbench.action.closeActiveEditor');

        if (workspaceFolder) {
          await replaceWorkspaceFolder(workspaceFolder);
        }

        assert.strictEqual(
          text,
          '[test](</test>)');
      });
  });
