export interface IndexFile
{
  action: 'index';
  path: string;
  root: string;
}

export function isIndexFile
  (object: any)
  : object is IndexFile
{
  return object.action === 'index';
}

export interface RemoveFile
{
  action: 'remove';
  path: string;
  root: string;
}

export function isRemoveFile
  (object: any)
  : object is RemoveFile
{
  return object.action === 'remove';
}

export type MiniSearchCommand =
  IndexFile
  | RemoveFile;
