export interface EditorEvent
{
  event: string
}

/**
 * The event that is emitted when a folder is added to the editor.
 */
export interface FolderAddedEvent
  extends EditorEvent
{
  event: 'folder-added';

  /**
   * An absolute path to the filesystem folder.
   */
  path: string;

  /**
   * The exclude patterns for the folder.
   */
  exclude?: Record<string, boolean>;
}

export function isFolderAddedEvent(
    object: EditorEvent
  ): object is FolderAddedEvent
{
  return object.event === 'folder-added';
}

/**
 * The event that is emitted when a folder is removed from the editor.
 */
export interface FolderRemovedEvent
  extends EditorEvent
{
  event: 'folder-removed';

  /**
   * An absolute path to the filesystem folder.
   */
  path: string;
}

export function isFolderRemovedEvent(
    object: EditorEvent
  ): object is FolderRemovedEvent
{
  return object.event === 'folder-removed';
}

/**
 * The event that is emitted when a file is updated in the editor.
 */
export interface FileUpdatedEvent
  extends EditorEvent
{
  event: 'file-updated';

  /**
   * An absolute path to the updated file.
   */
  path: string;
}

export function isFileUpdatedEvent(
    object: EditorEvent
  ): object is FileUpdatedEvent
{
  return object.event === 'file-updated';
}

/**
 * The event that is emitted when a file is deleted in the editor.
 */
export interface FileDeletedEvent
  extends EditorEvent
{
  event: 'file-deleted';

  /**
   * An absolute path to the deleted file.
   */
  path: string;
}

export function isFileDeletedEvent(
    object: EditorEvent
  ): object is FileDeletedEvent
{
  return object.event === 'file-deleted';
}
