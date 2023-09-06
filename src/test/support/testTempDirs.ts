import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { retry } from './controlFlowHelpers';

export function getTestTempRootDir()
{
  const dir = path.join(os.tmpdir(), 'test-markdown-search');
  fs.existsSync(dir) || fs.mkdirSync(dir);
  return dir;
}

export function getTestTempDir()
{
  return fs.mkdtempSync(getTestTempRootDir() + path.sep);
}

export async function removeTestTempRootDir()
{
  await retry(() => fsp.rm(getTestTempRootDir(), { recursive: true, force: true }));
}
