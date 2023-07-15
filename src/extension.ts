import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as vscode from 'vscode';
import * as MiniSearch from 'minisearch';
import * as minimatch from 'minimatch';
import { wsEvents } from './wsEvents';
import { createLogger, format, Logger } from 'winston';
import * as Transport from 'winston-transport';

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

const outputChannelTransport = new OutputChannelTransport();

const logger = createLogger({
  level: 'debug',
  format: format.simple(),
  transports: [outputChannelTransport]
});


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

async function addFileToSearchIndex(log: Logger, file: File): Promise<boolean> {
  log.debug(`addFileToSearchIndex(${file.fullPath})`);

  const content = await readFile(log, file.fullPath);
  if (content === null) {
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

async function replaceFileInSearchIndex(log: Logger, file: File) {
  log.debug(`replaceFileInSearchIndex(${file.fullPath})`);

  const content = await readFile(log, file.fullPath);
  if (content === null) {
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

function removePathFromSearchIndex(log: Logger, fileFullPath: string) {
  log.debug(`removePathFromSearchIndex(${fileFullPath})`);

  try {
    miniSearch.discard(fileFullPath);
  } catch (e) {
    log.debug(`removePathFromSearchIndex(...): ${(e || "").toString()}`);
  }
}

async function stat(log: Logger, path: string): Promise<fs.Stats | null> {
  let st: fs.Stats | null = null;
  try {
    st = await fsp.stat(path);
  } catch {
    log.info(`Failed to stat the path ${path}.`);
  }
  return st;
}

async function readFile(log: Logger, path: string): Promise<string | null> {
  let content: string | null = null;
  try {
    content = await fsp.readFile(path, { encoding: 'utf8' });
  } catch {
    log.info(`Failed to read the file ${path}.`);
  }
  return content;
}


/**
 * Filters out mathing and hidden (starting with `.`) files and folders.
 * 
 * @param {KnowledgeBase} kb The knowledge base.
 * @param {string} file The path to the file.
 */
export function kbFileFilter(log: Logger, kb: KnowledgeBase, file: string): boolean {
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
async function getKbFileInfo(log: Logger, kb: KnowledgeBase, file: string): Promise<File | null> {
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
    const content = await readFile(log, fullPath);
    if (content === null) {
      return null;
    }

    hash = crypto.createHash('sha1').update(content).digest('hex');
  }

  const st = await stat(log, fullPath);
  if (st === null) {
    return null;
  }

  return {
    fullPath,
    folder,
    path: (folder === '/' ? '' : folder) + '/' + name,
    basename: path.basename(name, extension),
    extension,
    type,
    hash,
    modified: st.mtime
  };
}

/**
 * Enumerating files in the knowledge base through asynchronous generator.
 * 
 * @param {string} rootFolder The root folder the of the knowledge base.
 * @param {string} folder Relative path of the knowledge base subfolder. Optional.
 */
async function* findKbFiles(log: Logger, kb: KnowledgeBase, folder?: string): AsyncGenerator<File> {
  const folderFullPath = path.join(kb.root, folder || '');

  const files: string[] = [];
  try {
    files.push(...await fsp.readdir(folderFullPath));
  } catch {
    log.info(`Failed to read the folder ${folderFullPath}.`);
    return;
  }

  for await (const item of files) {
    // item is a folder or file name with extension

    const itemRelativePath = path.join(folder || '', item);
    const itemFullPath = path.join(kb.root, itemRelativePath);

    const st = await stat(log, itemFullPath);

    if (st === null) {
      continue;
    }

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
async function tryUpdateKbFile(log: Logger, kb: KnowledgeBase, itemFullPath: string) {
  const st = await stat(log, itemFullPath);
  if (st === null || st.isDirectory()) {
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

async function addKb(log: Logger, root: string, exclude: any): Promise<any> {
  log.info(`Adding knowledge base: ${root}`);

  const existing = knowledgeBases.find(kb => kb.root === root);
  if (existing) {
    log.info(`The knowledge base "${root}" has been added already.`);
    return;
  }

  const kb: KnowledgeBase = { root, exclude, files: [] };
  knowledgeBases.push(kb);

  log.info(`Looking for files in the folder ${root} excluding ${JSON.stringify(exclude)}.`);

  for await (const file of findKbFiles(log, kb)) {
    kb.files.push(file);
  }

  log.info(`Added ${kb.files.length} files to the knowledge base.`);

  const ac = new AbortController();
  kbFilesystemWatchers.push({
    root: kb.root,
    dispose: () => {
      log.info(`Stopping monitoring knowledge base: ${kb.root}`);
      ac.abort();
    }
  });

  // event-based filesystem monitoring
  (async () => {
    log.info(`Starting monitoring knowledge base: ${kb.root}`);

    try {
      const watcher = fsp.watch(kb.root, { recursive: true, signal: ac.signal });

      for await (const event of watcher) {
        log.debug(`Received event: ${JSON.stringify(event)}`);

        const filename = event.filename;
        const filenameIsNotSet =
          filename === undefined
          || filename === null
          || filename === '';

        if (filenameIsNotSet) {
          log.debug(`Event's filename is not set, skipping.`);
          continue;
        }

        const itemFullName = path.join(kb.root, filename);
        if (!kbFileFilter(log, kb, itemFullName)) {
          log.debug(`The path ${itemFullName} is excluded, skipping.`);
          continue;
        }

        const st = await stat(log, itemFullName);
        if (st === null) {
          const file = kb.files.find((file: any) => file.fullPath === itemFullName);
          if (file && file.type === 'markdown') {
            removePathFromSearchIndex(log, itemFullName);
          }
          log.debug(`The stats for the path ${itemFullName} are not available, skipping.`);
          continue;
        }

        if (st.isDirectory()) {
          log.debug(`The path ${itemFullName} is a directory, skipping.`);
          continue;
        }

        const result = await tryUpdateKbFile(log, kb, itemFullName);
        if (result.excluded) {
          log.debug(`The file ${itemFullName} is excluded, skipping.`);
          continue;
        }

        if (result.added) {
          const file = result.added;
          if (file.type === 'markdown') {
            log.info(`Indexing the file ${file.path}.`);
            await addFileToSearchIndex(log, file);
          }
          continue;
        }
        if (result.updated) {
          const file = result.updated;
          if (file.type === 'markdown') {
            log.info(`Re-indexing the file ${file.path}.`);
            await replaceFileInSearchIndex(log, file);
          }
          continue;
        }
      }
    } catch (err: any) {
      if (err && err.name === 'AbortError') {
        log.info(`Stopped monitoring knowledge base: ${kb.root}`);
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
    if (await addFileToSearchIndex(log, file)) {
      indexed.push(file);
      continue;
    }

    failures.push(file);
  }

  log.info(`Indexed ${indexed.length} files in the knowledge base.`);

  return { kb, indexed, failures };
}

async function removeKb(log: Logger, root: string) {
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
        removePathFromSearchIndex(log, file.fullPath);
      }
    }
  }
}

// This method is called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
  // create and show the output channel
  const outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);
  outputChannel.show();
  outputChannelTransport.updateOutputChannel(outputChannel);

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
    for await (const e of wsEvents(logger)) {
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
