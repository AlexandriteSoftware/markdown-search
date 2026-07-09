import { resolve,
         dirname,
         basename,
         extname,
         relative,
         sep }
  from 'path';
import { minimatch }
  from 'minimatch';
import { Action }
  from './Types.js';

/**
 * Determines the file type based on its extension.
 */
function extensionToTypeMap(
    extension: string
  ): string
{
  switch (extension.toUpperCase()) {
    case '.BAT': return 'batch';
    case '.C': return 'c';
    case '.CPP': return 'cpp';
    case '.CJS': return 'javascript';
    case '.CS': return 'csharp';
    case '.CSS': return 'css';
    case '.CSV': return 'csv';
    case '.DART': return 'dart';
    case '.GO': return 'go';
    case '.HTM': return 'html';
    case '.HTML': return 'html';
    case '.JAVA': return 'java';
    case '.JS': return 'javascript';
    case '.JSON': return 'json';
    case '.KT': return 'kotlin';
    case '.KTS': return 'kotlin';
    case '.LESS': return 'less';
    case '.LUA': return 'lua';
    case '.MD': return 'markdown';
    case '.MJS': return 'javascript';
    case '.PHP': return 'php';
    case '.PL': return 'perl';
    case '.PS1': return 'powershell';
    case '.PY': return 'python';
    case '.R': return 'r';
    case '.RB': return 'ruby';
    case '.SASS': return 'sass';
    case '.SCSS': return 'scss';
    case '.SH': return 'shell';
    case '.SQL': return 'sql';
    case '.SWIFT': return 'swift';
    case '.TS': return 'typescript';
    case '.TSV': return 'tsv';
    case '.TXT': return 'text';
    case '.VBS': return 'vbscript';
    case '.XML': return 'xml';
    case '.YAML': return 'yaml';
    case '.YML': return 'yaml';
  }
  return 'other';
}

/**
 * List of excluded files and folders, where the key is the file or folder path
 * relative to the knowledge base root and the value is `true`.
 */
export type Exclusions =
  Record<string, boolean>;

/**
 * Represents a file in the knowledge base
 */
export interface IFile
{
  /**
   * Full (absolute) path to the file, e.g. `c:\kb\project\readme.md`.
   */
  fullPath: string;

  /**
   * Absolute path to the file's folder from the workspace folder,
   * e.g. `/project`.
   */
  folder: string;

  /**
   * Absolute path to the file from the workspace folder,
   * e.g. `/project/readme.md`.
   */
  path: string;

  /**
   * The file's name without extension, e.g. `readme`.
   */
  basename: string;

  /**
   * The file's extension, e.g. `.md`.
   */
  extension: string;

  /**
   * The file's type, `markdown` or `other`.
   */
  type: string;

  /**
   * Modification datetime of the file, as returned by the filesystem.
   */
  modified: Date;
}

export class File
  implements IFile
{
  fullPath: string;
  folder: string;
  path: string;
  basename: string;
  extension: string;
  type: string;
  modified: Date;

  /**
   * Constructs the knowledge base file record.
   * 
   * @param fsPath Absolute path to the file from the filesystem root,
   *               e.g. `c:\kb\project\readme.md`.
   * @param kbPath Absolute path to the file from the knowledge base root,
   *               e.g. `/project/readme.md`.
   * @param modified Datetime of the file's last modification.
   */
  constructor(
      fsPath: string,
      kbPath: string,
      modified: Date
    )
  {
    this.fullPath = fsPath;
    this.path = kbPath;
    this.modified = modified;

    this.folder =
      dirname(kbPath);

    const name =
      basename(fsPath);

    const extension =
      extname(name);

    this.basename = name;

    this.extension = extension;

    this.type =
      extensionToTypeMap(
        extension);
  }
}

/**
 * Contains either removed or added files.
 */
export interface FilesChangedEventArgs
{
  removed?: IFile[];
  added?: IFile[];
}

export type FilesChangedListener =
  (args: FilesChangedEventArgs) => void;

/**
 * Represents a knowldge base, which is a folder with markdown files.
 */
export interface IKnowledgeBase
{
  /**
   * Absolute path to the knowledge base's root folder.
   */
  root: string;

  /**
   * Excluded files and folders.
   */
  exclude: Exclusions;

  /**
   * This knowledge base's files.
   */
  files: IFile[];

  /**
   * The provided listener will be notified when the list of files is changed.
   */
  onFilesChanged: (listener: FilesChangedListener) => Action;

  /**
   * Adds files to the knowledge base and notifies listeners.
   */
  addFiles(
      files: File[]
    ): void;

  /**
   * Removes files from the knowledge base and notifies listeners.
   */
  removeFiles(
      files: File[]
    ): void;

  /**
   * Returns files that are equal or under the specified
   * absolute or relative filesystem path.
   */
  filesWithFilesystemPath(
      path: string
    ): IFile[];

  /**
   * Filters out excluded and hidden (starting with `.`) files and folders.
   */
  isAccepted(
      file: string
    ): boolean;

  /**
   * Creates a new file record.
   */
  createFile(
      path: string,
      modified: Date
    ): IFile | null;
}

export class KnowledgeBase
  implements IKnowledgeBase
{
  root: string;
  exclude: Exclusions;
  files: IFile[];
  onFilesChanged: (listener: FilesChangedListener) => Action;
  filesChangedListeners: FilesChangedListener[] = [];

  constructor(
      root: string,
      exclude?: Exclusions
    )
  {
    this.root = resolve(root);
    this.exclude = exclude || {};
    this.files = [];

    this.onFilesChanged =
      (listener: FilesChangedListener) =>
      {
        this.filesChangedListeners.push(listener);

        const unsubscribe =
          (): void =>
          {
            const index =
              this.filesChangedListeners.indexOf(listener);

            if (index > -1) {
              this.filesChangedListeners.splice(index, 1);
            }
          };

        return unsubscribe;
      };
  }

  addFiles(
      files: File[]
    ): void
  {
    for (const file of files) {
      if (!this.isAccepted(file.fullPath)) {
        throw new Error(
          `The file ${file.fullPath} is not accepted.`);
      }
    }

    for (const file of files) {
      const existing =
        this.files.find(
          f =>
            f.fullPath === file.fullPath);

      if (existing) {
        this.files[this.files.indexOf(existing)] = file;
      } else {
        this.files.push(file);
      }
    }

    this.notifyFilesChanged(
      { added: files });
  }

  removeFiles(
      files: File[]
    ): void
  {
    for (const file of files) {
      const index =
        this.files.findIndex(
          f =>
            f.fullPath === file.fullPath);

      if (index !== -1) {
        this.files.splice(
          index,
          1);
      }
    }

    this.notifyFilesChanged(
      { removed: files });
  }

  /**
   * Returns files that are equal or under the specified absolute or relative
   * filesystem path.
   */
  filesWithFilesystemPath(
      path: string
    ): IFile[]
  {
    const rootFullPath =
      resolve(this.root);

    const itemFullPath =
      resolve(rootFullPath, path);

    return this.files.filter(
      file =>
      {
        if (file.fullPath === itemFullPath) {
          return true;
        }

        const relativePath =
          relative(
            itemFullPath,
            file.fullPath);

        if (relativePath.startsWith('..')) {
          // the file path is outside of the knowledge base
          return false;
        }

        return true;
      });
  }

  /**
   * Filters out excluded and hidden (starting with `.`) files and folders.
   */
  isAccepted(
      file: string
    ): boolean
  {
    const fileFullPath =
      resolve(this.root, file);

    const relativePath =
      relative(this.root, fileFullPath);

    if (relativePath.startsWith('..')) {
      // the file path is outside of the knowledge base
      return false;
    }

    for (const pattern of Object.keys(this.exclude)) {
      if (minimatch(relativePath, pattern, { matchBase: true })) {
        return false;
      }
    }

    const relativePathItems = relativePath.split(sep);

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
   */
  createFile(
      path: string,
      modified: Date
    ): IFile | null
  {
    const fullPath =
      resolve(this.root, path);

    if (!this.isAccepted(fullPath)) {
      return null;
    }

    const relativePath =
      relative(this.root, fullPath);

    const name =
      basename(fullPath);

    const folderRelativePath =
      dirname(relativePath);

    const folder =
      '/' + (folderRelativePath === '.'
? ''
: folderRelativePath).replace(/\\/g, '/');

    return new File(
      fullPath,
      (folder === '/'
? ''
: folder) + '/' + name,
      modified);
  }

  private notifyFilesChanged(
      args: FilesChangedEventArgs
    ): void
  {
    const listeners =
      [...this.filesChangedListeners];

    for (const listener of listeners) {
      listener(args);
    }
  }
}
