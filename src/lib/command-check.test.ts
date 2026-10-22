import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyAllowlist,
  checkPage,
  checkShell,
  formatFinding,
  tokenize,
  type AllowEntry,
  type CommandTree,
} from './command-check';

const CONTENT_DIR = fileURLToPath(new URL('../../content/docs', import.meta.url));
const TREE_PATH = fileURLToPath(new URL('../generated/cli-commands.json', import.meta.url));
const ALLOWLIST_PATH = fileURLToPath(new URL('./command-check-allowlist.json', import.meta.url));

const TREE = JSON.parse(readFileSync(TREE_PATH, 'utf8')) as CommandTree;
const ALLOWLIST = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8')) as AllowEntry[];

const PAGES = readdirSync(CONTENT_DIR, { recursive: true, encoding: 'utf8' })
  .filter((entry) => entry.endsWith('.mdx'))
  .map((entry) => entry.split(path.sep).join('/'))
  .sort()
  .map((file) => ({ file, text: readFileSync(path.join(CONTENT_DIR, file), 'utf8') }));

const FINDINGS = PAGES.flatMap(({ file, text }) => checkPage(file, text, TREE));

describe('command check: the pages', () => {
  it('reads a command tree that holds the commands the pages rely on', () => {
    expect(Object.keys(TREE.commands).length).toBeGreaterThan(100);
    expect(TREE.commands['items list'].options.map((o) => o.flag)).toContain('--type');
    expect(TREE.commands['items'].subcommands).toBe(true);
    expect(TREE.global.map((o) => o.flag)).toEqual(expect.arrayContaining(['--url', '--key', '--socket', '--json']));
  });

  it('shows only commands and options the command reference lists', () => {
    expect(applyAllowlist(FINDINGS, ALLOWLIST).remaining.map(formatFinding)).toEqual([]);
  });

  it('keeps an allowlist entry only while it excuses something', () => {
    expect(applyAllowlist(FINDINGS, ALLOWLIST).unused).toEqual([]);
  });

  it('gives every allowlist entry a page that exists and a reason', () => {
    for (const entry of ALLOWLIST) {
      expect(PAGES.map((page) => page.file), `${entry.page}: ${entry.text}`).toContain(entry.page);
      expect(entry.text.trim(), entry.page).not.toBe('');
      expect(entry.reason.trim().length, `${entry.page}: ${entry.text}`).toBeGreaterThan(10);
    }
  });
});

// ── Witnesses: each rule fires on a small bad sample ─────────────────────

describe('command check: each rule fires on a bad sample', () => {
  const tree: CommandTree = {
    global: [{ flag: '--url', value: true }, { flag: '--json' }],
    commands: {
      '': { options: [{ flag: '--version', short: '-V' }], subcommands: true },
      items: { options: [], subcommands: true },
      'items list': { options: [{ flag: '--type', value: true }, { flag: '--limit', value: true }] },
      'items get': { options: [], positional: true },
      docs: { options: [], subcommands: true, positional: true },
      'docs search': { options: [{ flag: '--limit', value: true }], positional: true },
      device: { options: [{ flag: '--db', value: true }, { flag: '--reader' }], subcommands: true },
      'device watch': { options: [{ flag: '--for', value: true }] },
      keys: { options: [], subcommands: true },
      'keys create': { options: [{ flag: '--label', value: true }, { flag: '--yes', short: '-y' }] },
    },
  };
  const page = (body: string) => checkPage('x.mdx', body, tree);
  const block = (code: string, info = 'bash') => `Text.\n\n\`\`\`${info}\n${code}\n\`\`\`\n`;
  const texts = (found: ReturnType<typeof page>) => found.map((f) => `${f.kind}: ${f.text}`);

  it('command: a command that is not in the reference', () => {
    const found = page(block('marfa items frobnicate'));
    expect(texts(found)).toEqual(['command: marfa items frobnicate']);
    expect(found[0].line).toBe(4);
    expect(found[0].file).toBe('x.mdx');
    expect(formatFinding(found[0])).toContain('x.mdx:4 [command]');
  });

  it('command: a top-level word that is not a command, in inline code too', () => {
    expect(texts(page('Run `marfa itemz list` now.'))).toEqual(['command: marfa itemz']);
  });

  it('flag: an option the command does not take', () => {
    const found = page(block('marfa items list --type core.note --dryrun'));
    expect(texts(found)).toEqual(['flag: --dryrun']);
    expect(found[0].detail).toContain('marfa items list');
  });

  it('flag: an option of a sibling command is not this command\'s', () => {
    expect(texts(page(block('marfa items get 1 --limit 5')))).toEqual(['flag: --limit']);
  });

  it('flag: one is found on the second line of a continued command, with its line', () => {
    const found = page(block('marfa keys create --label x \\\n  --bogus 1'));
    expect(texts(found)).toEqual(['flag: --bogus']);
    expect(found[0].line).toBe(5);
  });

  it('flag: a bare option in inline code that no command has', () => {
    expect(texts(page('Pass `--bogus` to it.'))).toEqual(['flag: --bogus']);
    expect(texts(page('Pass `--bogus <value>` to it.'))).toEqual(['flag: --bogus']);
    expect(page('Pass `--limit` or `--json` to it.')).toEqual([]);
  });

  it('flag: a single-letter option the command does not have', () => {
    expect(texts(page(block('marfa keys create -x')))).toEqual(['flag: -x']);
    expect(page(block('marfa keys create -y'))).toEqual([]);
  });

  it('marker: a marked block is left out', () => {
    const bad = 'marfa items frobnicate --dryrun';
    expect(page(block(bad, 'bash command-check="counterexample"'))).toEqual([]);
    expect(page(block(bad, 'bash tab="CLI" command-check="other-tool"'))).toEqual([]);
  });

  it('marker: an unknown marker, and one on a block that needs none, fail', () => {
    expect(texts(page(block('marfa items list', 'bash command-check="skip"')))).toEqual(['marker: skip']);
    expect(texts(page(block('marfa items frobnicate', 'bash command-check="skip"')))).toEqual([
      'marker: skip',
      'command: marfa items frobnicate',
    ]);
    const stale = page(block('marfa items list --type x', 'bash command-check="counterexample"'));
    expect(texts(stale)).toEqual(['marker: counterexample']);
    expect(stale[0].detail).toContain('remove the marker');
  });

  it('accepts what is right', () => {
    const good = [
      'marfa',
      'marfa --version',
      'marfa -V',
      'marfa items list --type core.note --limit 5 --json',
      'marfa items list --type=core.note',
      'marfa --url https://x.example keys create --label "a b" --yes',
      'marfa keys create --label x -y',
      'marfa items get <id> --json',
      'marfa docs search "restore" --limit 5',
      'marfa docs files',
      'marfa device --reader watch --for 5',
      'marfa device watch --db x.db',
      'marfa --url <url> items get <the id>',
      'marfa items list --help',
      'marfa help items',
    ];
    for (const code of good) expect(page(block(code)), code).toEqual([]);
  });

  it('leaves a placeholder where a command goes, and what follows it', () => {
    expect(page(block('marfa <command> --help'))).toEqual([]);
    expect(page(block('marfa items <subcommand> --whatever'))).toEqual([]);
    expect(page(block('marfa ... --whatever'))).toEqual([]);
  });

  it('reads a value that is the name of a command as a value', () => {
    expect(page(block('marfa --url items items list'))).toEqual([]);
    expect(page(block('marfa items list --type items'))).toEqual([]);
  });

  it('leaves the other tool\'s options in the same block alone', () => {
    const code = [
      'docker pull ghcr.io/withmarfa/marfa-server:1 --quiet',
      'curl --fail --data-urlencode "type=x" https://x.example | jq --arg a b',
      'marfa items list --type x | jq --raw-output .id',
      'marfa items list --type x > out.json 2>&1',
      'git log -- marfa',
      'echo "marfa nonsense --nope"',
    ].join('\n');
    expect(page(block(code))).toEqual([]);
  });

  it('finds a command after a wrapper', () => {
    const wrapped = [
      'MARFA_NO_KEYCHAIN=1 marfa items frobnicate',
      'env -u MARFA_API_URL -u MARFA_API_KEY marfa items zzz',
      'op run -- marfa items yyy',
      'docker exec marfa marfa items xxx',
      'docker exec -it -e A=b marfa marfa items www',
      'sudo -u me marfa items vvv',
      'cd x && marfa items uuu',
      'echo $(marfa items ttt)',
    ].join('\n');
    expect(texts(page(block(wrapped)))).toEqual(
      ['frobnicate', 'zzz', 'yyy', 'xxx', 'www', 'vvv', 'uuu', 'ttt'].map((w) => `command: marfa items ${w}`),
    );
  });

  it('does not take the word marfa in prose, in a name or in a path as a command', () => {
    const text = [
      'Marfa runs `marfa` as a program; `marfa.env` and `marfa-server` and `marfa_id` are names.',
      'The `marfa` CLI keeps `/srv/marfa/data`. Say "marfa nonsense" in prose.',
    ].join('\n');
    expect(page(text)).toEqual([]);
  });

  it('reads other languages, output and the sample of a Markdown block as it should', () => {
    expect(page(block('marfa items frobnicate', 'ts'))).toEqual([]);
    expect(page(block('marfa items frobnicate', 'http'))).toEqual([]);
    expect(page(block('marfa: the server refused (409)\nmarfa items frobnicate', 'text'))).toEqual([]);
    expect(texts(page(block('$ marfa items frobnicate', 'text')))).toEqual(['command: marfa items frobnicate']);
    expect(texts(page(block('- Read: `marfa items zzz`', 'markdown')))).toEqual(['command: marfa items zzz']);
  });

  it('reads a command across a quoted line break and past a comment', () => {
    const code = "marfa items list --type 'a\nb' --limit 1 # --bogus\nmarfa items get 1 --nope";
    expect(texts(page(block(code)))).toEqual(['flag: --nope']);
  });

  it('tokenizes quotes, continuations and operators', () => {
    const words = (s: string) => tokenize(s).map((t) => `${t.kind === 'word' ? '' : t.kind + ':'}${t.text}`);
    expect(words(`a "b c" 'd e' f\\ g`)).toEqual(['a', 'b c', 'd e', 'f g']);
    expect(words('a \\\n b')).toEqual(['a', 'b']);
    expect(words('a | b && c; d')).toEqual(['a', 'op:|', 'b', 'op:&&', 'c', 'op:;', 'd']);
    expect(words('marfa --socket <path> setup <the id> > out 2>&1')).toEqual([
      'marfa', '--socket', '<path>', 'setup', '<the id>', 'redirect:>', 'out',
    ]);
    expect(checkShell('marfa items list --bogus', 7, tree)[0].line).toBe(7);
  });

  describe('the allowlist', () => {
    const finding = { file: 'a.mdx', line: 1, kind: 'flag' as const, text: '--x', detail: '' };
    const entry = { page: 'a.mdx', text: '--x', reason: 'curl option' };

    it('excuses a finding by page and text, and no other', () => {
      expect(applyAllowlist([finding], [entry]).remaining).toEqual([]);
      expect(applyAllowlist([{ ...finding, file: 'b.mdx' }], [entry]).remaining).toHaveLength(1);
      expect(applyAllowlist([{ ...finding, text: '--y' }], [entry]).remaining).toHaveLength(1);
    });

    it('reports an entry that excuses nothing', () => {
      expect(applyAllowlist([], [entry]).unused).toEqual([entry]);
      expect(applyAllowlist([finding], [entry]).unused).toEqual([]);
    });
  });
});
