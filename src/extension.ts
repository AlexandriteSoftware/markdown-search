import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as vscode from 'vscode';
import * as MiniSearch from 'minisearch';
import * as minimatch from 'minimatch';

const EXTENSION_ID = 'markdown-search';
const EXTENSION_NAME = 'Markdown Full Text Search';

type Log = (message: string) => void;

export type Exclusions = { [key: string]: boolean };

/** Represents a file in the knowledge base */
export interface File {

  /** Full (absolute) path to the file, e.g. `c:\kb\project\readme.md`. */
  fullPath: string;

  /** Absolute path to the file's folder from the workspace folder, e.g. `/project`. */
  folder: string;

  /** Absolute path to the file from the workspace folder, e.g. `/project/readme.md`. */
  path: string;

  /** The file's name without extension, e.g. `readme`. */
  basename: string;

  /** The file's extension, e.g. `.md`. */
  extension: string;

  /** The file's type, `markdown` or `other`. */
  type: string;

  /** When the file's type is `markdown`, contains sha1 hash of the content.  */
  hash: string | null;

  /** Modification datetime of the file, as returned by the filesystem. */
  modified: Date;
}

/** Represents a knowldge base, which is a folder with markdown files. */
export interface KnowledgeBase {

  /** Path to the knowledge base's root folder. */
  root: string;

  /** Excluded files and folders. */
  exclude: Exclusions;

  /** This knowledge base's files. */
  files: File[];
}

interface KnowledgeBaseFilesystemWatcher {
  root: string;
  dispose(): void;
}

/** The list of loaded knowledge bases. Each corresponds to the workspace's folder. */
const knowledgeBases: KnowledgeBase[] = [];

/** The list of filesystem watchers. Each corresponds to the workspace's folder
 * and the loaded knowledge base associated with it. */
const kbFilesystemWatchers: KnowledgeBaseFilesystemWatcher[] = [];

// typescript definition for minisearch is a bit scratchy
const miniSearchClass = MiniSearch as any;
const miniSearch: MiniSearch.default = new miniSearchClass({
  fields: ['title', 'text'],
  storeFields: ['title', 'path']
});

async function addFileToSearchIndex(file: File): Promise<boolean> {
  let content = '';
  try {
    content = await fs.readFile(file.fullPath, { encoding: 'utf8' });
  } catch {
    return false;
  }

  miniSearch.add({
    id: file.fullPath,
    title: file.basename,
    path: file.path,
    text: content
  });

  return true;
}

async function replaceFileInSearchIndex(file: File) {
  let content = '';
  try {
    content = await fs.readFile(file.fullPath, { encoding: 'utf8' });
  } catch {
    return false;
  }

  miniSearch.replace({
    id: file.fullPath,
    title: file.basename,
    path: file.path,
    text: content
  });

  return true;
}

function removePathFromSearchIndex(fileFullPath: string) {
  miniSearch.discard(fileFullPath);
}

/**
 * Filters out mathing and hidden (starting with `.`) files and folders.
 * 
 * @param {KnowledgeBase} kb The knowledge base.
 * @param {string} file The path to the file.
 */
export function kbFileFilter(log: Log, kb: KnowledgeBase, file: string): boolean {
  //log(`kbFileFilter: kb.root='${kb.root}' file='${file}'`);

  const rootFullPath = path.resolve(kb.root);
  const fileFullPath = path.resolve(rootFullPath, file);

  const relativePath = path.relative(rootFullPath, fileFullPath);
  if (relativePath.startsWith('..')) {
    // the file path is outside of the knowledge base
    return false;
  }

  for (const pattern of Object.keys(kb.exclude)) {
    if (minimatch(relativePath, pattern, { matchBase: true })) {
      return false;
    }
  }

  const relativePathItems = relativePath.split(path.sep);

  for (const item of relativePathItems) {
    // the file is in a hidden folder or is hidden itself
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
async function getKbFileInfo(log: Log, kb: KnowledgeBase, file: string): Promise<File | null> {
  if (!kbFileFilter(log, kb, file)) {
    return null;
  }

  const rootFullPath = path.resolve(kb.root);
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
    path: (folder === '/' ? '' : folder) + '/' + name,
    basename: path.basename(name, extension),
    extension,
    type,
    hash,
    modified: (await fs.stat(fullPath)).mtime
  };
}

/**
 * Enumerating files in the knowledge base through asynchronous generator.
 * 
 * @param {string} rootFolder The root folder the of the knowledge base.
 * @param {string} folder Relative path of the knowledge base subfolder. Optional.
 */
async function* findKbFiles(log: Log, kb: KnowledgeBase, folder?: string): AsyncGenerator<File> {
  const folderFullPath = path.join(kb.root, folder || '');

  for await (const item of await fs.readdir(folderFullPath)) {
    // item is a folder or file name with extension

    const itemRelativePath = path.join(folder || '', item);
    const itemFullPath = path.join(kb.root, itemRelativePath);

    const st = await fs.stat(itemFullPath);

    if (st.isDirectory()) {
      yield* findKbFiles(log, kb, itemRelativePath);
    } else {
      const fileInfo = await getKbFileInfo(log, kb, itemFullPath);
      if (fileInfo !== null) {
        yield fileInfo;
      }
    }
  }
}

/** Try to update file in the knowledge base. */
async function tryUpdateKbFile(log: Log, kb: KnowledgeBase, itemFullPath: string) {
  const st = await fs.stat(itemFullPath);

  if (st.isDirectory()) {
    return {};
  }

  const existingFile = kb.files.find((file: any) => file.fullPath === itemFullPath);

  const newFile = await getKbFileInfo(log, kb, itemFullPath);
  if (newFile === null) {
    return { excluded: true };
  }

  if (!existingFile) {
    kb.files.push(newFile);
    return { added: newFile };
  }

  if (existingFile.modified !== newFile.modified) {
    kb.files[kb.files.indexOf(existingFile)] = newFile;
    return { updated: newFile, previous: existingFile };
  }

  return {};
}

async function addKb(log: Log, root: string, exclude: any): Promise<any> {
  log(`Adding knowledge base: ${root}`);

  const existing = knowledgeBases.find(kb => kb.root === root);
  if (existing) {
    log(`The knowledge base "${root}" has been added already.`);
    return;
  }

  const kb: KnowledgeBase = { root, exclude, files: [] };
  knowledgeBases.push(kb);

  log(`Looking for files in the folder ${root} excluding ${JSON.stringify(exclude)}.`);

  for await (const file of findKbFiles(log, kb)) {
    kb.files.push(file);
  }

  log(`Added ${kb.files.length} files to the knowledge base.`);

  const ac = new AbortController();
  kbFilesystemWatchers.push({
    root: kb.root,
    dispose: () => {
      log(`Stopping monitoring knowledge base: ${kb.root}`);
      ac.abort();
    }
  });

  // event-based filesystem monitoring
  (async () => {
    log(`Starting monitoring knowledge base: ${kb.root}`);

    try {
      const watcher = fs.watch(kb.root, { recursive: true, signal: ac.signal });

      for await (const event of watcher) {
        if (event.filename === null) {
          continue;
        }

        //log(`Received event: ${event.eventType} ${event.filename}`);

        const itemFullName = path.join(kb.root, event.filename);
        const st = await fs.stat(itemFullName);
        if (st.isDirectory()) {
          continue;
        }

        const result = await tryUpdateKbFile(log, kb, itemFullName);
        if (result.excluded) {
          //log(`Excluded the file ${event.filename}`);
          continue;
        }
        if (result.added) {
          const file = result.added;
          if (file.type === 'markdown') {
            log(`Indexing the file ${file.path}.`);
            await addFileToSearchIndex(file);
          }
          continue;
        }
        if (result.updated) {
          const file = result.updated;
          if (file.type === 'markdown') {
            log(`Re-indexing the file ${file.path}.`);
            await replaceFileInSearchIndex(file);
          }
          continue;
        }
      }
    } catch (err: any) {
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

async function removeKb(log: Log, root: string) {
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

async function removeAllKbs(log: Log) {
  log(`Removing all knowledge bases.`);

  while (knowledgeBases.length > 0) {
    await removeKb(log, knowledgeBases[0].root);
  }
}


// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {

  // create and show the output channel
  const outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);
  outputChannel.show();

  const log: Log =
    message => outputChannel.appendLine(message);

  outputChannel.appendLine(`The extension "${EXTENSION_NAME}" (${EXTENSION_ID}) is now active.`);

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

  const workspaceFolders = vscode.workspace.workspaceFolders;
  for (const workspaceFolder of workspaceFolders || []) {
    const configuration = vscode.workspace.getConfiguration(undefined, workspaceFolder.uri);
    const filesExclude = configuration.get('files.exclude');
    addKb(log, workspaceFolder.uri.fsPath, filesExclude as any);
  }

  vscode.workspace.onDidChangeWorkspaceFolders(async event => {
    for (const folder of event.removed || []) {
      await removeKb(log, folder.uri.fsPath);
    }

    for (const folder of event.added || []) {
      const configuration = vscode.workspace.getConfiguration(undefined, folder.uri);
      const filesExclude = configuration.get('files.exclude');
      addKb(log, folder.uri.fsPath, filesExclude as any);
    }
  });

  vscode.workspace.onDidChangeConfiguration(async event => {
    if (event.affectsConfiguration('files.exclude')) {
      await removeAllKbs(log);

      const workspaceFolders = vscode.workspace.workspaceFolders;
      for (const workspaceFolder of workspaceFolders || []) {
        const configuration = vscode.workspace.getConfiguration(undefined, workspaceFolder.uri);
        const filesExclude = configuration.get('files.exclude');
        await addKb(log, workspaceFolder.uri.fsPath, filesExclude as any);
      }
    }
  });
}

export function deactivate() { }
