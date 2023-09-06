/** The event that is emitted when a knowledge base becomes available. */
export interface KbAddedEvent
{
  event: 'kb-added';

  /** An absolute path to the filesystem folder that is a root of the knowledge base. */
  root: string;

  /** The exclude patterns for the folder. */
  exclude?: { [key: string]: boolean };

  /** List of paths to the knowledge base files. */
  files: string[];
}

export function isKbAddedEvent
  (object: any)
  : object is KbAddedEvent
{
  return object.event === 'kb-added';
}

/** The event that is emitted when a knowledge base is no longer available. */
export interface KbRemovedEvent
{
  event: 'kb-removed';

  /** An absolute path to the filesystem folder. */
  root: string;

  /** List of paths to the knowledge base files. */
  files: string[];
}

export function isKbRemovedEvent
  (object: any)
  : object is KbRemovedEvent
{
  return object.event === 'kb-removed';
}

/** The event that is emitted when a new knowledge base file is discovered. */
export interface KbFileAddedEvent
{
  event: 'kb-file-added';

  /** An absolute path to the file from the workspace folder, e.g. `/project/readme.md`. */
  path: string;

  /** An absolute path to the filesystem folder that is a root of the knowledge base. */
  root: string;
}

export function isKbFileAddedEvent
  (object: any)
  : object is KbFileAddedEvent
{
  return object.event === 'kb-file-added';
}

/** The event that is emitted when a knowledge base file is updated (modified). */
export interface KbFileUpdatedEvent
{
  event: 'kb-file-updated';

  /** An absolute path to the file from the workspace folder, e.g. `/project/readme.md`. */
  path: string;

  /** An absolute path to the filesystem folder that is a root of the knowledge base. */
  root: string;
}

export function isKbFileUpdatedEvent
  (object: any)
  : object is KbFileUpdatedEvent
{
  return object.event === 'kb-file-updated';
}

/** The event that is emitted when a knowledge base file is no longer available. */
export interface KbFileRemovedEvent
{
  event: 'kb-file-removed';

  /** An absolute path to the file from the workspace folder, e.g. `/project/readme.md`. */
  path: string;

  /** An absolute path to the filesystem folder that is a root of the knowledge base. */
  root: string;
}

export function isKbFileRemovedEvent
  (object: any)
  : object is KbFileRemovedEvent
{
  return object.event === 'kb-file-removed';
}

export type KbEvent =
  KbAddedEvent
  | KbRemovedEvent
  | KbFileAddedEvent
  | KbFileUpdatedEvent
  | KbFileRemovedEvent;
