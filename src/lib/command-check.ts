/**
 * Checks the commands and options the pages show against the CLI's command
 * reference.
 *
 * The reference reaches this repository as `src/generated/cli-commands.json`,
 * which `scripts/sync-from-marfa.sh` writes from marfa's `COMMANDS.md`. A page
 * names a command in a shell block or in inline code; each `marfa ...`
 * invocation is read the way a shell reads it and walked down the command tree,
 * so a command that does not exist, or an option that the command and the
 * commands above it do not take, is reported with the page and the line.
 *
 * What it cannot judge is left alone rather than guessed at: a placeholder in
 * the place of a command, the other tool's own options in the same block, and
 * the words an invocation takes as arguments. `command-check-allowlist.json`
 * holds the few exceptions, each with its reason.
 */

export interface CommandOption {
  flag: string;
  short?: string;
  value?: boolean;
}

export interface CommandNode {
  options: CommandOption[];
  subcommands?: boolean;
  positional?: boolean;
}

export interface CommandTree {
  /** The options every command takes. */
  global: CommandOption[];
  /** Each command by its words after `marfa`, such as `items list`; `marfa` itself is the empty name. */
  commands: Record<string, CommandNode>;
}

export type CheckKind = 'command' | 'flag' | 'marker';

export interface Finding {
  file: string;
  line: number;
  kind: CheckKind;
  /** The offending text: a command such as `marfa items frobnicate`, or an option such as `--dryrun`. */
  text: string;
  detail: string;
}

export function formatFinding(finding: Finding): string {
  return `${finding.file}:${finding.line} [${finding.kind}] ${finding.detail}`;
}

export interface AllowEntry {
  page: string;
  text: string;
  reason: string;
}

/**
 * The options and the word clap adds to every command without listing them in
 * the reference.
 */
const IMPLICIT_OPTIONS = new Set(['--help', '-h']);

/** A block marker's values, which `STYLE.md` ("Examples") documents. */
export const MARKERS = ['other-tool', 'counterexample'] as const;
const MARKER = /\bcommand-check=(?:"([^"]*)"|(\S+))/;

// ── Reading a shell line ─────────────────────────────────────────────────

interface Token {
  text: string;
  line: number;
  /** Any part of the word was quoted, so it is an argument and never an option or a command. */
  quoted: boolean;
  kind: 'word' | 'op' | 'redirect';
}

/**
 * Splits shell text into words and the operators that end a command. Quotes
 * are removed from a word, a backslash before a newline continues the line, an
 * unquoted `#` starts a comment, and a redirection is its own token so its
 * target is not read as an argument. A newline inside quotes stays in the word.
 */
export function tokenize(source: string, firstLine = 1): Token[] {
  const tokens: Token[] = [];
  let line = firstLine;
  let i = 0;
  let word: { text: string; quoted: boolean; line: number } | null = null;

  const end = () => {
    if (word) tokens.push({ ...word, kind: 'word' });
    word = null;
  };
  const op = (kind: 'op' | 'redirect', text: string) => {
    end();
    tokens.push({ text, line, quoted: false, kind });
  };

  while (i < source.length) {
    const c = source[i];
    if (c === '\n') {
      op('op', '\n');
      line++;
      i++;
    } else if (c === ' ' || c === '\t' || c === '\r') {
      end();
      i++;
    } else if (c === '\\') {
      if (source[i + 1] === '\n') {
        end();
        line++;
        i += 2;
      } else {
        word ??= { text: '', quoted: false, line };
        word.text += source[i + 1] ?? '';
        i += 2;
      }
    } else if (c === "'" || c === '"') {
      word ??= { text: '', quoted: false, line };
      word.quoted = true;
      i++;
      while (i < source.length && source[i] !== c) {
        if (c === '"' && source[i] === '\\' && i + 1 < source.length) i++;
        if (source[i] === '\n') line++;
        word.text += source[i++];
      }
      i++;
    } else if (c === '#' && word === null) {
      while (i < source.length && source[i] !== '\n') i++;
    } else if (c === '$' && source[i + 1] === '(') {
      op('op', '$(');
      i += 2;
    } else if (c === '`' || c === '(' || c === ')' || c === ';') {
      op('op', c);
      i++;
    } else if (c === '|' || c === '&') {
      // `&>` and `2>&1` are redirections; `&&`, `||`, `|` and `&` end a command.
      if (c === '&' && source[i + 1] === '>') {
        op('redirect', '&>');
        i += 2;
      } else {
        op('op', source[i + 1] === c ? c + c : c);
        i += source[i + 1] === c ? 2 : 1;
      }
    } else if (c === '<' && /^<[A-Za-z](?:[A-Za-z0-9 _.-]*[A-Za-z0-9_])?>/.test(source.slice(i))) {
      // `<id>` is a placeholder for what the reader fills in, not a redirection.
      const placeholder = /^<[A-Za-z](?:[A-Za-z0-9 _.-]*[A-Za-z0-9_])?>/.exec(source.slice(i))![0];
      word ??= { text: '', quoted: false, line };
      word.text += placeholder;
      i += placeholder.length;
    } else if (c === '>' || c === '<') {
      // A file descriptor written before it (`2>`) is part of the redirection.
      if (word && /^\d+$/.test(word.text) && !word.quoted) word = null;
      let text = c;
      while (source[i + 1] === c) text += source[++i];
      i++;
      if (source[i] === '&' && /\d|-/.test(source[i + 1] ?? '')) {
        // `2>&1` names no file, so nothing follows to skip.
        i += 2;
        end();
        continue;
      }
      op('redirect', text);
    } else {
      word ??= { text: '', quoted: false, line };
      word.text += c;
      i++;
    }
  }
  end();
  return tokens;
}

// ── Walking an invocation down the command tree ──────────────────────────

/** A word that stands for something the reader fills in. */
export function isPlaceholder(text: string): boolean {
  return /^\[.*\]$|^\$|\.\.\.$|^…$|<[^>]*>/.test(text);
}

function flagsOf(options: CommandOption[]): Map<string, CommandOption> {
  const map = new Map<string, CommandOption>();
  for (const option of options) {
    map.set(option.flag, option);
    if (option.short) map.set(option.short, option);
  }
  return map;
}

interface Match {
  line: number;
  kind: CheckKind;
  text: string;
  detail: string;
}

/**
 * Walks the words after `marfa` down the tree. Options may come at any point,
 * as clap takes them, and are valid when the command named so far, a command
 * above it or the global options list them. Returns the index at which the
 * invocation ends.
 */
function walkInvocation(tokens: Token[], start: number, tree: CommandTree, out: Match[]): number {
  const root = tree.commands[''] ?? { options: [] };
  const known = flagsOf([...tree.global, ...root.options]);
  const path: string[] = [];
  let node: CommandNode = root;
  let resolving = true;
  let afterOptions = false;
  let unsure = false;
  let i = start;

  const name = () => ['marfa', ...path].join(' ');

  for (; i < tokens.length && tokens[i].kind !== 'op'; i++) {
    const token = tokens[i];
    if (token.kind === 'redirect') {
      i++;
      continue;
    }

    if (!afterOptions && !token.quoted && token.text === '--') {
      afterOptions = true;
      resolving = false;
      continue;
    }

    if (!afterOptions && !token.quoted && /^--?[A-Za-z]/.test(token.text)) {
      const long = token.text.startsWith('--');
      const given = long ? [token.text.split('=')[0]] : [...token.text.slice(1)].map((c) => `-${c}`);
      for (const flag of given) {
        const option = known.get(flag);
        if (option) {
          if (option.value && long && !token.text.includes('=') && tokens[i + 1]?.kind === 'word') i++;
        } else if (!IMPLICIT_OPTIONS.has(flag) && !isPlaceholder(flag)) {
          unsure = true;
          out.push({
            line: token.line,
            kind: 'flag',
            text: flag,
            detail: `"${flag}" is not an option of "${name()}" or one every command takes`,
          });
        }
      }
      continue;
    }

    if (!resolving) continue;
    if (isPlaceholder(token.text)) {
      // The command here is not named, so nothing after it can be checked.
      while (i < tokens.length && tokens[i].kind !== 'op') i++;
      return i;
    }
    if (!node.subcommands) {
      resolving = false;
      continue;
    }
    if (token.text === 'help') {
      while (i < tokens.length && tokens[i].kind !== 'op') i++;
      return i;
    }
    const next = tree.commands[[...path, token.text].join(' ')];
    if (next) {
      path.push(token.text);
      node = next;
      for (const [flag, option] of flagsOf(next.options)) known.set(flag, option);
    } else if (node.positional || unsure) {
      resolving = false;
    } else {
      out.push({
        line: token.line,
        kind: 'command',
        text: `${name()} ${token.text}`,
        detail: `"${name()} ${token.text}" is not a command; "${name()}" has ${listOf(tree, path)}`,
      });
      while (i < tokens.length && tokens[i].kind !== 'op') i++;
      return i;
    }
  }
  return i;
}

function listOf(tree: CommandTree, path: string[]): string {
  const depth = path.length;
  const names = Object.keys(tree.commands)
    .filter((key) => key !== '' && key.split(' ').length === depth + 1 && key.startsWith(depth === 0 ? '' : `${path.join(' ')} `))
    .map((key) => key.split(' ')[depth]);
  return names.length ? `${names.join(', ')}` : 'no subcommands';
}

/** Words that run what follows them: the command is the word after the wrapper and its options. */
const WRAPPERS_WITH_VALUES = new Map<string, Set<string>>([
  ['sudo', new Set(['-u', '-g', '-h', '-p', '-C'])],
  ['env', new Set(['-u', '-C', '-S'])],
  ['time', new Set()],
  ['exec', new Set()],
  ['nohup', new Set()],
  ['command', new Set()],
]);
const EXEC_VALUE_OPTIONS = new Set(['-e', '--env', '-u', '--user', '-w', '--workdir', '--env-file', '-w']);

/** The index of the command a wrapper runs, after any environment settings, `sudo`, `env` and `docker exec`. */
function commandStart(tokens: Token[], from: number): number {
  let i = from;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.kind !== 'word') return i;
    if (!token.quoted && /^[A-Za-z_][A-Za-z0-9_]*=/.test(token.text)) {
      i++;
    } else if (!token.quoted && token.text === '$') {
      i++;
    } else if (WRAPPERS_WITH_VALUES.has(token.text) && !token.quoted) {
      const takesValue = WRAPPERS_WITH_VALUES.get(token.text)!;
      i++;
      while (i < tokens.length && tokens[i].kind === 'word' && /^-/.test(tokens[i].text) && !tokens[i].quoted) {
        i += takesValue.has(tokens[i].text) ? 2 : 1;
      }
    } else if (/^(docker|podman|docker-compose)$/.test(token.text) && !token.quoted) {
      // `docker exec [options] <container> <command>`, and the same under `compose`.
      let j = i + 1;
      if (tokens[j]?.text === 'compose') j++;
      if (tokens[j]?.text !== 'exec') return i;
      j++;
      while (j < tokens.length && tokens[j].kind === 'word' && /^-/.test(tokens[j].text)) {
        j += EXEC_VALUE_OPTIONS.has(tokens[j].text) ? 2 : 1;
      }
      i = j + 1;
    } else {
      return i;
    }
  }
  return i;
}

/** Every `marfa` invocation in shell text, checked against the tree. */
export function checkShell(source: string, firstLine: number, tree: CommandTree): Match[] {
  const tokens = tokenize(source, firstLine);
  const out: Match[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i].kind === 'op') {
      i++;
      continue;
    }
    i = commandStart(tokens, i);
    const token = tokens[i];
    if (!token) break;
    if (token.kind === 'word' && !token.quoted && token.text === 'marfa') {
      i = walkInvocation(tokens, i + 1, tree, out);
      continue;
    }
    // Another tool's command. After `--` a new command can start, as in `op run -- marfa items list`.
    while (i < tokens.length && tokens[i].kind !== 'op') {
      if (tokens[i].kind === 'redirect') i++;
      else if (tokens[i].text === '--' && !tokens[i].quoted) {
        i++;
        break;
      }
      i++;
    }
  }
  return out;
}

// ── Reading a page ───────────────────────────────────────────────────────

const SHELL_LANGUAGES = new Set(['bash', 'sh', 'shell', 'zsh', 'console']);
const PROSE_LANGUAGES = new Set(['markdown', 'md', 'mdx']);

const BARE_FLAG = /^(--[a-z0-9][a-z0-9-]*)(?:=\S*|\s+<[^>]*>)?$/;

/**
 * An option written alone in inline code. It follows no command, so it can only
 * be checked against every option the CLI has.
 */
function checkBareFlag(span: string, line: number, tree: CommandTree): Match[] {
  const match = BARE_FLAG.exec(span.trim());
  if (!match) return [];
  const flag = match[1];
  const every = new Set<string>(IMPLICIT_OPTIONS);
  for (const option of tree.global) every.add(option.flag);
  for (const node of Object.values(tree.commands)) for (const option of node.options) every.add(option.flag);
  if (every.has(flag)) return [];
  return [{ line, kind: 'flag', text: flag, detail: `"${flag}" is not an option of any marfa command` }];
}

const INLINE_CODE = /(`+)(?!`)(.*?)(?<!`)\1(?!`)/g;

function checkProseLine(text: string, line: number, tree: CommandTree): Match[] {
  const out: Match[] = [];
  for (const span of text.matchAll(INLINE_CODE)) {
    const tokens = tokenize(span[2], line);
    if (tokens.length === 0) continue;
    const bare = checkBareFlag(span[2], line, tree);
    if (bare.length) out.push(...bare);
    else out.push(...checkShell(span[2], line, tree));
  }
  return out;
}

/**
 * The commands and options a page shows, checked against the tree. A fenced
 * block is read as the shell when its language says so; inline code, and the
 * inline code in a Markdown block, is read as one command. A block carrying
 * `command-check="other-tool"` or `command-check="counterexample"` is left
 * out, and the marker itself is checked: it must be one of those two and the
 * block must need it.
 */
export function checkPage(file: string, text: string, tree: CommandTree): Finding[] {
  const lines = text.split('\n');
  const out: Finding[] = [];
  const add = (match: Match) => out.push({ file, ...match });

  for (let index = 0; index < lines.length; index++) {
    const open = /^\s*(`{3,}|~{3,})(.*)$/.exec(lines[index]);
    if (!open) {
      checkProseLine(lines[index], index + 1, tree).forEach(add);
      continue;
    }

    const body: string[] = [];
    const first = index + 2;
    for (index++; index < lines.length; index++) {
      const close = /^\s*(`{3,}|~{3,})\s*$/.exec(lines[index]);
      if (close && close[1][0] === open[1][0] && close[1].length >= open[1].length) break;
      body.push(lines[index]);
    }

    const info = open[2].trim();
    const language = info.split(/\s+/)[0].toLowerCase();
    const found: Match[] = [];
    if (SHELL_LANGUAGES.has(language)) {
      found.push(...checkShell(body.join('\n'), first, tree));
    } else if (PROSE_LANGUAGES.has(language)) {
      body.forEach((line, n) => found.push(...checkProseLine(line, first + n, tree)));
    } else if (language === 'text' || language === '') {
      // Output, not input, unless a line shows the prompt.
      body.forEach((line, n) => {
        if (/^\s*\$ /.test(line)) found.push(...checkShell(line, first + n, tree));
      });
    }

    const marker = MARKER.exec(info);
    if (!marker) {
      found.forEach(add);
      continue;
    }
    const value = marker[1] ?? marker[2];
    const markerLine = first - 1;
    if (!(MARKERS as readonly string[]).includes(value)) {
      add({
        line: markerLine,
        kind: 'marker',
        text: value,
        detail: `command-check="${value}" is not a marker; use ${MARKERS.map((m) => `"${m}"`).join(' or ')}`,
      });
      found.forEach(add);
    } else if (found.length === 0) {
      add({
        line: markerLine,
        kind: 'marker',
        text: value,
        detail: `command-check="${value}" marks a block that passes the check without it; remove the marker`,
      });
    }
  }
  return out;
}

// ── The allowlist ────────────────────────────────────────────────────────

/** Findings the allowlist leaves, and the entries that matched nothing. */
export function applyAllowlist(
  findings: Finding[],
  allowlist: AllowEntry[],
): { remaining: Finding[]; unused: AllowEntry[] } {
  const used = new Set<AllowEntry>();
  const remaining = findings.filter((finding) => {
    const entry = allowlist.find((e) => e.page === finding.file && e.text === finding.text);
    if (entry) used.add(entry);
    return !entry;
  });
  return { remaining, unused: allowlist.filter((entry) => !used.has(entry)) };
}
