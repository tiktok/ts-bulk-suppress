import ts, {
  CompilerHost,
  findConfigFile,
  getLineAndCharacterOfPosition,
  Node,
  SyntaxKind
} from 'typescript';
import {
  ProgramOptions,
  BulkConfig,
  ProjectStat,
  BulkSuppressor,
  StatisticsItem,
  DiagnosticTsc
} from './types';
import { BULK_CONFIG_SCHEMA, CI_CHANGED_FILES_PATH, DEFAULT_BULK_CONFIG, MONOREPO_ROOT } from './constant';
import Ajv from 'ajv';
import log from 'loglevel';
import fs from 'fs';
// import { Project, Node, SyntaxKind, ts } from 'ts-morph';
import path from 'path';
import { readJsonSync, writeJSONSync, existsSync } from 'fs-extra';
import { execSync } from 'child_process';

export function isAllowedNamedBlock(node: Node): boolean {
  log.debug(node.kind);
  const nodeKind = node.kind;

  const hasChildrenOfKind = (node: Node, syntaxKind: SyntaxKind): boolean => {
    const childrenNode = node.getChildren();

    return childrenNode.some((node) => node.kind === syntaxKind);
  };

  if (nodeKind === SyntaxKind.FunctionDeclaration) return true;
  if (nodeKind === SyntaxKind.ClassDeclaration) return true;

  if (nodeKind === SyntaxKind.MethodDeclaration) return true;

  if (nodeKind === SyntaxKind.PropertyDeclaration) {
    return (
      hasChildrenOfKind(node, SyntaxKind.ArrowFunction) ||
      hasChildrenOfKind(node, SyntaxKind.FunctionExpression) ||
      hasChildrenOfKind(node, SyntaxKind.ClassExpression) ||
      hasChildrenOfKind(node, SyntaxKind.ObjectLiteralExpression)
    );
  }

  if (nodeKind === SyntaxKind.PropertyAssignment) {
    return (
      hasChildrenOfKind(node, SyntaxKind.ArrowFunction) ||
      hasChildrenOfKind(node, SyntaxKind.FunctionExpression) ||
      hasChildrenOfKind(node, SyntaxKind.ClassExpression) ||
      hasChildrenOfKind(node, SyntaxKind.ObjectLiteralExpression)
    );
    // if (node.getChildrenOfKind(SyntaxKind.ArrayLiteralExpression).length) return true; // Remove array
  }

  if (nodeKind === SyntaxKind.VariableDeclaration) {
    return (
      hasChildrenOfKind(node, SyntaxKind.ArrowFunction) ||
      hasChildrenOfKind(node, SyntaxKind.FunctionExpression) ||
      hasChildrenOfKind(node, SyntaxKind.ClassExpression) ||
      hasChildrenOfKind(node, SyntaxKind.ObjectLiteralExpression)
    );
  }

  if (nodeKind === SyntaxKind.TypeAliasDeclaration) return true;
  if (nodeKind === SyntaxKind.InterfaceDeclaration) return true;
  if (nodeKind === SyntaxKind.EnumDeclaration) return true;
  if (nodeKind === SyntaxKind.ModuleDeclaration) return true;

  return false;
}

export function findDiagnosticsScopeId(d: DiagnosticTsc, isStrictScope: boolean): string {
  const sourceFile = d.file;
  const startPos = d.start;
  const length = d.length;
  if (sourceFile === undefined) {
    throw Error('Diagnostic without sourcefile found, no identifier will be found');
  }
  if (startPos === undefined) {
    throw Error('Diagnostic without start found, no identifier will be found');
  }
  if (length === undefined) {
    throw Error('Diagnostic without length found, no identifier will be found');
  }

  log.debug(`Diagnostic ${d.code} ${d.file?.fileName} ${d.start} ${d.length}`);

  const childrenNodes: Node[] = [sourceFile];
  const results: string[] = [];
  const diagnosticStart = startPos;
  const diagnosticEnd = startPos + length;

  while (childrenNodes.length) {
    const curNode = childrenNodes.pop() as Node;
    const pos = curNode.getStart();
    const end = curNode.getEnd();

    if (!(pos <= diagnosticStart && end >= diagnosticEnd)) continue;

    if (isStrictScope || isAllowedNamedBlock(curNode)) {
      const identifiersOfNode = curNode.getChildren().filter((node) => node.kind === SyntaxKind.Identifier);

      if (identifiersOfNode.length) {
        results.push(identifiersOfNode.map((id) => id.getText()).join('.'));
      }
    }

    curNode.forEachChild((node) => {
      childrenNodes.push(node);
    });
  }

  log.debug(results);

  return `.${results.join('.')}`;
}

// if stdout is being piped to another destination, print diagnostics
// without pretty colours. This matches the behaviour of TSC:
// https://github.com/microsoft/TypeScript/blob/0652664e/src/compiler/executeCommandLine.ts#L161
const formatDiagnostics =
  process.env.NO_COLOR || !process.stdout.isTTY
    ? ts.formatDiagnostics
    : ts.formatDiagnosticsWithColorAndContext;

export function assertDiagnostics(
  configRelatedErrors: readonly DiagnosticTsc[],
  projectErrors: readonly DiagnosticTsc[],
  externalErrors: readonly DiagnosticTsc[],
  host: CompilerHost,
  bulkConfig?: BulkConfig,
  projectStat?: ProjectStat
): number {
  const diagnostics = [...configRelatedErrors, ...projectErrors, ...externalErrors];

  if (!diagnostics.length) {
    return 0;
  }
  if (!bulkConfig) {
    log.info(formatDiagnostics(diagnostics, host));
    return diagnostics.length;
  }

  const suppressedDiagnostics: DiagnosticTsc[] = [];
  const diagnosticsToShow: DiagnosticTsc[] = [];

  log.debug(diagnostics);

  if (!projectStat) throw Error('Missing project stat item');

  for (const d of diagnostics) {
    if (d.errorType === 'configRelated' && bulkConfig.ignoreConfigError) continue;
    if (d.errorType === 'external' && bulkConfig.ignoreExternalError) continue;

    if (d.errorType === 'project' && isSuppressed(bulkConfig, d, projectStat.statItems)) {
      suppressedDiagnostics.push(d);
      continue;
    }

    diagnosticsToShow.push(d);
  }

  if (diagnosticsToShow.length) {
    diagnosticsToShow.forEach((d) => {
      let line: number | undefined, col: number | undefined, filename: string | undefined;
      const { file, start, length, code, messageText } = d;
      if (file && start && length) {
        const res = getLineAndCharacterOfPosition(file, start + length);
        line = res.line;
        col = res.character;
      }
      const dStat = {
        filename,
        line,
        col,
        code,
        message: ['']
      };

      if (typeof messageText === 'string') {
        dStat.message = [messageText];
      } else {
        dStat.message = [messageText.messageText];
      }

      if (d.errorType === 'project') projectStat.projectErrors.push(dStat);
      else if (d.errorType === 'configRelated') projectStat.configRelatedErrors.push(dStat);
      else if (d.errorType === 'external') projectStat.externalErrors.push(dStat);
      else projectStat.externalErrors.push(dStat);
    });

    const formattedLog = formatDiagnostics(diagnosticsToShow, host);

    projectStat.raw = formattedLog;

    log.info(formattedLog);

    return 2;
  }

  return 0;
}

export function isSuppressed(bulkConfig: BulkConfig, d: DiagnosticTsc, stats?: StatisticsItem[]): boolean {
  const { patternSuppressors: patterns, bulkSuppressors: bulks } = bulkConfig;

  const { relativeFilepath, code } = d;

  if (!relativeFilepath) return false;

  //Pattern based suppress
  for (const config of patterns) {
    const regex = new RegExp(config.pathRegExp);
    if (!regex.test(relativeFilepath)) continue;

    if (config.suppressAll || config.codes?.includes(code)) {
      const statItem = stats?.find((stat) => {
        if (stat.type !== 'pattern') return false;
        if (stat.pathRegExp !== config.pathRegExp) return false;
        if (!config.suppressAll && stat.code !== code) return false;
        return true;
      });

      if (!statItem) {
        throw Error('Suppressed by unknown suppressor.');
      }

      statItem.total++;

      return true;
    }
  }

  //Bulk Suppress
  const scopeId = findDiagnosticsScopeId(d, !!bulkConfig.strictScope);
  const matchedSuppressor = bulks.find(
    (bulk) => bulk.filename === relativeFilepath && bulk.scopeId === scopeId && bulk.code === code
  );
  if (matchedSuppressor) {
    const statItem = stats?.find((stat) => {
      if (stat.type !== 'bulk') return false;
      return stat.filename === relativeFilepath && stat.scopeId === scopeId && stat.code === code;
    });

    if (!statItem) {
      throw Error('Suppressed by unknown suppressor.');
    }

    statItem.total++;

    return true;
  }

  //Not suppressed
  return false;
}

export function createTsBulkSuppress(diagnostics: DiagnosticTsc[], bulkConfig: BulkConfig): BulkSuppressor[] {
  return diagnostics.map((d) => {
    const { relativeFilepath } = d;
    if (!relativeFilepath) throw Error('Cannot create suppress config for this diagnostic');
    return {
      filename: relativeFilepath,
      scopeId: findDiagnosticsScopeId(d, !!bulkConfig.strictScope),
      code: d.code
    };
  });
}

export function parseBulkConfig(config: object): BulkConfig {
  const ajv = new Ajv();
  const validator = ajv.compile(BULK_CONFIG_SCHEMA);

  if (!validator(config)) {
    console.log(validator.errors);
    throw Error('Config does not follow suppress schema');
  }

  return config;
}

export function createDefaultIgnore(): void {
  fs.writeFileSync('.ts-bulk-suppressions.json', JSON.stringify(DEFAULT_BULK_CONFIG, null, 2));
}

export function categorizeDiagnostics(
  diagnostics: DiagnosticTsc[],
  projectRoot: string
): {
  configRelatedErrors: DiagnosticTsc[];
  projectErrors: DiagnosticTsc[];
  externalErrors: DiagnosticTsc[];
} {
  const configRelatedErrors: DiagnosticTsc[] = [];
  const projectErrors: DiagnosticTsc[] = [];
  const externalErrors: DiagnosticTsc[] = [];

  for (const d of diagnostics) {
    if (d.category !== ts.DiagnosticCategory.Error) continue;

    const sourceFileNode = d.file;

    if (!sourceFileNode) {
      d.errorType = 'configRelated';
      configRelatedErrors.push(d);
      continue;
    }

    const { fileName } = sourceFileNode;
    d.relativeFilepath = path.relative(projectRoot, fileName);

    if (
      !path.isAbsolute(d.relativeFilepath) && // Not a absolute path
      !d.relativeFilepath.startsWith('../') && // Not a path with ../
      !d.relativeFilepath.includes('node_modules') // Not a node_modules path
    ) {
      d.errorType = 'project';
      projectErrors.push(d);
    } else {
      d.errorType = 'external';
      externalErrors.push(d);
    }
  }

  return {
    configRelatedErrors,
    projectErrors,
    externalErrors
  };
}

export function deduplicateSuppressors(suppressors: BulkSuppressor[]): BulkSuppressor[] {
  const set = new Set<string>();

  const uniqueSuppressors = suppressors.filter((suppressor) => {
    const suppressStr = `${suppressor.code}.${suppressor.filename}.${suppressor.scopeId}`;

    if (!set.has(suppressStr)) {
      set.add(suppressStr);
      return true;
    }
    return false;
  });

  return uniqueSuppressors;
}

export function getBulkConfig(options: ProgramOptions): {
  mergedConfig: BulkConfig & ProgramOptions;
  configFromFile: BulkConfig;
} {
  const configPath =
    options.config ?? findConfigFile(process.cwd(), ts.sys.fileExists, '.ts-bulk-suppressions.json');

  if (!configPath || !existsSync(configPath)) {
    if (options.genBulkSuppress) {
      const tsconfigFilePath = findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
      if (!tsconfigFilePath || !existsSync(tsconfigFilePath)) {
        throw Error(
          'Unable to locate tsconfig.json and .ts-bulk-suppressions.json, please cd to your project root and run again'
        );
      }

      const dirname = path.dirname(tsconfigFilePath);

      writeJSONSync(path.resolve(dirname, '.ts-bulk-suppressions.json'), DEFAULT_BULK_CONFIG);

      return {
        mergedConfig: {
          ...DEFAULT_BULK_CONFIG,
          ...options,
          project: path.resolve(tsconfigFilePath),
          config: path.resolve(dirname, '.ts-bulk-suppressions.json')
        },
        configFromFile: DEFAULT_BULK_CONFIG
      };
    }
    throw Error(
      'Unable to locate .ts-bulk-suppressions.json. cd to your where your tsconfig.json locates and run npx ts-bulk-suppress --create-default.'
    );
  }

  const configFromFile = parseBulkConfig(readJsonSync(configPath));

  return {
    mergedConfig: {
      ...configFromFile,
      ...options,
      project: path.resolve(configFromFile.project),
      config: path.resolve(configPath)
    },
    configFromFile
  };
}

export function initStatItem(configFromFile: BulkConfig): StatisticsItem[] {
  const patternStats = configFromFile.patternSuppressors.flatMap(({ pathRegExp, suppressAll, codes }) => {
    if (suppressAll) {
      return [
        {
          type: 'pattern' as const,
          pathRegExp,
          code: -1,
          total: 0
        }
      ];
    }

    return (
      codes?.map((code) => {
        return {
          type: 'pattern' as const,
          pathRegExp,
          code,
          total: 0
        };
      }) ?? []
    );
  });

  const bulkStats = configFromFile.bulkSuppressors.map(({ filename, scopeId, code }) => ({
    type: 'bulk' as const,
    filename,
    scopeId,
    code,
    total: 0
  }));
  return [...bulkStats, ...patternStats];
}

/**
 *
 * @param should returnabsolute
 * @param filterDeleted
 * @param targetBranch
 * @returns change files of MR
 */
export const getChangedFiles = (
  absolute: boolean,
  filterDeleted: boolean,
  targetBranch: string = 'master'
): string[] => {
  try {
    let result: string[] = [];
    if (process.env.IS_CODEBASE_CI) {
      const filePathRaw = fs.readFileSync(path.resolve(CI_CHANGED_FILES_PATH)).toString();
      result = JSON.parse(filePathRaw);
    } else {
      const mergeBase = execSync(`git merge-base HEAD origin/${process.env.TARGET_BRANCH || targetBranch}`, {
        encoding: 'utf-8',
        cwd: MONOREPO_ROOT
      });
      const filePathRaw = execSync(`git diff -z --relative --diff-filter=d --name-only ${mergeBase}`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        cwd: MONOREPO_ROOT
      });
      result = filePathRaw.split('\0').filter((str) => str);
    }

    if (absolute) {
      result = result.map((file) => path.resolve(MONOREPO_ROOT, file));
    }
    if (filterDeleted) {
      result = result.filter((file) => fs.existsSync(file));
    }

    return result;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
