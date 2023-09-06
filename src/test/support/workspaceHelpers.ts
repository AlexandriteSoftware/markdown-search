import path from 'path';
import vscode from 'vscode';

/** Replaces the current workspace folder with a new one and returns original folder. */
export async function replaceWorkspaceFolder(value: string)
{
  const folders = vscode.workspace.workspaceFolders;
  const folder =
    folders && folders.length > 0
      ? folders[0].uri.fsPath
      : undefined;

  const name = path.basename(value);

  // Note: it is not valid to call updateWorkspaceFolders() multiple times
  // without waiting for the onDidChangeWorkspaceFolders() to fire.

  let replacedResolve : (() => void) | null = null;
  let subscription : vscode.Disposable | null = null;

  const replaced = new Promise<void>(resolve => { replacedResolve = resolve; });

  subscription =
    vscode.workspace.onDidChangeWorkspaceFolders(e => {
      if (replacedResolve) {
        replacedResolve();
      }
    });

  const result =
    vscode.workspace.updateWorkspaceFolders(
      0,
      vscode.workspace.workspaceFolders
        ? vscode.workspace.workspaceFolders.length
        : 0,
      { uri: vscode.Uri.file(value), name });

  if (!result) {
    throw new Error('Failed to update workspace folders.');
  }

  await replaced;
  subscription.dispose();

  return folder;
}
