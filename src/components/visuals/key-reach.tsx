import { KeyRound } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Box, Figure } from './figure';
import { Choices, Controls, Menu, Result, Swap } from './interactive';

export type Level = 'read' | 'write';

export type KeyId = 'notes' | 'tasks' | 'both' | 'audit';

export type ItemType = 'core.note' | 'core.task' | 'core.media.book';

export type Key = {
  id: KeyId;
  label: string;
  /** The key's type map. A key made with permissions alone has none. */
  types: Partial<Record<ItemType, Level>> | null;
  /** What a key with no type map holds instead. */
  permission?: string;
};

export const keys: readonly Key[] = [
  { id: 'notes', label: 'Notes app', types: { 'core.note': 'write' } },
  { id: 'tasks', label: 'Task viewer', types: { 'core.task': 'read' } },
  { id: 'both', label: 'Notes and tasks', types: { 'core.note': 'write', 'core.task': 'read' } },
  { id: 'audit', label: 'Audit reader', types: null, permission: 'audit.read' },
];

export const itemTypes: readonly ItemType[] = ['core.note', 'core.task', 'core.media.book'];

/** Why the answer is what it is, which also says which rule decided it. */
export type Reason = 'no-map' | 'out-of-reach' | 'read-only' | 'write';

export type Answer = { status: 200 | 403 | 404; code?: 'type_not_permitted' | 'item_not_found' };

/**
 * What a key is answered for an item it names by id, by what its type map
 * holds for the item's type. A key with permissions and no type map reaches
 * no item, so every item operation is `403 type_not_permitted`
 * (`keys-and-oauth/permissions-no-content`). A type the key may not read
 * answers as an item no row holds, `404 item_not_found`, for a read and a
 * write alike (`keys-and-oauth/unreadable-as-missing`). A type the key may
 * read and not write is `403 type_not_permitted` on a write
 * (`keys-and-oauth/readable-not-writable`). A grant of write covers read.
 */
export function reasonFor(key: Key, type: ItemType): Reason {
  if (!key.types) return 'no-map';
  const level = key.types[type];
  if (!level) return 'out-of-reach';
  return level === 'read' ? 'read-only' : 'write';
}

export function answers(reason: Reason): { read: Answer; change: Answer } {
  const forbidden: Answer = { status: 403, code: 'type_not_permitted' };
  const missing: Answer = { status: 404, code: 'item_not_found' };
  switch (reason) {
    case 'no-map':
      return { read: forbidden, change: forbidden };
    case 'out-of-reach':
      return { read: missing, change: missing };
    case 'read-only':
      return { read: { status: 200 }, change: forbidden };
    case 'write':
      return { read: { status: 200 }, change: { status: 200 } };
  }
}

export const messages: Record<Reason, string> = {
  'no-map':
    'A key with no type map reaches no item, so every item operation is refused `403 type_not_permitted`.',
  'out-of-reach':
    'The key reaches no item of this type, so the item answers `404 item_not_found`, as an item that doesn\'t exist does.',
  'read-only':
    'The key may read this type, so it already knows the item is there. Changing it is refused `403 type_not_permitted`.',
  write: 'The key may read and write this type, so both operations go through.',
};

const statuses = {
  allowed: (
    <>
      <code>200</code> allowed
    </>
  ),
  forbidden: <code>403 type_not_permitted</code>,
  missing: <code>404 item_not_found</code>,
};

/** An answer, laid over the others so a row never changes height. */
function Status({ answer }: { answer: Answer }) {
  return <Swap values={statuses} current={answer.status === 200 ? 'allowed' : answer.status === 403 ? 'forbidden' : 'missing'} />;
}

export const initial = { key: 'notes' as KeyId, type: 'core.note' as ItemType };

/**
 * One key, one kind of item, and the answer Marfa gives to reading it and to
 * changing it. The key's own reach is drawn as its type map, with the row for
 * the chosen type lit. Only highlights and text change, so the layout never
 * moves.
 */
export function KeyReach({ caption }: { caption?: ReactNode }) {
  const [state, setState] = useState(initial);
  const key = keys.find((candidate) => candidate.id === state.key)!;
  const reason = reasonFor(key, state.type);
  const { read, change } = answers(reason);

  return (
    <Figure label="What a key is answered for an item, by its type map and the item's type" caption={caption} className="marfa-ix marfa-kr">
      <Controls>
        <Choices
          label="Key"
          options={keys}
          value={state.key}
          onChange={(id) => setState((current) => ({ ...current, key: id }))}
        />
        <Menu
          label="Item type"
          options={itemTypes.map((id) => ({ id, label: id }))}
          value={state.type}
          onChange={(type) => setState((current) => ({ ...current, type }))}
        />
      </Controls>

      <Result messages={messages} current={reason} />

      <div className="marfa-ix-parts">
        <Box
          className="marfa-ix-box"
          icon={KeyRound}
          title="The key holds"
          subtitle={
            <Swap
              values={Object.fromEntries(
                keys.map((candidate) => [
                  candidate.id,
                  candidate.types ? (
                    'A type map'
                  ) : (
                    <>
                      No type map, only <code>{candidate.permission}</code>
                    </>
                  ),
                ]),
              ) as Record<KeyId, ReactNode>}
              current={key.id}
            />
          }
        >
          <dl className="marfa-ix-rows marfa-kr-types">
            {itemTypes.map((id) => (
              <div key={id} data-lit={id === state.type || undefined}>
                <dt>
                  <code>{id}</code>
                </dt>
                <dd>{key.types?.[id] ?? 'None'}</dd>
              </div>
            ))}
          </dl>
        </Box>
        <Box
          className="marfa-ix-box"
          highlight
          title="Marfa answers"
          subtitle={
            <>
              By its id, for an item of{' '}
              <Swap
                values={Object.fromEntries(itemTypes.map((id) => [id, <code key={id}>{id}</code>])) as Record<ItemType, ReactNode>}
                current={state.type}
              />
            </>
          }
        >
          <dl className="marfa-ix-rows marfa-kr-answers">
            <div>
              <dt>Read it</dt>
              <dd>
                <Status answer={read} />
              </dd>
            </div>
            <div>
              <dt>Change it</dt>
              <dd>
                <Status answer={change} />
              </dd>
            </div>
          </dl>
        </Box>
      </div>
    </Figure>
  );
}
