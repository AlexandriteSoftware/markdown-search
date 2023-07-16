import fsp from 'fs/promises';
import path from 'path';
import minimatch from 'minimatch';

const modules = { path };

export type Exclusions = { [key: string]: boolean };

/** Represents a file in the knowledge base */
export interface IFile {

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

  /** Modification datetime of the file, as returned by the filesystem. */
  modified: Date;

  /** Reads the file's content as text. */
  readText(): Promise<string | null>;
}

export class File implements IFile {
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
   * @param fsPath Absolute path to the file from the filesystem root, e.g. `c:\kb\project\readme.md`.
   * @param kbPath Absolute path to the file from the knowledge base root, e.g. `/project/readme.md`.
   * @param modified Datetime of the file's last modification.
   */
  constructor(fsPath: string, kbPath: string, modified: Date) {
    this.fullPath = fsPath;
    this.path = kbPath;
    this.modified = modified;

    this.folder = path.dirname(kbPath);

    const name = path.basename(fsPath);
    const extension = path.extname(name);

    this.basename = name;
    this.extension = extension;

    let type = 'other';
    if (extension.toUpperCase() === '.MD') {
      type = 'markdown';
    }
    this.type = type;
  }

  async readText(): Promise<string | null> {
    let content: string | null = null;
    try {
      content = await fsp.readFile(this.fullPath, { encoding: 'utf8' });
    } catch {
      // ignore
    }
    return content;
  }
}

/** Contains either removed or added files. */
export interface FilesChangedEventArgs {
  removed?: IFile[];
  added?: IFile[];
}

/** Represents a knowldge base, which is a folder with markdown files. */
export interface IKnowledgeBase {

  /** Absolute path to the knowledge base's root folder. */
  root: string;

  /** Excluded files and folders. */
  exclude: Exclusions;

  /** This knowledge base's files. */
  files: IFile[];

  /** The provided listener will be notified when the list of files is changed. */
  onFilesChanged: (listener: (files: FilesChangedEventArgs) => void) => (() => void);

  /** Adds files to the knowledge base and notifies listeners. */
  addFiles(files: File[]): void;

  /** Removes files from the knowledge base and notifies listeners. */
  removeFiles(files: File[]): void;

  /** Returns files that are equal or under the specified absolute or relative filesystem path. */
  filesWithFilesystemPath(path: string): IFile[];

  /** Filters out excluded and hidden (starting with `.`) files and folders. */
  isAccepted(file: string): boolean;

  /** Creates a new file record. */
  createFile(path: string, modified: Date): IFile | null;
}

export class KnowledgeBase implements IKnowledgeBase {
  root: string;
  exclude: Exclusions;
  files: IFile[];
  onFilesChanged: (listener: (files: FilesChangedEventArgs) => void) => () => void;
  filesChangedListeners: ((args: FilesChangedEventArgs) => void)[] = [];

  constructor(root: string, exclude?: Exclusions) {
    this.root = modules.path.resolve(root);
    this.exclude = exclude || {};
    this.files = [];

    this.onFilesChanged = (listener: (files: FilesChangedEventArgs) => void) => {
      this.filesChangedListeners.push(listener);
      return () => {
        const index = this.filesChangedListeners.indexOf(listener);
        if (index > -1) {
          this.filesChangedListeners.splice(index, 1);
        }
      };
    };
  }

  addFiles(files: File[]) {
    for (const file of files) {
      if (!this.isAccepted(file.fullPath)) {
        throw new Error(`The file ${file.fullPath} is not accepted.`);
      }
    }

    for (const file of files) {
      const existing = this.files.find(f => f.fullPath === file.fullPath);
      if (existing) {
        this.files[this.files.indexOf(existing)] = file;
      } else {
        this.files.push(file);
      }
    }

    this.notifyFilesChanged({ added: files });
  }

  removeFiles(files: File[]) {
    for (const file of files) {
      const existing = this.files.find(f => f.fullPath === file.fullPath);
      if (existing) {
        this.files.splice(this.files.indexOf(existing), 1);
      }
    }

    this.notifyFilesChanged({ removed: files });
  }

  /** Returns files that are equal or under the specified absolute or relative filesystem path. */
  filesWithFilesystemPath(path: string) {
    const rootFullPath = modules.path.resolve(this.root);
    const itemFullPath = modules.path.resolve(rootFullPath, path);

    return this.files.filter(file => {
      if (file.fullPath === itemFullPath) {
        return true;
      }

      const relativePath = modules.path.relative(itemFullPath, file.fullPath);
      if (relativePath.startsWith('..')) {
        // the file path is outside of the knowledge base
        return false;
      }

      return true;
    });
  }

  /** Filters out excluded and hidden (starting with `.`) files and folders. */
  isAccepted(file: string): boolean {
    const fileFullPath = path.resolve(this.root, file);

    const relativePath = path.relative(this.root, fileFullPath);
    if (relativePath.startsWith('..')) {
      // the file path is outside of the knowledge base
      return false;
    }

    for (const pattern of Object.keys(this.exclude)) {
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

  /** Constructs knowledge base file info. */
  createFile(path: string, modified: Date): IFile | null {
    const fullPath = modules.path.resolve(this.root, path);

    if (!this.isAccepted(fullPath)) {
      return null;
    }

    const relativePath = modules.path.relative(this.root, fullPath);
    const name = modules.path.basename(fullPath);
    const folderRelativePath = modules.path.dirname(relativePath);
    const folder = '/' + (folderRelativePath === '.' ? '' : folderRelativePath).replace(/\\/g, '/');

    return new File(
      fullPath,
      (folder === '/' ? '' : folder) + '/' + name,
      modified);
  }

  private notifyFilesChanged(args: FilesChangedEventArgs) {
    const listeners = [...this.filesChangedListeners];
    for (const listener of listeners) {
      listener(args);
    }
  }
}
