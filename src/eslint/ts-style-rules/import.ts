import { Rule }
  from 'eslint';
import { RuleDefinition,
         RuleDefinitionTypeOptions }
  from '@eslint/core';
import { ImportDeclaration,
         ImportSpecifier,
         ImportDefaultSpecifier,
         ImportNamespaceSpecifier,
         Literal,
         Identifier }
  from 'estree';

type Import =
  | ImportSpecifier
  | ImportDefaultSpecifier
  | ImportNamespaceSpecifier;

interface FormattingContext {
  newLine: string;
}

const ruleDefinition: RuleDefinition<RuleDefinitionTypeOptions> =
  { meta:
      { fixable: 'code' },
    create(
        context: Rule.RuleContext
      ): Rule.RuleListener
    {
      const listener: Rule.RuleListener =
        { ImportDeclaration(
              node: ImportDeclaration
            ): void
          {
            const newLine =
              context.sourceCode.text.includes('\r\n')
                ? '\r\n'
                : '\n';

            const formattingContext =
              { newLine };

            const sourceCode =
              context.sourceCode.getText(node);

            const replacement =
              formatImportNode(
                node,
                context,
                formattingContext);

            if (sourceCode === replacement) {
              return;
            }

            context.report(
              { node,
                message: 'Use asljs import style.',
                fix(
                    fixer: Rule.RuleFixer
                  ): Rule.Fix
                {
                  return fixer.replaceText(
                    node,
                    replacement);
                } });
          }
        };

      return listener;
    }
  };

export default ruleDefinition;

function formatImportNode(
    node: ImportDeclaration,
    context: Rule.RuleContext,
    formattingContext: FormattingContext
  ): string
{
  const code =
    [ 'import ' ];

  if (node.specifiers.length === 0) {
    const nodeRange =
      node.range;

    const sourceRange =
      node.source.range;

    if (
      nodeRange
      && sourceRange
    ) {
      const importPart =
        context.sourceCode.text.slice(
          nodeRange[0],
          sourceRange[0]);

      if (/^\s*import\s*$/.test(importPart)) {
        code.push(
          node.source?.raw
          || '');
        code.push(';');
      } else if (/^\s*import[\r\n\s]+from\s*$/.test(importPart)) {
        code.push(
          formattingContext.newLine);
        code.push('  from ');
        code.push(
          node.source?.raw
          || '');
        code.push(';');
      } else if (/^\s*import[\r\n\s]*\{[\r\n\s]*\}[\r\n\s]*from\s*$/.test(importPart)) {
        code.push('{ }');
        code.push(
          formattingContext.newLine);
        code.push('  from ');
        code.push(
          node.source?.raw
          || '');
        code.push(';');
      } else {
        code.push(
          formattingContext.newLine);

        code.push(
          formatSource(
            node.source,
            formattingContext));
      }
    } else {
      code.push('{ }');

      code.push(
        formatSource(
          node.source,
          formattingContext));
    }
  } else {
    let index = 0;
    let first = true;

    while (index < node.specifiers.length) {
      if (first) {
        first = false;
      } else {
        code.push(',');

        code.push(
          formattingContext.newLine);

        code.push('       ');
      }

      const importSpecifierGroup =
        getImportSpecifierGroup(
          node.specifiers,
          index);

      if (importSpecifierGroup.length === 0) {
        code.push(
          formatSpecifier(
            node.specifiers[index]));

        index++;
      } else {
        code.push(
          formatImportSpecifierGroup(
            importSpecifierGroup,
            formattingContext));

        index += importSpecifierGroup.length;
      }
    }

    code.push(
      formatSource(
        node.source,
        formattingContext));
  }

  return code.join('');
}

function getImportSpecifierGroup(
    specifiers: Import[],
    startAt: number
  ): ImportSpecifier[]
{
  const group = [];

  for (let index = startAt;
       index < specifiers.length;
       index++)
  {
    const specifier =
      specifiers[index];

    if (specifier.type !== 'ImportSpecifier') {
      break;
    }

    group.push(specifier);
  }

  return group;
}

function formatImportSpecifierGroup(
    importSpecifierGroup: ImportSpecifier[],
    formattingContext: FormattingContext
  ): string
{
  const code = [];

  let firstImportSpecifier = true;

  for (const specifier of importSpecifierGroup) {
    if (firstImportSpecifier) {
      firstImportSpecifier = false;
      code.push('{ ');
    } else {
      code.push(',');

      code.push(
        formattingContext.newLine);

      code.push('         ');
    }

    const importKind =
      (specifier as { importKind?: string }).importKind;

    const parent =
      (specifier as { parent?: any }).parent;

    const isType =
      importKind === 'type'
      || (parent?.type === 'ImportDeclaration'
          && parent.importKind === 'type');

    if (isType) {
      code.push(
        'type ');
    }

    if (specifier.imported.type === 'Identifier') {
      const importedIdentifier =
        specifier.imported as Identifier;

      if (importedIdentifier.name === specifier.local.name) {
        code.push(
          importedIdentifier.name);
      } else {
        code.push(
          `${importedIdentifier.name} as ${specifier.local.name}`);
      }
    } else if (specifier.imported.type === 'Literal') {
      const importedLiteral =
        specifier.imported as Literal;

      code.push(
        `${importedLiteral.raw} as ${specifier.local.name}`);
    } else {
      throw new Error(
        `Unsupported import specifier type.`);
    }
  }

  code.push(' }');

  return code.join('');
}

function formatSource(
    source: Literal,
    formattingContext: FormattingContext
  ): string
{
  return formattingContext.newLine
    + '  from '
    + source.raw
    + ';';
}

/**
 * Formats `ImportDefaultSpecifier` and `ImportNamespaceSpecifier`.
 * `ImportSpecifier` is handled by `formatImportSpecifierGroup`.
 */
function formatSpecifier(
    specifier: Import
  ): string
{
  switch (specifier.type) {
    case 'ImportDefaultSpecifier':
      return specifier.local.name;

    case 'ImportNamespaceSpecifier':
      return `* as ${specifier.local.name}`;

    default:
      throw new Error(
        `Unsupported import specifier type.`);
  }
}