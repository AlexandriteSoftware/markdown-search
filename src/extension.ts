import vscode from 'vscode';
import MiniSearch from 'minisearch';
import
{
  createLogger,
  format
} from 'winston';
import Transport from 'winston-transport';
import { AsyncIterableQueue } from './AsyncIterableQueue';
import { EditorEvent } from './EditorEvents';
import { translateWorkspaceToEditorEvents } from './translateWorkspaceToEditorEvents';
import { MiniSearchCommand } from './MiniSearchCommands';
import { processMiniSearchCommands } from './processMiniSearchCommands';
import { translateKbEventsToMiniSearchCommands } from './translateKbEventsToMiniSearchCommands';
import { KbEvent } from './KbEvents';
import { translateEditorEventsToKbEvents } from './translateEditorEventsToKbEvents';

const EXTENSION_ID = 'markdown-search';
const EXTENSION_NAME = 'Markdown Full Text Search';

class OutputChannelTransport
  extends Transport
{
  outputChannel: vscode.OutputChannel | null = null;

  updateOutputChannel
    (channel: vscode.OutputChannel)
  {
    this.outputChannel = channel;
  }

  log
    (info: any,
      callback: () => void)
  {
    if (this.outputChannel !== null) {
      this.outputChannel.appendLine(info.message);
    }
    callback();
  }
}

let outputChannelTransport: OutputChannelTransport | null = null;

const loggerOptions = (() =>
{
  const configuration = vscode.workspace.getConfiguration();

  const loggingLevel = configuration.get('markdown-search.logging.level') as string;
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

  outputChannelTransport = new OutputChannelTransport();

  return {
    level: readLoggingLevel,
    format: format.simple(),
    transports: [outputChannelTransport]
  };
})();

const logger = createLogger(loggerOptions);

const miniSearch = new MiniSearch({
  fields: ['title', 'text'],
  storeFields: ['title', 'path']
});

const disposables: (() => void)[] = [];

function startQueues
  (miniSearch: MiniSearch)
{
  const editorEventsQueue = new AsyncIterableQueue<EditorEvent>();
  const kbEventsQueue = new AsyncIterableQueue<KbEvent>();
  const miniSearchQueue = new AsyncIterableQueue<MiniSearchCommand>();

  disposables.push(() =>
  {
    editorEventsQueue.dispose();
    kbEventsQueue.dispose();
    miniSearchQueue.dispose();
  });

  disposables.push(translateWorkspaceToEditorEvents(logger, editorEventsQueue));
  disposables.push(translateEditorEventsToKbEvents(logger, editorEventsQueue, kbEventsQueue));
  disposables.push(translateKbEventsToMiniSearchCommands(logger, kbEventsQueue, miniSearchQueue));
  disposables.push(processMiniSearchCommands(logger, miniSearchQueue, miniSearch));
}

function stopQueues()
{
  for (const disposable of disposables) {
    disposable();
  }
}

// This method is called when the extension is activated
export function activate
  (context: vscode.ExtensionContext)
{
  if (outputChannelTransport !== null) {
    // create and show the output channel
    const outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);
    outputChannel.show();
    outputChannelTransport.updateOutputChannel(outputChannel);
  }

  logger.info(`The extension "${EXTENSION_NAME}" (${EXTENSION_ID}) is now active.`);

  function createSearchQuickPick()
  {
    const quickPick = vscode.window.createQuickPick();

    quickPick.onDidChangeValue(value =>
    {
      const results =
        miniSearch.search(
          value,
          { fuzzy: 0.2, boost: { title: 2 } });

      quickPick.items = results.map(item =>
      {
        return {
          alwaysShow: true,
          label: item.path,
          description: 'matches ' + item.terms.map(item => `'${item}'`).join(', '),
          detail: item.id
        };
      });
    });

    try {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selections = editor.selections;
        if (selections.length > 0) {
          const selection = selections.at(0);
          const text = editor.document.getText(selection);
          if (text !== '') {
            quickPick.value = text.replace(/[\r\n]+/g, ' ');
          }
        }
      }
    } catch (e) {
      logger.warn('Failed to get the active text editor. ' + (e || '').toString());
    }

    return quickPick;
  }

  // searches for the criteria in the index, opens the file on accept
  const searchCommandRegistration =
    vscode.commands.registerCommand(
      'markdown-search.search',
      () =>
      {
        const quickPick = createSearchQuickPick();

        quickPick.onDidAccept(async () =>
        {
          const item = quickPick.selectedItems[0];
          if (item === undefined) {
            return;
          }

          const document = await vscode.workspace.openTextDocument(item.detail as any);
          await vscode.window.showTextDocument(document);

          quickPick.dispose();
        });

        quickPick.show();

        return { quickPick };
      });

  context.subscriptions.push(searchCommandRegistration);

  // searches for the criteria in the index, inserts a link on accept
  const addOrReplaceLinkCommandRegistration =
    vscode.commands.registerCommand(
      'markdown-search.add-or-replace-link',
      () =>
      {
        const quickPick = createSearchQuickPick();

        quickPick.onDidAccept(async () =>
        {
          const item = quickPick.selectedItems[0];
          if (item === undefined) {
            return;
          }

          const editor = vscode.window.activeTextEditor;
          if (editor) {
            editor.edit(editBuilder =>
            {
              const link = item.label.replace(/\.md$/i, '');
              const text = editor.document.getText(editor.selection);
              if (text === '') {
                const title = link.replace(/^.*\//, '');
                editBuilder.insert(editor.selection.active, `[${title}](<${link}>)`);
              } else {
                editBuilder.replace(editor.selection, `[${text}](<${link}>)`);
              }
            });
          }

          quickPick.dispose();
        });

        quickPick.show();

        return { quickPick };
      });

  context.subscriptions.push(addOrReplaceLinkCommandRegistration);

  startQueues(miniSearch);
}

export function deactivate()
{
  stopQueues();
}
