import { Diagnostic } from 'ts-morph';
import ts from 'typescript';

export type ProgramOptions = {
  verbose?: boolean;
  config?: string;
  // compiler: string;
  // project?: string;
  changed?: boolean;
  stat?: string;
  createDefault?: boolean;
  ignoreConfigError?: boolean;
  ignoreExternalError?: boolean;
  strictScope?: boolean;
  genBulkSuppress: boolean;
  files?: string[];
};

export type PatternSuppressor = {
  pathRegExp: string;
  suppressAll?: boolean;
  codes?: number[];
};

export type BulkSuppressor = {
  filename: string;
  scopeId: string;
  code: number;
};

export type StatisticsItem =
  | {
      type: 'bulk';
      filename: string;
      scopeId: string;
      code: number;
      total: number;
    }
  | {
      type: 'pattern';
      pathRegExp: string;
      code: number;
      total: number;
    };

export type DiagnosticMorph = Diagnostic<ts.Diagnostic> & {
  relativeFilepath?: string;
  errorType?: 'configRelated' | 'project' | 'external';
};

export type DiagnosticTsc = ts.Diagnostic & {
  relativeFilepath?: string;
  errorType?: 'configRelated' | 'project' | 'external';
};

export type BulkConfig = {
  $schema: string;
  project: string;
  ignoreConfigError?: boolean;
  ignoreExternalError?: boolean;
  strictScope?: boolean;
  patternSuppressors: PatternSuppressor[];
  bulkSuppressors: BulkSuppressor[];
};

type DiagnosticStat = {
  filename: string | undefined;
  code: number;
  line: number | undefined;
  col: number | undefined;
  message: string[];
};
export type ProjectStat = {
  projectErrors: DiagnosticStat[];
  configRelatedErrors: DiagnosticStat[];
  externalErrors: DiagnosticStat[];
  statItems: StatisticsItem[];
  raw: string;
};
