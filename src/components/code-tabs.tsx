import { CodeBlockTabs as Base } from 'fumadocs-ui/components/codeblock';
import { Children, isValidElement, useLayoutEffect, useMemo, useState, type ComponentProps } from 'react';

// Fumadocs' code tabs with a remembered choice that only applies where it
// exists. Its own version shares one choice across every tab set in a group, so
// choosing CLI on one page left a page with only HTTP and TypeScript tabs
// showing an empty panel. Here a set takes the group's choice only when it has
// a tab of that name, and otherwise keeps its own first tab.

const EVENT = 'marfa-tab-group';

type Props = ComponentProps<typeof Base> & { groupId?: string; persist?: boolean };

function read(groupId: string): string | null {
  try {
    return sessionStorage.getItem(groupId) ?? localStorage.getItem(groupId);
  } catch {
    return null;
  }
}

function write(groupId: string, value: string) {
  try {
    sessionStorage.setItem(groupId, value);
    localStorage.setItem(groupId, value);
  } catch {
    // Storage can be blocked; the choice then lasts only for this page.
  }
}

export function CodeBlockTabs({ groupId, persist: _persist, defaultValue, children, ...props }: Props) {
  const values = useMemo(
    () =>
      Children.toArray(children).flatMap((child) =>
        isValidElement<{ value?: unknown }>(child) && typeof child.props.value === 'string' ? [child.props.value] : [],
      ),
    [children],
  );
  const [value, setValue] = useState(defaultValue ?? values[0]);

  useLayoutEffect(() => {
    if (!groupId) return;
    const stored = read(groupId);
    if (stored && values.includes(stored)) setValue(stored);
    const onChange = (event: Event) => {
      const { group, value: next } = (event as CustomEvent<{ group: string; value: string }>).detail;
      if (group === groupId && values.includes(next)) setValue(next);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [groupId, values]);

  return (
    <Base
      {...props}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        if (!groupId) return;
        write(groupId, next);
        window.dispatchEvent(new CustomEvent(EVENT, { detail: { group: groupId, value: next } }));
      }}
    >
      {children}
    </Base>
  );
}
