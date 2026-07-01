import vscode
  from 'vscode';
import { Logger }
  from 'winston';
import { Enqueuer }
  from '../AsyncIterableQueue';
import { EditorEvent,
         FolderAddedEvent }
  from '../EditorEvents';

export function processWorkspaceEvents(
    log: Logger,
    enqueuer: Enqueuer<EditorEvent>
  ): () => void
{
  const context =
    'processWorkspaceEvents';

  const ws =
    vscode.workspace;

  const disposables: vscode.Disposable[] = [ ];

  ws.onDidChangeConfiguration(
    event =>
    {
      log.debug(
        '[%s] onDidChangeConfiguration: %s',
        context,
        JSON.stringify(event));

      for (const folder of ws.workspaceFolders || []) {
        const filesExcludeChanged =
          event.affectsConfiguration(
            'files.exclude',
            folder);

        const searchExcludeChanged =
          event.affectsConfiguration(
            'search.exclude',
            folder);

        if (filesExcludeChanged
            || searchExcludeChanged)
        {
          enqueue(
            { event: 'folder-removed',
              path: folder.uri.fsPath });

          addKb(
            folder.uri);
        }
      }
    },
    null,
    disposables);

  ws.onDidChangeWorkspaceFolders(
    event =>
    {
      log.debug(
        '[%s] onDidChangeWorkspaceFolders: %s',
        context,
        JSON.stringify(event));

      for (const folder of event.removed || []) {
        enqueue(
          { event: 'folder-removed',
            path: folder.uri.fsPath });
      }

      for (const folder of event.added || []) {
        addKb(
          folder.uri);
      }
    },
    null,
    disposables);

  ws.onDidCreateFiles(
    event =>
    {
      log.debug(
        '[%s] onDidCreateFiles: %s',
        context,
        JSON.stringify(event));

      event.files.forEach(
        file =>
          enqueue(
            { event: 'file-updated',
              path: file.fsPath }));
    },
    null,
    disposables);

  ws.onDidDeleteFiles(
    event =>
    {
      log.debug(
        '[%s] onDidDeleteFiles: %s',
        context,
        JSON.stringify(event));

      event.files.forEach(
        file =>
          enqueue(
            { event: 'file-deleted',
              path: file.fsPath }));
    },
    null,
    disposables);

  ws.onDidSaveTextDocument(
    event =>
    {
      log.debug(
        '[%s] onDidSaveTextDocument: %s',
        context,
        JSON.stringify(event));

      enqueue(
        { event: 'file-updated',
          path: event.uri.fsPath });
    },
    null,
    disposables);

  for (const folder of ws.workspaceFolders || []) {
    addKb(
      folder.uri);
  }

  const dispose =
    (): void =>
    {
      for (const item of disposables) {
        item.dispose();
      }
    };

  return dispose;

  function enqueue<T extends EditorEvent>(
      event: T
    ): void
  {
    log.debug(
      '[%s] enqueue: %s',
      context,
      JSON.stringify(event));

    enqueuer.enqueue(event);
  }

  function addKb(
      folder: vscode.Uri
    ): void
  {
    const configuration =
      ws.getConfiguration(
        undefined,
        folder);

    const exclude: Record<string, boolean> =
      Object.assign(
        { },
        configuration.get('files.exclude') as Record<string, boolean>,
        configuration.get('search.exclude') as Record<string, boolean>)

    const event: FolderAddedEvent =
      { event: 'folder-added',
        path: folder.fsPath,
        exclude };

    enqueue(event);
  }
}
