import vscode from 'vscode';
import { Logger } from 'winston';
import { Enqueuer } from './AsyncIterableQueue';
import { EditorEvent } from './EditorEvents';

export function translateWorkspaceToEditorEvents
  (log: Logger,
    enqueuer: Enqueuer<EditorEvent>)
  : (() => void)
{
  const context = 'translateWorkspaceToEditorEvents';

  const ws = vscode.workspace;

  const disposables: vscode.Disposable[] = [];

  ws.onDidChangeConfiguration(event =>
  {
    log.debug(`[${context}] onDidChangeConfiguration: ${JSON.stringify(event)}`);

    for (const folder of ws.workspaceFolders || []) {
      const filesExcludeChanged = event.affectsConfiguration('files.exclude', folder);
      const searchExcludeChanged = event.affectsConfiguration('search.exclude', folder);
      if (filesExcludeChanged || searchExcludeChanged) {
        enqueue({ event: 'folder-removed', path: folder.uri.fsPath });
        addKb(folder.uri);
      }
    }
  }, null, disposables);

  ws.onDidChangeWorkspaceFolders(event =>
  {
    log.debug(`[${context}] onDidChangeWorkspaceFolders: ${JSON.stringify(event)}`);

    for (const folder of event.removed || []) {
      enqueue({ event: 'folder-removed', path: folder.uri.fsPath });
    }

    for (const folder of event.added || []) {
      addKb(folder.uri);
    }
  }, null, disposables);

  ws.onDidCreateFiles(event =>
  {
    log.debug(`[${context}] onDidCreateFiles: ${JSON.stringify(event)}`);
    event.files.forEach(file => enqueue({ event: 'file-updated', path: file.fsPath }));
  }, null, disposables);

  ws.onDidDeleteFiles(event =>
  {
    log.debug(`[${context}] onDidDeleteFiles: ${JSON.stringify(event)}`);
    event.files.forEach(file => enqueue({ event: 'file-deleted', path: file.fsPath }));
  }, null, disposables);

  ws.onDidSaveTextDocument(event =>
  {
    log.debug(`[${context}] onDidSaveTextDocument: ${JSON.stringify(event)}`);
    enqueue({ event: 'file-updated', path: event.uri.fsPath });
  }, null, disposables);

  for (const folder of ws.workspaceFolders || []) {
    addKb(folder.uri);
  }

  return () =>
  {
    for (const item of disposables) {
      item.dispose();
    }
  };

  function enqueue
    (event: EditorEvent)
  {
    log.debug(`[${context}] equeue: ${JSON.stringify(event)}`);
    enqueuer.enqueue(event);
  }

  function addKb
    (folder: vscode.Uri)
  {
    const configuration = ws.getConfiguration(undefined, folder);
    const filesExclude = configuration.get('files.exclude') as { [key: string]: boolean; };
    const searchExclude = configuration.get('search.exclude') as { [key: string]: boolean; };

    enqueue({
      event: 'folder-added',
      path: folder.fsPath,
      exclude: Object.assign({}, filesExclude, searchExclude)
    });
  };
}
