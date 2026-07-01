import fs
  from 'fs';
import fsp
  from 'fs/promises';
import os
  from 'os';
import path
  from 'path';
import { retry }
  from './controlFlowHelpers';

export function getTestTempRootDir(
  ): string
{
  const dir =
    path.join(
      os.tmpdir(),
      'test-markdown-search');

  (fs.existsSync(dir)
   || fs.mkdirSync(dir));

  return dir;
}

export function getTestTempDir(
  ): string
{
  return fs.mkdtempSync(
    getTestTempRootDir()
    + path.sep);
}

export async function removeTestTempRootDir(
  ): Promise<void>
{
  await retry(
    () =>
      fsp.rm(
        getTestTempRootDir(),
        { recursive: true,
          force: true }));
}
