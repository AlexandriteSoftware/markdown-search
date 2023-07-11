import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start Extension Test Suite.');

  test('ok', () => {
    assert.ok(true);
  });
});
