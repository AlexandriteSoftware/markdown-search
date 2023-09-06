/** The event that is emitted when a folder is added to the editor. */
export interface FolderAddedEvent
{
  event: 'folder-added';

  /** An absolute path to the filesystem folder. */
  path: string;

  /** The exclude patterns for the folder. */
  exclude?: { [key: string]: boolean };
}

export function isFolderAddedEvent
  (object: any)
  : object is FolderAddedEvent
{
  return object.event === 'folder-added';
}

/** The event that is emitted when a folder is removed from the editor. */
export interface FolderRemovedEvent
{
  event: 'folder-removed';

  /** An absolute path to the filesystem folder. */
  path: string;
}

export function isFolderRemovedEvent
  (object: any)
  : object is FolderRemovedEvent
{
  return object.event === 'folder-removed';
}

/** The event that is emitted when a file is updated in the editor. */
export interface FileUpdatedEvent
{
  event: 'file-updated';

  /** An absolute path to the updated file. */
  path: string;
}

export function isFileUpdatedEvent
  (object: any)
  : object is FileUpdatedEvent
{
  return object.event === 'file-updated';
}

/** The event that is emitted when a file is deleted in the editor. */
export interface FileDeletedEvent
{
  event: 'file-deleted';

  /** An absolute path to the deleted file. */
  path: string;
}

export function isFileDeletedEvent
  (object: any)
  : object is FileDeletedEvent
{
  return object.event === 'file-deleted';
}

export type EditorEvent =
  FolderAddedEvent
  | FolderRemovedEvent
  | FileUpdatedEvent
  | FileDeletedEvent;
