import * as vscode from 'vscode';
import { createLogger, Logger } from 'winston';
import { AsyncIterableQueue } from './AsyncIterableQueue';

interface IWorkspaceEvent {
  action: 'added' | 'removed';

  /** An absolute path to the filesystem folder. */
  folder: string;

  /** The exclude patterns for the folder. */
  exclude?: { [key: string]: boolean };
}

/**
 * Creates disposable asynchronous iterator of the workspace events, e.g.
 * adding folder, removing folder, changing configuration.
 */
export const createWorkspaceEventsIterator = ((log? : Logger) : AsyncIterableQueue<IWorkspaceEvent> => {
  log = log || createLogger();

  const disposables : (() => void)[] = [];

  const dispose = () => {
    for (const dispose of disposables) {
      dispose();
    }
  };

  const iterator = new AsyncIterableQueue<IWorkspaceEvent>(dispose);

  const addFolder = (folder: vscode.Uri) => {
    log?.debug(`addFolder: ${folder.fsPath}`);

    const configuration = vscode.workspace.getConfiguration(undefined, folder);
    const filesExclude = configuration.get('files.exclude') as { [key: string]: boolean };
    const searchExclude = configuration.get('search.exclude') as { [key: string]: boolean };
    iterator.enqueue({ action : 'added', folder : folder.fsPath, exclude: Object.assign({}, filesExclude, searchExclude) });
  };

  const removeFolder = (folder: vscode.Uri) => {
    log?.debug(`removeFolder: ${folder.fsPath}`);

    iterator.enqueue({ action: 'removed', folder: folder.fsPath });
  };

  const onDidChangeConfigurationSubscriber =
    vscode.workspace.onDidChangeConfiguration(event => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      for (const folder of workspaceFolders || []) {
        const filesExcludeChanged = event.affectsConfiguration('files.exclude', folder);
        const searchExcludeChanged = event.affectsConfiguration('search.exclude', folder);
        if (filesExcludeChanged || searchExcludeChanged) {
          removeFolder(folder.uri);
          addFolder(folder.uri);
        }
      }
    });
  disposables.push(() => onDidChangeConfigurationSubscriber.dispose());

  const onDidChangeWorkspaceFoldersSubscriber =
    vscode.workspace.onDidChangeWorkspaceFolders(event => {
      log?.debug(`onDidChangeWorkspaceFolders: ${JSON.stringify(event)}`);

      for (const folder of event.removed || []) {
        removeFolder(folder.uri);
      }

      for (const folder of event.added || []) {
        addFolder(folder.uri);
      }
    });
  disposables.push(() => onDidChangeWorkspaceFoldersSubscriber.dispose());

  const workspaceFolders = vscode.workspace.workspaceFolders;
  for (const folder of workspaceFolders || []) {
    addFolder(folder.uri);
  }

  return iterator;
});
