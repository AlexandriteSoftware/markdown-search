import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as vscode from 'vscode';
import * as MiniSearch from 'minisearch';

interface File {
  fullPath : string;
  folder : string;
  path : string;
  basename : string;
  extension : string;
  type : string;
  hash : string|null;
  modified : Date;
}

interface KnowledgeBase {
  root: string;
  files: File[];
}

const knowledgeBases : KnowledgeBase[] = [];

// typescript definition for minisearch is a bit scratchy
const miniSearchClass = MiniSearch as any;
const miniSearch : MiniSearch.default = new miniSearchClass({
  fields: ['title', 'text'],
  storeFields: ['title', 'path']
});

async function addFileToSearchIndex(file : File) {
  const content = await fs.readFile(file.fullPath, { encoding : 'utf8'});
  miniSearch.add({
    id : file.fullPath,
    title: file.basename,
    path : file.path,
    text: content
  });
}

function removePathFromsearchIndex(fileFullPath : string) {
  miniSearch.discard(fileFullPath);
}


/** Filters out files and folders starting with `.`. */
function kbFileFilter(root : string, file : string) : boolean {
  const rootFullPath = path.resolve(root);
  const fileFullPath = path.resolve(file);

  const relativePath = path.relative(rootFullPath, fileFullPath);
  const relativePathItems = relativePath.split(path.sep);

  for (const item of relativePathItems) {
    if (0 === item.indexOf('.')) {
      return false;
    }
  }

  return true;
}

/**
 * Constructs knowledge base file info.
 * 
 * @param {string} root Path to the knowledge base root folder.
 * @param {string} file Path to the knowledge base file.
 */
async function getKbFileInfo(root : string, file : string) : Promise<File|null> {
  if (!kbFileFilter(root, file)) {
    return null;
  }

  const rootFullPath = path.resolve(root);
  const fullPath = path.resolve(file);
  const relativePath = path.relative(rootFullPath, fullPath);
  const name = path.basename(fullPath);
  const extension = path.extname(name);
  const folderRelativePath = path.dirname(relativePath);
  const folder = '/' + (folderRelativePath === '.' ? '' : folderRelativePath).replace(/\\/g, '/');

  let type = 'other';
  if (extension.toUpperCase() === '.MD') {
    type = 'markdown';
  }

  let hash = null;
  if (type === 'markdown') {
    hash =
      crypto.createHash('sha1')
        .update(await fs.readFile(fullPath, { encoding: 'utf8' }))
        .digest('hex');
  }

  return {
    fullPath,
    folder,
    path : (folder === '/' ? '' : folder) + '/' + name,
    basename : path.basename(name, extension),
    extension,
    type,
    hash,
    modified : (await fs.stat(fullPath)).mtime
  };
}

/**
 * Enumerating files in the knowledge base through asynchronous generator.
 * 
 * @param {string} rootFolder The root folder the of the knowledge base.
 * @param {string} folder Relative path of the knowledge base subfolder. Optional.
 */
async function* findKbFiles(rootFolder : string, folder? : string) : AsyncGenerator<File> {
  const folderFullPath = path.join(rootFolder, folder || '');

  for await (const item of await fs.readdir(folderFullPath)) {
    // item is a folder or file name with extension

    const itemRelativePath = path.join(folder || '', item);
    const itemFullPath = path.join(rootFolder, itemRelativePath);

    const st = await fs.stat(itemFullPath);

    if (st.isDirectory()) {
      yield* findKbFiles(rootFolder, itemRelativePath);
    } else {
      const fileInfo = await getKbFileInfo(rootFolder, itemFullPath);
      if (fileInfo !== null) {
        yield fileInfo;
      }
    }
  }
}

/** Try to update file in the knowledge base. */
async function tryUpdateKbFile(kb : any, itemFullPath : string) {
  const st = await fs.stat(itemFullPath);

  if (st.isDirectory()) {
    return { };
  }

  const existingFile = kb.files.filter((file : any) => file.fullPath === itemFullPath)[0] || null;

  const newFile = await getKbFileInfo(kb.root, itemFullPath);
  if (newFile === null) {
    return { };
  }

  if (existingFile === null) {
    kb.files.push(newFile);
    return { added : newFile };
  }

  if (existingFile.modified !== newFile.modified) {
    kb.files[kb.files.indexOf(existingFile)] = newFile;
    return { updated : newFile, previous : existingFile };
  }

  return { };
}

async function addKb(root : string) {
  const existing = knowledgeBases.filter(kb => kb.root === root)[0] || null;
  if (existing !== null) {
    return;
  }

  const kb : KnowledgeBase = { root, files : [] };
  knowledgeBases.push(kb);

  for await (const file of findKbFiles(kb.root)) {
    kb.files.push(file);
    if (file.type === 'markdown') {
      await addFileToSearchIndex(file);
    }
  }
}

async function removeKb(root : string) {
  const existing = knowledgeBases.filter(kb => kb.root === root)[0] || null;
  if (existing === null) {
    return;
  }

  for (const file of existing.files) {
    if (file.type === 'markdown') {
      removePathFromsearchIndex(file.fullPath);
    }
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context : vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('Markdown Search');
  outputChannel.show();

  outputChannel.appendLine('The extension "Markdown Search" (markdown-search) is now active.');

  // The commandId parameter must match the command field in package.json
  const commandRegistration =
    vscode.commands.registerCommand(
      'markdown-search.search',
      () => {
        const quickPick = vscode.window.createQuickPick();

        quickPick.onDidChangeValue(value => {
          const results = miniSearch.search(value, { fuzzy: 0.2, boost: { title : 2 } });

          // for debugging:
          //outputChannel.appendLine(`onDidChangeValue(${value}): ${results.length}`);

          quickPick.items = results.map(item => {
            return {
              alwaysShow: true,
              label : item.path,
              description : 'matches ' + item.terms.map(item => `'${item}'`).join(', '),
              detail : item.id
            };
          });
        });

        quickPick.onDidAccept(async () => {
          const item = quickPick.selectedItems[0];
          if (item === undefined) {
            return;
          }

          const document = await vscode.workspace.openTextDocument(item.detail as any);
          await vscode.window.showTextDocument(document);
        });

        quickPick.show();
      });

  context.subscriptions.push(commandRegistration);

  const workspaceFolders = vscode.workspace.workspaceFolders;
  for (const workspaceFolder of workspaceFolders || []) {
    addKb(workspaceFolder.uri.fsPath);
  }

  vscode.workspace.onDidChangeWorkspaceFolders(event => {
    for (const folder of event.removed || []) {
      removeKb(folder.uri.fsPath);
    }

    for (const folder of event.added || []) {
      addKb(folder.uri.fsPath);
    }
  });
}

export function deactivate() { }
