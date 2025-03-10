import { program } from 'commander';
import type { ProgramOptions, DiagnosticTsc, ProjectStat } from './types';
import {
  assertDiagnostics,
  createDefaultIgnore,
  createTsBulkSuppress,
  categorizeDiagnostics,
  deduplicateSuppressors,
  getBulkConfig,
  initStatItem,
  getChangedFiles
} from './tsc-bulk';
import log from 'loglevel';

import ts from 'typescript';

import path from 'path';

import { writeJSONSync, readFileSync } from 'fs-extra';

function main(options: ProgramOptions): void {
  log.setLevel('INFO');
  if (options.verbose) {
    log.setLevel('DEBUG');
  }
  log.debug(process.cwd());
  log.debug(options);
  // // TEMPORARY WORKAROUND: use workspace typescript version by default
  // // @ts-ignore
  // //eslint-disable-next-line no-import-assign, @typescript-eslint/no-require-imports
  // ts = require(path.resolve(options.compiler));

  log.info(`Using TypeScript compiler version ${ts.version}`);

  if (options.createDefault) {
    log.info(`Create default .ts-bulk-suppressions.json at ${process.cwd()}`);
    createDefaultIgnore();
    return;
  }

  const { mergedConfig, configFromFile } = getBulkConfig(options);
  //NOTE: Let's assume projectRoot is tsconfig's dir
  const projectRoot = path.dirname(mergedConfig.project);

  let totalDiagnostic: DiagnosticTsc[] = [];

  const configObject = ts.parseConfigFileTextToJson(
    mergedConfig.project,
    readFileSync(mergedConfig.project).toString()
  );

  totalDiagnostic = totalDiagnostic.concat(configObject.error ?? []);

  const configParseResult = ts.parseJsonConfigFileContent(
    configObject.config,
    ts.sys,
    projectRoot,
    undefined,
    mergedConfig.project
  );

  totalDiagnostic = totalDiagnostic.concat(configParseResult.errors);

  const compilerOption: ts.CompilerOptions = {
    ...configParseResult.options,
    noEmit: true,
    emitDeclarationOnly: false
  };

  const compilerHost = ts.createCompilerHost(compilerOption);
  const programOptions = {
    rootNames: configParseResult.fileNames,
    options: compilerOption,
    projectReferences: configParseResult.projectReferences,
    host: compilerHost,
    configFileParsingDiagnostics: ts.getConfigFileParsingDiagnostics(configParseResult)
  };
  const program = ts.createProgram(programOptions);

  if (mergedConfig.changed) {
    const changedFiles = getChangedFiles(true, true);

    // const targetSources = project.getSourceFiles().filter((source) => changedFiles.includes(source.getFilePath()));
    const targetSources = program.getSourceFiles().filter((source) => changedFiles.includes(source.fileName));
    const diagnostics = targetSources.flatMap((source) => ts.getPreEmitDiagnostics(program, source));
    totalDiagnostic = totalDiagnostic.concat(diagnostics);
  } else if (mergedConfig.files?.length) {
    const absoluteFilePaths = mergedConfig.files.map((file) => path.resolve(file));
    const targetSources = program
      .getSourceFiles()
      .filter((source) => absoluteFilePaths.includes(source.fileName));
    const diagnostics = targetSources.flatMap((source) => ts.getPreEmitDiagnostics(program, source));

    totalDiagnostic = totalDiagnostic.concat(diagnostics);
  } else {
    totalDiagnostic = totalDiagnostic.concat(ts.getPreEmitDiagnostics(program));
  }

  log.debug(totalDiagnostic);

  const { configRelatedErrors, projectErrors, externalErrors } = categorizeDiagnostics(
    totalDiagnostic,
    projectRoot
  );

  if (options.genBulkSuppress) {
    const suppressors = createTsBulkSuppress(projectErrors, mergedConfig);

    configFromFile.bulkSuppressors = deduplicateSuppressors([
      ...suppressors,
      ...mergedConfig.bulkSuppressors
    ]);

    writeJSONSync(mergedConfig.config || '.ts-bulk-suppressions.json', configFromFile, { spaces: 2 });
    log.info('Project patched with bulk-suppressor');
    process.exit(0);
  }

  const projectStat: ProjectStat = {
    projectErrors: [],
    configRelatedErrors: [],
    externalErrors: [],
    statItems: initStatItem(configFromFile),
    raw: ''
  };

  process.exitCode = assertDiagnostics(
    configRelatedErrors,
    projectErrors,
    externalErrors,
    compilerHost,
    mergedConfig,
    projectStat
  );

  if (mergedConfig.stat) {
    writeJSONSync(mergedConfig.stat, projectStat, { spaces: 2 });
  }
}
program
  .option('-v, --verbose', 'Display verbose log')
  .option('--config <path>', 'Path to suppressConfig')
  .option('--stat <path>', 'Display suppress stat')
  .option('--strict-scope', 'Error scopeId would be as deep as possible')
  .option('--changed', 'Only check changed files compared with target_branch')
  .option('--create-default', 'Create a .ts-bulk-suppressions.json file')
  .option('--gen-bulk-suppress', 'Patch bulk-suppressor for current project')
  .option('--ignore-config-error', 'Ignore config-related errors')
  .option('--ignore-external-error', 'Ignore external errors')
  // .option(
  //   '-c, --compiler <path>',
  //   'Path to typescript.js. By default, uses `node_modules/typescript/lib/typescript.js`.',
  //   `node_modules/typescript/lib/typescript.js`,
  // ) // save for future
  .argument('[files...]', 'Target files');
// .option('-p, --project <file>', "Path to project's tsconfig")

program.parse();

const options: ProgramOptions = program.opts();

const { args } = program;

if (args.length) {
  options.files = args;
}

main(options);
