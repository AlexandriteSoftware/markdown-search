import vscode
  from 'vscode';
import MiniSearch
  from 'minisearch';
import { createLogger,
         format }
  from 'winston';
import Transport
  from 'winston-transport';
import { initialiseProcessor }
  from './processors/initialiseProcessor';
import { Action }
  from './Types';

const EXTENSION_ID = 'markdown-search';
const EXTENSION_NAME = 'Markdown Full Text Search';
const EXTENSION_VERSION = '0.2.6';

class OutputChannelTransport
  extends Transport
{
  outputChannel?: vscode.OutputChannel;

  updateOutputChannel(
      channel: vscode.OutputChannel
    ): void
  {
    this.outputChannel = channel;
  }

  log(
      info: any,
      callback: () => void
    ): void
  {
    this.outputChannel?.appendLine(
      info.message);

    callback();
  }
}

let outputChannelTransport =
  new OutputChannelTransport();

const loggerOptions =
  (() =>
  {
    const configuration =
      vscode.workspace.getConfiguration();

    const loggingLevel =
      configuration.get('markdown-search.logging.level') as string;

    if (loggingLevel === 'none') {
      return { silent: true };
    }

    let readLoggingLevel = 'info';
    switch (loggingLevel) {
      case 'emerg':
      case 'alert':
      case 'crit':
      case 'error':
      case 'warning':
      case 'notice':
      case 'info':
      case 'debug':
        readLoggingLevel = loggingLevel;
        break;
    }

    const options =
      { level: readLoggingLevel,
        format: format.splat(),
        transports: [ outputChannelTransport ] };

    return options;
  })();

const logger =
  createLogger(
    loggerOptions);

const miniSearch =
  new MiniSearch(
    { fields: [ 'title', 'text' ],
      storeFields: [ 'title', 'path' ] });

const disposables: Action[] = [];

/**
 * This method is called when the extension is activated.
 */
export function activate(
    context: vscode.ExtensionContext
  ): void
{
  if (
    outputChannelTransport !== null
    && !logger.silent)
  {
    const outputChannel =
      vscode.window.createOutputChannel(EXTENSION_NAME);

    if (logger.isLevelEnabled('debug')) {
      outputChannel.show();
    }

    outputChannelTransport.updateOutputChannel(outputChannel);
  }

  logger.info(
    '%s (%s) %s is now active.',
    EXTENSION_NAME,
    EXTENSION_ID,
    EXTENSION_VERSION);

  function createSearchQuickPick(
    ): vscode.QuickPick<vscode.QuickPickItem>
  {
    const quickPick =
      vscode.window.createQuickPick();

    quickPick.onDidChangeValue(
      value =>
      {
        const results =
          miniSearch.search(
            value,
            { fuzzy: 0.2,
              boost:
                { title: 2 } });

        quickPick.items =
          results.map(
            item =>
            {
              const description =
                'matches ' + item.terms.map(item => `'${item}'`).join(', ');

              const result: vscode.QuickPickItem =
                { alwaysShow: true,
                  label: item.path,
                  detail: item.id,
                  description };

              return result;
            });
      });

    try {
      const editor =
        vscode.window.activeTextEditor;

      if (editor) {
        const selections =
          editor.selections;

        if (selections.length > 0) {
          const selection =
            selections.at(0);

          const text =
            editor.document.getText(selection);

          if (text !== '') {
            quickPick.value =
              text.replace(/[\r\n]+/g, ' ');
          }
        }
      }
    } catch (e) {
      logger.warn(
        'Failed to get the active text editor. %s',
        (e || '').toString());
    }

    return quickPick;
  }

  // searches for the criteria in the index, opens the file on accept
  const searchCommandRegistration =
    vscode.commands.registerCommand(
      'markdown-search.search',
      () =>
      {
        const quickPick =
          createSearchQuickPick();

        quickPick.onDidAccept(
          async () =>
          {
            const item =
              quickPick.selectedItems[0];

            if (item === undefined) {
              return;
            }

            const document =
              await vscode.workspace.openTextDocument(
                item.detail as any);

            await vscode.window.showTextDocument(document);

            quickPick.dispose();
          });

        quickPick.show();

        return { quickPick };
      });

  context.subscriptions.push(
    searchCommandRegistration);

  // searches for the criteria in the index, inserts a link on accept
  const addOrReplaceLinkCommandRegistration =
    vscode.commands.registerCommand(
      'markdown-search.add-or-replace-link',
      () =>
      {
        const quickPick =
          createSearchQuickPick();

        quickPick.onDidAccept(
          async () =>
          {
            const item =
              quickPick.selectedItems[0];

            if (item === undefined) {
              return;
            }

            const editor =
              vscode.window.activeTextEditor;

            if (editor) {
              editor.edit(
                editBuilder =>
                {
                  const link =
                    item.label.replace(/\.md$/i, '');

                  const text =
                    editor.document.getText(editor.selection);

                  if (text === '') {
                    const title =
                      link.replace(/^.*\//, '');

                    editBuilder.insert(
                      editor.selection.active,
                      `[${title}](<${link}>)`);
                  } else {
                    editBuilder.replace(
                      editor.selection,
                      `[${text}](<${link}>)`);
                  }
                });
            }

            quickPick.dispose();
          });

        quickPick.show();

        return { quickPick };
      });

  context.subscriptions.push(addOrReplaceLinkCommandRegistration);

  const disposeProcessor =
    initialiseProcessor(
      logger,
      miniSearch);
  
  disposables.push(disposeProcessor);
}

export function deactivate()
{
  for (const disposable of disposables) {
    disposable();
  }
}
