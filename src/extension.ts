import vscode from 'vscode';
import MiniSearch from 'minisearch';
import { createLogger, format, Logger } from 'winston';
import Transport from 'winston-transport';
import { IKnowledgeBase, KnowledgeBase } from './KnowledgeBase';
import { createWorkspaceEventsIterator } from './WorkspaceEvents';
import { createKbFilesystemSync, IKbFilesystemSync } from './KbFilesystemSync';
import { createMiniSearchSync, createMiniSearchEventQueue, IMiniSearchSync } from './MiniSearchSync';

const EXTENSION_ID = 'markdown-search';
const EXTENSION_NAME = 'Markdown Full Text Search';

class OutputChannelTransport extends Transport {
  outputChannel: vscode.OutputChannel | null = null;
  updateOutputChannel(channel: vscode.OutputChannel) {
    this.outputChannel = channel;
  }
  log(info: any, callback: () => void) {
    if (this.outputChannel !== null) {
      this.outputChannel.appendLine(info.message);
    }
    callback();
  }
}

let outputChannelTransport :  OutputChannelTransport | null = null;

const loggerOptions = (() => {
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

const miniSearchQueue = createMiniSearchEventQueue(logger, miniSearch);

/** The list of loaded knowledge bases. Each corresponds to the workspace's folder. */
const knowledgeBases: IKnowledgeBase[] = [];

/** The list of filesystem watchers. Each corresponds to the workspace's folder
 * and the loaded knowledge base associated with it. */
export const kbFsSyncs: IKbFilesystemSync[] = [];

/** The list of search index watchers. Each corresponds to the workspace's folder. */
export const kbSearchIndexSyncs: IMiniSearchSync[] = [];

export async function addKb(log: Logger, root: string, exclude: any): Promise<IKnowledgeBase | null> {
  log.info(`Adding knowledge base: ${root}`);

  const existing = knowledgeBases.find(kb => kb.root === root);
  if (existing) {
    log.info(`The knowledge base "${root}" has been added already.`);
    return null;
  }

  const kb = new KnowledgeBase(root, exclude);
  knowledgeBases.push(kb);

  const sync = await createKbFilesystemSync(log, kb);
  kbFsSyncs.push(sync);

  const indexSync = await createMiniSearchSync(log, miniSearchQueue, kb);
  kbSearchIndexSyncs.push(indexSync);

  return kb;
}

export async function removeKb(log: Logger, root: string): Promise<IKnowledgeBase | null> {
  const kb = knowledgeBases.find(kb => kb.root === root);
  if (!kb) {
    return null;
  }

  knowledgeBases.splice(knowledgeBases.indexOf(kb), 1);

  const sync = kbFsSyncs.find(item => item.kb === kb);
  if (sync) {
    sync.dispose();
    kbFsSyncs.splice(kbFsSyncs.indexOf(sync), 1);
  }

  const indexSync = kbSearchIndexSyncs.find(item => item.kb === kb);
  if (indexSync) {
    indexSync.dispose();
    kbSearchIndexSyncs.splice(kbSearchIndexSyncs.indexOf(indexSync), 1);
  }

  return kb;
}

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
  if (outputChannelTransport !== null) {
    // create and show the output channel
    const outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);
    outputChannel.show();
    outputChannelTransport.updateOutputChannel(outputChannel);
  }

  logger.info(`The extension "${EXTENSION_NAME}" (${EXTENSION_ID}) is now active.`);

  function createSearchQuickPick() {
    const quickPick = vscode.window.createQuickPick();

    quickPick.onDidChangeValue(value => {
      const results =
        miniSearch.search(
          value,
          { fuzzy: 0.2, boost: { title: 2 } });

      quickPick.items = results.map(item => {
        return {
          alwaysShow: true,
          label: item.path,
          description: 'matches ' + item.terms.map(item => `'${item}'`).join(', '),
          detail: item.id
        };
      });
    });

    return quickPick;
  }

  // searches for the criteria in the index, opens the file on accept
  const searchCommandRegistration =
    vscode.commands.registerCommand(
      'markdown-search.search',
      () => {
        const quickPick = createSearchQuickPick();

        quickPick.onDidAccept(async () => {
          const item = quickPick.selectedItems[0];
          if (item === undefined) {
            return;
          }

          const document = await vscode.workspace.openTextDocument(item.detail as any);
          await vscode.window.showTextDocument(document);

          quickPick.dispose();
        });

        quickPick.show();
      });

  context.subscriptions.push(searchCommandRegistration);

  // searches for the criteria in the index, inserts a link on accept
  const addOrReplaceLinkCommandRegistration =
    vscode.commands.registerCommand(
      'markdown-search.add-or-replace-link',
      () => {
        const quickPick = createSearchQuickPick();

        quickPick.onDidAccept(async () => {
          const item = quickPick.selectedItems[0];
          if (item === undefined) {
            return;
          }

          const editor = vscode.window.activeTextEditor;
          if (editor) {
            editor.edit(editBuilder => {
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
      });

  context.subscriptions.push(addOrReplaceLinkCommandRegistration);

  (async () => {
    for await (const e of createWorkspaceEventsIterator(logger)) {
      switch (e.action) {
        case 'added':
          await addKb(logger, e.folder, e.exclude || {});
          break;
        case 'removed':
          await removeKb(logger, e.folder);
          break;
      }
    }
  })();
}

export function deactivate() { }
