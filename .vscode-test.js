import { defineConfig }
  from '@vscode/test-cli';

export default defineConfig(
  { files: 'build/**/*.vscode-test.js' });