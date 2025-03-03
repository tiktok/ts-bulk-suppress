import path from 'path';
import { execSync } from 'child_process';
import { rmSync, existsSync } from 'fs-extra';

describe('App pass test', () => {
  const toolScriptPath = path.resolve(__dirname, '../dist/index.js');
  const appDir = path.resolve(__dirname, 'fixtures', 'node');
  const bulkConfigPath = path.resolve(appDir, 'bulk.config.json');

  it(`won't pass without any bulk.config.json`, () => {
    if (existsSync(bulkConfigPath)) rmSync(bulkConfigPath);
    expect(() => {
      execSync(`node ${toolScriptPath}`, { cwd: appDir });
    }).toThrow();
  });

  it(`generates bulk.config.json`, () => {
    execSync(`node ${toolScriptPath} --gen-bulk-suppress `, { cwd: appDir });
    expect(existsSync(bulkConfigPath)).toBe(true);
  });

  it(`won't pass because of externalError`, () => {
    expect(() => {
      execSync(`node ${toolScriptPath}  `, { cwd: appDir });
    }).toThrow();
  });

  it(`pass because filtered ignoreExternalError`, () => {
    expect(() => execSync(`node ${toolScriptPath} --ignore-external-error`, { cwd: appDir })).not.toThrow();
    if (existsSync(bulkConfigPath)) rmSync(bulkConfigPath);
  });
});
