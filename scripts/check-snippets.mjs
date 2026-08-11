/**
 * Type-check the TypeScript code fences in SDK-consuming guide pages
 * against the real published SDK.
 *
 * Why this exists: a guide once taught an update call whose shape the SDK
 * does not accept — following it wrote junk properties onto real items and
 * silently disabled the version check. Prose cannot be trusted to track a
 * signature; a compiler can. Each listed page's ```ts fences are extracted
 * into modules, given a shared ambient context (a `client`, common ids),
 * and compiled with tsc against the SDK in devDependencies.
 *
 * Adding coverage: append the page to FILES. If a fence is deliberately
 * partial or illustrative, put `// snippet: skip-check` inside it.
 */
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, '.snippet-check');

const FILES = [
  'content/docs/guides/realtime/optimistic-updates.mdx',
];

const GLOBALS = `import type { MarfaClient, Item } from '@withmarfa/sdk';
declare global {
  const client: MarfaClient;
  const id: string;
  const item: Item;
  const properties: Record<string, unknown>;
  const version: number;
  const title: string;
  function renderLocally(value: unknown): void;
  function applyItem(value: unknown): void;
  function loadCursor(): string | undefined;
  function saveCursor(id: string): void;
  function resyncFromScratch(): Promise<void>;
}
export {};
`;

const TSCONFIG = {
  compilerOptions: {
    target: 'es2022',
    module: 'esnext',
    moduleResolution: 'bundler',
    lib: ['es2022', 'dom'],
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    noUnusedLocals: false,
  },
  include: ['*.ts'],
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'snippet-globals.d.ts'), GLOBALS);
writeFileSync(join(OUT, 'tsconfig.json'), JSON.stringify(TSCONFIG, null, 2));

const fenceRe = /```(?:ts|typescript)[^\n]*\n([\s\S]*?)```/g;
let emitted = 0;

for (const rel of FILES) {
  const source = readFileSync(join(ROOT, rel), 'utf8');
  const slug = basename(rel, '.mdx');
  let match;
  while ((match = fenceRe.exec(source)) !== null) {
    const code = match[1];
    if (code.includes('snippet: skip-check')) continue;
    const line = source.slice(0, match.index).split('\n').length + 1;
    // The filename carries the provenance so a tsc error points straight
    // back at the fence: <page>_L<line>.ts.
    writeFileSync(
      join(OUT, `${slug}_L${line}.ts`),
      `// source: ${rel}:${line}\nexport {};\n${code}`,
    );
    emitted++;
  }
}

if (emitted === 0) {
  console.error('check-snippets: no fences found — FILES list is stale');
  process.exit(1);
}

try {
  execFileSync('pnpm', ['exec', 'tsc', '-p', join(OUT, 'tsconfig.json')], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  console.log(`check-snippets: ${emitted} fences compile against the SDK`);
} catch {
  console.error(
    '\ncheck-snippets: a fence no longer compiles against the SDK. ' +
      'The failing filename encodes its page and line.',
  );
  process.exit(1);
} finally {
  rmSync(OUT, { recursive: true, force: true });
}
