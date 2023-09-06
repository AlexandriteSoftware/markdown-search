import path from 'path';
import fs from 'fs/promises';
import
{
  removeTestTempRootDir,
  getTestTempDir
} from './support/testTempDirs';
import { runTests } from '@vscode/test-electron';

async function main()
{
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to test runner
    // Passed to `--extensionTestsPath`
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    const launchArgs = [];

    // disable all extensions (except tested) while running the tests
    launchArgs.push('--disable-extensions');

    // update the workspace folder
    const tempDir = getTestTempDir();
    const name = path.basename(tempDir);
    fs.writeFile(
      path.join(__dirname, '../../.vscode-test/user-data/Workspaces/1694127446586/workspace.json'),
      JSON.stringify({ "folders": [{ "name": name, "path": tempDir }] }));

    const options = {
      version: '1.80.0',
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs
    };

    // Download VS Code, unzip it and run the integration test
    await runTests(options);
  } catch (err) {
    console.error('Failed to run tests', err);
    process.exit(1);
  } finally {
    await removeTestTempRootDir();
  }
}

main();
