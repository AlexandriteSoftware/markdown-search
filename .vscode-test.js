import { defineConfig }
  from '@vscode/test-cli';

export default defineConfig(
  { files: 'out/**/*.vscode-test.js' });