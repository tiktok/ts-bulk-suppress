import type { JSONSchemaType } from 'ajv';
import type { BulkConfig } from './types';
import { spawnSync } from 'child_process';
import path from 'path';
export const BULK_CONFIG_SCHEMA: JSONSchemaType<BulkConfig> = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'bulkConfig',
  description: 'A JSON file to describe a error filter of tsc-bulk',
  type: 'object',
  properties: {
    $schema: {
      description:
        'Part of the JSON Schema standard, this optional keyword declares the URL of the schema that the file conforms to. Editors may download the schema and use it to perform syntax highlighting.',
      type: 'string'
    },
    project: {
      description: "tsconfig's relative path",
      type: 'string'
    },
    strictScope: {
      description: 'ScopeId would be as deep as possible',
      type: 'boolean',
      nullable: true
    },
    ignoreConfigError: {
      description: "Won't report configRelatedError",
      type: 'boolean',
      nullable: true
    },
    ignoreExternalError: {
      description: "Won't report error outside of this project",
      type: 'boolean',
      nullable: true
    },
    patternSuppressors: {
      description: 'Suppressors to suppress specific error codes inside some paths',

      type: 'array',
      items: {
        type: 'object',
        properties: {
          pathRegExp: {
            type: 'string'
          },
          codes: {
            type: 'array',
            items: {
              type: 'number'
            },
            nullable: true
          },
          suppressAll: {
            type: 'boolean',
            nullable: true
          }
        },
        required: ['pathRegExp']
      }
    },
    bulkSuppressors: {
      description: 'Suppressors to suppress base on scopeId',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          filename: { type: 'string' },
          scopeId: { type: 'string' },
          code: { type: 'number' }
        },
        required: ['filename', 'scopeId', 'code']
      }
    }
  },
  required: ['patternSuppressors', 'bulkSuppressors', 'project', '$schema']
};

export const DEFAULT_BULK_CONFIG: BulkConfig = {
  $schema: 'https://tiktok.github.io/ts-bulk-suppress/schemas/ts-bulk-suppressions.schemas.json',
  project: './tsconfig.json',
  patternSuppressors: [],
  bulkSuppressors: [],
  strictScope: false,
  ignoreConfigError: false,
  ignoreExternalError: false
};

export const CI_CHANGED_FILES_PATH = '/tmp/changed_files.json';

/**
 * Retrieves the root path of the monorepo. Written by @liucheng.leo
 *
 * @throws Throws an error if the command to retrieve the monorepo root path fails.
 * @returns The root path of the monorepo.
 */
export function getMonorepoRootPath(): string {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf-8'
  });
  if (result.status !== 0) {
    throw new Error(`get monorepo root path failed`);
  }
  return result.stdout.toString().trim();
}

export const MONOREPO_ROOT = path.resolve(__dirname, '../../../');
