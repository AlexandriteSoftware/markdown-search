import path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void>
{
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true
  });

  const testsRoot = path.resolve(__dirname, '..');

  const files =
    await glob(
      '**/**.test.js',
      { cwd: testsRoot });

  // Add files to the test suite
  files
    //.filter(f => -1 !== f.indexOf('translateWorkspaceToEditorEvents'))
    .map(f => path.resolve(testsRoot, f))
    .forEach(f => mocha.addFile(f));

  try {
    // Run the mocha test
    mocha.run(failures =>
    {
      if (failures > 0) {
        throw new Error(`${failures} tests failed.`);
      }
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
}
