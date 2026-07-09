import js
  from '@eslint/js';
import tsParser
  from '@typescript-eslint/parser';
import { Linter }
  from 'eslint';
import tseslint
  from 'typescript-eslint';
import tsImportStyleRule
  from './ts-style-rules/import.js';

const ignores: Linter.Config =
  { ignores:
      [ '**/dist/**',
        '**/build/**',
        '**/.tests/**',
        '**/node_modules/**' ] };

const typescriptConfig: Linter.Config =
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      asljs: {
        rules: {
          'import-style': tsImportStyleRule
        }
      }
    },
    rules: {
      indent: 'off',
      semi: [
        'error',
        'always'
      ],
      eqeqeq: [
        'error',
        'always'
      ],
      'prefer-const': 'error',
      'no-var': 'error',
      'function-call-argument-newline': ['error', 'consistent'],
      'nonblock-statement-body-position': [
        'error',
        'below'
      ],
      'multiline-ternary': ['error', 'always'],
      'operator-linebreak': [
        'error',
        'before',
        {
          overrides: {
            '=': 'after',
            '&&': 'before',
            '||': 'before',
            '?': 'before',
            ':': 'before'
          }
        }
      ],
      'quotes': [
        'error',
        'single',
        {
          avoidEscape: true,
          allowTemplateLiterals: true
        }
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          // Enforce explicit return types on declared functions/methods,
          // but avoid making every inline callback noisy.
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true
        }
      ],
      'asljs/import-style': 'error'
    }
  };

const javascriptConfig: Linter.Config =
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      ...js.configs.recommended.rules,
      semi: [
        'error',
        'always'
      ],
      eqeqeq: [
        'error',
        'always'
      ],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-duplicate-imports': 'error',
      'function-call-argument-newline': [
        'error',
        'consistent'
      ],
      'nonblock-statement-body-position': [
        'error',
        'below',
      ],
      'multiline-ternary': [
        'error',
        'always'
      ],
      'operator-linebreak': [
        'error',
        'before',
        {
          overrides: {
            '=': 'after',
            '&&': 'before',
            '||': 'before',
            '?': 'before',
            ':': 'before'
          }
        }
      ],
      'quotes': [
        'error',
        'single',
        {
          avoidEscape: true,
          allowTemplateLiterals: true
        }
      ],
      'asljs/import-style': 'error',
      'asljs/function-declaration-style': 'error',
      'asljs/call-expression-style': 'error',
      'asljs/variable-declaration-style': 'error',
      'asljs/statement-spacing': 'error'
    }
  };

const configs: Linter.Config[] =
  [ ignores,
    typescriptConfig,
    javascriptConfig ];

export default configs;
