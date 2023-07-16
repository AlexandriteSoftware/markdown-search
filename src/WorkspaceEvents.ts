import * as vscode from 'vscode';
import { createLogger, Logger } from 'winston';

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
export const createWorkspaceEventsIterator = ((log? : Logger) => {
  log = log || createLogger();

  const values: IWorkspaceEvent[] = [];
  const resolves: ((value: IteratorResult<IWorkspaceEvent>) => void)[] = [];

  const submit = (e: IWorkspaceEvent) => {
    if (resolves.length === 0) {
      values.push(e);
      return;
    }

    let resolve = resolves.shift() || (() => { });
    resolve({ done: false, value: e });
  };

  const addFolder = (folder: vscode.Uri) => {
    log?.debug(`addFolder: ${folder.fsPath}`);

    const configuration = vscode.workspace.getConfiguration(undefined, folder);
    const filesExclude = configuration.get('files.exclude') as { [key: string]: boolean };
    const searchExclude = configuration.get('search.exclude') as { [key: string]: boolean };
    submit({ action : 'added', folder : folder.fsPath, exclude: Object.assign({}, filesExclude, searchExclude) });
  };

  const removeFolder = (folder: vscode.Uri) => {
    log?.debug(`removeFolder: ${folder.fsPath}`);

    submit({ action: 'removed', folder: folder.fsPath });
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

  const workspaceFolders = vscode.workspace.workspaceFolders;
  for (const folder of workspaceFolders || []) {
    addFolder(folder.uri);
  }

  return {
    [Symbol.asyncIterator]: () => {
      return {
        next: (): Promise<IteratorResult<IWorkspaceEvent>> => {
          if (values.length === 0) {
            return new Promise<IteratorResult<IWorkspaceEvent>>(resolve => resolves.push(resolve));
          }

          const value = values.shift() as IWorkspaceEvent;
          return Promise.resolve<IteratorResult<IWorkspaceEvent>>({ done: false, value });
        }
      };
    },
    dispose: () => {
      onDidChangeConfigurationSubscriber.dispose();
      onDidChangeWorkspaceFoldersSubscriber.dispose();

      while (resolves.length > 0) {
        const resolve = resolves.shift() || (() => { });
        resolve({ done: true, value: undefined });
      }
    }
  };
});
