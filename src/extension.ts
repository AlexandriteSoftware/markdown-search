import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as vscode from 'vscode';
import * as MiniSearch from 'minisearch';

const EXTENSION_ID = 'markdown-search';
const EXTENSION_NAME = 'Markdown Full Text Search';

type Log = (message : string) => void;

/** Represents a file in the knowledge base */
interface File {

  /** Full (absolute) path to the file, e.g. `c:\kb\project\readme.md`. */
  fullPath : string;

  /** Absolute path to the file's folder from the workspace folder, e.g. `/project`. */
  folder : string;

  /** Absolute path to the file from the workspace folder, e.g. `/project/readme.md`. */
  path : string;

  /** The file's name without extension, e.g. `readme`. */
  basename : string;

  /** The file's extension, e.g. `.md`. */
  extension : string;

  /** The file's type, `markdown` or `other`. */
  type : string;

  /** When the file's type is `markdown`, contains sha1 hash of the content.  */
  hash : string|null;

  /** Modification datetime of the file, as returned by the filesystem. */
  modified : Date;
}

/** Represents a knowldge base, which is a folder with markdown files. */
interface KnowledgeBase {

  /** Path to the knowledge base's root folder. */
  root: string;

  /** This knowledge base's files. */
  files: File[];
}

interface KnowledgeBaseFilesystemWatcher {
  root : string;
  dispose() : void;
}

/** The list of loaded knowledge bases. Each corresponds to the workspace's folder.  */
const knowledgeBases : KnowledgeBase[] = [];

/**
 * The list of filesystem watchers. Each corresponds to
 * the workspace's folder and loaded knoeledge base.
 */
const kbFilesystemWatchers : KnowledgeBaseFilesystemWatcher[] = [];

// typescript definition for minisearch is a bit scratchy
const miniSearchClass = MiniSearch as any;
const miniSearch : MiniSearch.default = new miniSearchClass({
  fields: ['title', 'text'],
  storeFields: ['title', 'path']
});

async function addFileToSearchIndex(file : File) : Promise<boolean> {
  let content = '';
  try {
    content = await fs.readFile(file.fullPath, { encoding : 'utf8'});
  } catch {
    return false;
  }

  miniSearch.add({
    id : file.fullPath,
    title: file.basename,
    path : file.path,
    text: content
  });

  return true;
}

async function replaceFileInSearchIndex(file : File) {
  let content = '';
  try {
    content = await fs.readFile(file.fullPath, { encoding : 'utf8'});
  } catch {
    return false;
  }

  miniSearch.replace({
    id : file.fullPath,
    title: file.basename,
    path : file.path,
    text: content
  });

  return true;
}

function removePathFromSearchIndex(fileFullPath : string) {
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

async function addKb(log : Log, root : string) : Promise<any> {
  log(`Adding knowledge base: ${root}`);

  const existing = knowledgeBases.find(kb => kb.root === root);
  if (existing) {
    log(`The knowledge base "${root}" has been added already.`);
    return;
  }

  const kb : KnowledgeBase = { root, files : [] };
  knowledgeBases.push(kb);

  for await (const file of findKbFiles(kb.root)) {
    kb.files.push(file);
  }

  log(`Added ${kb.files.length} files to the knowledge base.`);

  const ac = new AbortController();
  kbFilesystemWatchers.push({
    root : kb.root,
    dispose : () => {
      log(`Stopping monitoring knowledge base: ${kb.root}`);
      ac.abort();
    }
  });

  // event-based filesystem monitoring
  (async () => {
    log(`Starting monitoring knowledge base: ${kb.root}`);

    try {
      const watcher = fs.watch(kb.root, { recursive : true, signal : ac.signal });

      for await (const event of watcher) {
        if (event.filename === null) {
          continue;
        }

        log(`Received event: ${event.eventType} ${event.filename}`);

        const itemFullName = path.join(kb.root, event.filename);
        const st = await fs.stat(itemFullName);
        if (st.isDirectory()) {
          continue;
        }

        const result = await tryUpdateKbFile(kb, itemFullName);
        if (result.added) {
          const file = result.added;
          if (file.type === 'markdown') {
            log(`Indexing the file ${file.path}.`);
            await addFileToSearchIndex(file);
          }
        }
        if (result.updated) {
          const file = result.updated;
          if (file.type === 'markdown') {
            log(`Re-indexing the file ${file.path}.`);
            await replaceFileInSearchIndex(file);
          }
        }
      }
    } catch (err : any) {
      if (err && err.name === 'AbortError') {
        log(`Stopped monitoring knowledge base: ${kb.root}`);
        return;
      }
      throw err;
    }
  })();

  const indexed = [];
  const failures = [];
  for (const file of kb.files) {
    // only index markdown files
    if (file.type !== 'markdown') {
      continue;
    }

    // if added successfully, continue
    if (await addFileToSearchIndex(file)) {
      indexed.push(file);
      continue;
    }

    failures.push(file);
  }

  log(`Indexed ${indexed.length} files in the knowledge base.`);

  return { kb, indexed, failures };
}

async function removeKb(log : Log, root : string) {
  const watcher = kbFilesystemWatchers.find(item => item.root === root);
  if (watcher) {
    watcher.dispose();
    kbFilesystemWatchers.splice(kbFilesystemWatchers.indexOf(watcher), 1);
  }

  const kb = knowledgeBases.find(kb => kb.root === root);
  if (kb) {
    knowledgeBases.splice(knowledgeBases.indexOf(kb), 1);
    for (const file of kb.files) {
      if (file.type === 'markdown') {
        removePathFromSearchIndex(file.fullPath);
      }
    }
  }
}

// This method is called when the extension is activated
export function activate(context : vscode.ExtensionContext) {

  // create and show the output channel
  const outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);
  outputChannel.show();

  const log : Log =
    message => outputChannel.appendLine(message);

  outputChannel.appendLine(`The extension "${EXTENSION_NAME}" (${EXTENSION_ID}) is now active.`);

  function createSearchQuickPick() {
    const quickPick = vscode.window.createQuickPick();

    quickPick.onDidChangeValue(value => {
      const results =
        miniSearch.search(
          value,
          { fuzzy: 0.2, boost: { title : 2 } });

      quickPick.items = results.map(item => {
        return {
          alwaysShow: true,
          label : item.path,
          description : 'matches ' + item.terms.map(item => `'${item}'`).join(', '),
          detail : item.id
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

  const workspaceFolders = vscode.workspace.workspaceFolders;
  for (const workspaceFolder of workspaceFolders || []) {
    addKb(log, workspaceFolder.uri.fsPath);
  }

  vscode.workspace.onDidChangeWorkspaceFolders(event => {
    for (const folder of event.removed || []) {
      removeKb(log, folder.uri.fsPath);
    }

    for (const folder of event.added || []) {
      addKb(log, folder.uri.fsPath);
    }
  });
}

export function deactivate() { }
