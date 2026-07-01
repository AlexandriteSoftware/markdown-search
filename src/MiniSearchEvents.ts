export interface MiniSearchEvent
{
  event: string;
}

export interface IndexFile
  extends MiniSearchEvent
{
  event: 'index';
  path: string;
  root: string;
}

export function isIndexFile(
    object: MiniSearchEvent
  ): object is IndexFile
{
  return object.event === 'index';
}

export interface RemoveFile
  extends MiniSearchEvent
{
  event: 'remove';
  path: string;
  root: string;
}

export function isRemoveFile(
    object: MiniSearchEvent
  ): object is RemoveFile
{
  return object.event === 'remove';
}
