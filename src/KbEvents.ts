export interface KbEvent
{
  event: string

  /** An absolute path to the filesystem folder that is a root of the knowledge base. */
  root: string;
}

/** The event that is emitted when a knowledge base becomes available. */
export interface KbAddedEvent
  extends KbEvent
{
  event: 'kb-added';

  /** The exclude patterns for the folder. */
  exclude?: { [key: string]: boolean };

  /** List of paths to the knowledge base files. */
  files: string[];
}

export function isKbAddedEvent(
    object: KbEvent
  ): object is KbAddedEvent
{
  return object.event === 'kb-added';
}

/** The event that is emitted when a knowledge base is no longer available. */
export interface KbRemovedEvent
  extends KbEvent
{
  event: 'kb-removed';

  /** List of paths to the knowledge base files. */
  files: string[];
}

export function isKbRemovedEvent(
    object: KbEvent
  ): object is KbRemovedEvent
{
  return object.event === 'kb-removed';
}

/** The event that is emitted when a new knowledge base file is discovered. */
export interface KbFileAddedEvent
  extends KbEvent
{
  event: 'kb-file-added';

  /** An absolute path to the file from the workspace folder, e.g. `/project/readme.md`. */
  path: string;
}

export function isKbFileAddedEvent(
    object: KbEvent
  ): object is KbFileAddedEvent
{
  return object.event === 'kb-file-added';
}

/** The event that is emitted when a knowledge base file is updated (modified). */
export interface KbFileUpdatedEvent
  extends KbEvent
{
  event: 'kb-file-updated';

  /** An absolute path to the file from the workspace folder, e.g. `/project/readme.md`. */
  path: string;
}

export function isKbFileUpdatedEvent(
    object: KbEvent
  ): object is KbFileUpdatedEvent
{
  return object.event === 'kb-file-updated';
}

/** The event that is emitted when a knowledge base file is no longer available. */
export interface KbFileRemovedEvent
  extends KbEvent
{
  event: 'kb-file-removed';

  /** An absolute path to the file from the workspace folder, e.g. `/project/readme.md`. */
  path: string;
}

export function isKbFileRemovedEvent(
    object: KbEvent
  ): object is KbFileRemovedEvent
{
  return object.event === 'kb-file-removed';
}
