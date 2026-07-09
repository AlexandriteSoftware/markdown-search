import * as vscode
  from 'vscode';
import { getNullLogger }
  from '../support/loggers.js';
import { initialiseProcessor }
  from './initialiseProcessor.js';
import MiniSearch
  from 'minisearch';

suite(
  'initialiseProcessor Tests',
  () =>
  {
    vscode.window.showInformationMessage(
      'Start initialiseProcessor Tests');

    const logger =
      getNullLogger();

    test(
      'should initialise the processor',
      async function ()
      {
        this.timeout(10000);

        const miniSearch =
          new MiniSearch(
            { fields: ['title', 'text'],
              storeFields: ['title', 'path'] });

        const dispose =
          initialiseProcessor(
            logger,
            miniSearch);

        dispose();
      });
  });
