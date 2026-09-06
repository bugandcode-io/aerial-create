import { readFileSync } from 'node:fs';
import ts from 'typescript';
const cache = new Map();
async function moduleUrl(url) {
  if (cache.has(url.href)) return cache.get(url.href);
  let source = ts.transpileModule(readFileSync(url, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  for (const match of [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)]) {
    const specifier = match[1];
    const resolved = specifier.startsWith('.')
      ? await moduleUrl(new URL(`${specifier}.ts`, url)) : import.meta.resolve(specifier);
    source = source.replace(match[0], `from '${resolved}'`);
  }
  const result = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  cache.set(url.href, result);
  return result;
}
export async function importTs(path) { return import(await moduleUrl(new URL(path, import.meta.url))); }
