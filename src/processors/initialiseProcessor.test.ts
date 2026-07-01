import vscode
  from 'vscode';
import { loggers }
  from '../support/loggers';
import { initialiseProcessor }
  from './initialiseProcessor';
import MiniSearch
  from 'minisearch';

suite(
  'initialiseProcessor Tests',
  () =>
  {
    vscode.window.showInformationMessage(
      'Start initialiseProcessor Tests');

    const logger =
      loggers().getNullLogger();

    test(
      'should initialise the processor',
      async function ()
      {
        this.timeout(10000);

        const miniSearch =
          new MiniSearch(
            { fields: ['title', 'text'],
              storeFields: ['title', 'path'] });

        const dispose = initialiseProcessor(logger, miniSearch);

        dispose();
      });
  });
