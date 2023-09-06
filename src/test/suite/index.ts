import path from 'path';
import Mocha from 'mocha';
import glob from 'glob';

export function run(): Promise<void>
{
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise((c, e) =>
  {
    glob('**/**.test.js', { cwd: testsRoot }, (err, files) =>
    {
      if (err) {
        return e(err);
      }

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
            e(new Error(`${failures} tests failed.`));
          } else {
            c();
          }
        });
      } catch (err) {
        console.error(err);
        e(err);
      }
    });
  });
}
