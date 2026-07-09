import fs
  from 'node:fs/promises';
import path
  from 'node:path';
import test
  from 'node:test';
import assert
  from 'node:assert/strict';
import { marked,
         Tokens }
  from 'marked';
import { ESLint }
  from 'eslint';

async function findPackageRootDir(
    dir: string
  ): Promise<string>
{
  while (true) {
    const packageJsonPath =
      path.join(
        dir,
        'package.json');
  
    try {
      await fs.access(
        packageJsonPath,
        fs.constants.F_OK);
    } catch (err) {
      const parentDir =
        path.dirname(dir);

      if (parentDir === dir) {
        throw new Error(
          `Could not find package.json in any parent directory of ${dir}`);
      }

      dir =
        parentDir;

      continue;
    }

    break;
  }

  return dir;
}

export async function addRuleTestsFromMarkdown(
    filePath: string,
    eslint: ESLint
  ): Promise<void>
{
  const packageRootDir =
    await findPackageRootDir(
      filePath);

  const buildDir =
    path.join(
      packageRootDir,
      'build');

  const relativeFilePath =
    path.relative(
      buildDir,
      filePath);

  const relativeTestsFilePath =
    relativeFilePath.replace(
      /\.test\.(js|ts)$/,
      '.md');
  
  const srcDir =
    path.join(
      packageRootDir,
      'src');

  const testsFilePath =
    path.join(
      srcDir,
      relativeTestsFilePath);

  const testCases =
    await extractTests(testsFilePath);

  for (const testCase of testCases) {
    const sourceJson =
      JSON.stringify(
        testCase.source);

    test(
      `${relativeTestsFilePath}: ${sourceJson}`,
      async () => {
        const [ result ] =
          await eslint.lintText(
            testCase.source);

        if (testCase.source === testCase.expected) {
          assert.strictEqual(
            result.output,
            undefined);
        } else {
          assert.strictEqual(
            result.output,
            testCase.expected);
        }
      });
  }
}

export async function extractTests(
    filePath: string
  ): Promise<{ source: string; expected: string; tags: string[] }[]>
{
  const markdown =
    await fs.readFile(
      filePath,
      'utf8');
  
  const tokens =
    marked.lexer(markdown);

  let inTests = false;

  const tests =
    [];

  for (
    let index = 0;
    index < tokens.length;
    index++)
  {
    const token =
      tokens[index];

    if (token.type === 'heading') {
      if (token.depth === 2
          && token.text === 'Tests')
      {
        inTests = true;
        continue;
      }

      if (inTests
          && token.depth <= 2)
      {
        break;
      }
    }

    if (
      !inTests
      || token.type !== 'code')
    {
      continue;
    }

    const code =
      token as Tokens.Code;

    const tags =
      (code.lang ?? '').split(/\s+/);

    const parts =
      code.text.split(
        /\r?\n\/\/ ---\r?\n/g);

    tests.push(
      { source: parts[0],
        expected: parts[1],
        tags: tags });
  }

  const focusedTests =
    tests.filter(
      testCase =>
        testCase.tags.includes('focus'));

  if (focusedTests.length > 0) {
    return focusedTests;
  }

  return tests;
}