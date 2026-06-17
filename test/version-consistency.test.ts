import { test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { VERSION } from '../src/version.ts';

test('openclaw.plugin.json version matches package.json version', () => {
  const pluginPath = resolve(import.meta.dir, '..', 'openclaw.plugin.json');
  const manifest = JSON.parse(readFileSync(pluginPath, 'utf8')) as { version: string };
  expect(manifest.version).toBe(VERSION);
});
