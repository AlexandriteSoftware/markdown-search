import assert from 'assert';
import vscode from 'vscode';
import
{
  Exclusions,
  KnowledgeBase,
  File
} from '../../KnowledgeBase';

suite('KnowledgeBase Tests', () =>
{
  vscode.window.showInformationMessage('Start KnowledgeBase Tests');

  test('filesWithFilesystemPath returns files as expected', () =>
  {
    const exclude: Exclusions = {};
    exclude["node_modules"] = true;

    const kb = new KnowledgeBase('/projects/kb', exclude);
    kb.files.push(new File('/projects/kb/test.md', '/test.md', new Date()));
    kb.files.push(new File('/projects/kb/test1/asdf.md', '/test1/asdf.md', new Date()));
    kb.files.push(new File('/projects/kb/test1/asdf2.md', '/test1/asdf2.md', new Date()));

    // file
    assert.strictEqual(
      kb.filesWithFilesystemPath('/projects/kb/test.md').map(item => item.path).join(','),
      '/test.md');

    // root
    assert.strictEqual(
      kb.filesWithFilesystemPath('/projects/kb').map(item => item.path).join(','),
      '/test.md,/test1/asdf.md,/test1/asdf2.md');

    // subfolder
    assert.strictEqual(
      kb.filesWithFilesystemPath('/projects/kb/test1').map(item => item.path).join(','),
      '/test1/asdf.md,/test1/asdf2.md');

    // file in subfolder
    assert.strictEqual(
      kb.filesWithFilesystemPath('/projects/kb/test1/asdf2.md').map(item => item.path).join(','),
      '/test1/asdf2.md');

    // same as before, but with trailing slash
    assert.strictEqual(
      kb.filesWithFilesystemPath('/projects/kb/test1/').map(item => item.path).join(','),
      '/test1/asdf.md,/test1/asdf2.md');
  });

  test('isAccepted filters out files as expected', () =>
  {
    const exclude: Exclusions = {};
    exclude["node_modules/**"] = true;

    const kb = new KnowledgeBase('/projects/kb', exclude);

    assert.strictEqual(kb.isAccepted('/test.md'), false);
    assert.strictEqual(kb.isAccepted('/projects/kb/.git'), false);
    assert.strictEqual(kb.isAccepted('/projects/kb/test.md'), true);
    assert.strictEqual(kb.isAccepted('/projects/kb/node_modules/test.md'), false);
  });
});
