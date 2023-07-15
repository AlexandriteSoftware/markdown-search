import * as assert from 'assert';
import * as vscode from 'vscode';
import { Exclusions, KnowledgeBase, kbFileFilter } from '../../extension';
import { createLogger, transports, Logger } from 'winston';

suite('kbFileFilter Test Suite', () => {
  vscode.window.showInformationMessage('Start kbFileFilter Test Suite.');

  const log = createLogger({ transports: [new transports.Console()] });

  test('kbFileFilter filters out files as expected', () => {
    const exclude: Exclusions = {};
    exclude["node_modules"] = true;

    const kb: KnowledgeBase = {
      root: '/projects/kb',
      exclude: exclude,
      files: []
    };

    assert.strictEqual(kbFileFilter(log, kb, '/test.md'), false);
    assert.strictEqual(kbFileFilter(log, kb, '/projects/kb/.git'), false);
    assert.strictEqual(kbFileFilter(log, kb, '/projects/kb/test.md'), true);
  });
});
