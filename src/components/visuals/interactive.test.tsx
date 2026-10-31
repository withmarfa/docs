// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Choices, Menu, menuLeft } from './interactive';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const options = [
  { id: 'note', label: 'core.note' },
  { id: 'task', label: 'core.task' },
  { id: 'book', label: 'core.media.book' },
] as const;
type Id = (typeof options)[number]['id'];

function Both() {
  const [choice, setChoice] = useState<Id>('note');
  const [item, setItem] = useState<Id>('task');
  return (
    <>
      <Choices label="Key" options={options} value={choice} onChange={setChoice} />
      <Menu label="Item type" options={options} value={item} onChange={setItem} />
      <output>{item}</output>
    </>
  );
}

// jsdom has no popover API, so the test gives it the part the menu uses: the
// two events, in order, and the open state. It also treats an element with a
// `popover` attribute as never rendered, so an open one is shown inline.
function popovers() {
  const open = new WeakSet<HTMLElement>();
  const toggle = (element: HTMLElement, newState: 'open' | 'closed') => {
    const oldState = newState === 'open' ? 'closed' : 'open';
    element.dispatchEvent(Object.assign(new Event('beforetoggle'), { newState, oldState }));
    if (newState === 'open') open.add(element);
    else open.delete(element);
    element.style.display = newState === 'open' ? 'grid' : '';
    element.dispatchEvent(Object.assign(new Event('toggle'), { newState, oldState }));
  };
  HTMLElement.prototype.showPopover = function (this: HTMLElement) {
    if (!open.has(this)) toggle(this, 'open');
  };
  HTMLElement.prototype.hidePopover = function (this: HTMLElement) {
    if (open.has(this)) toggle(this, 'closed');
  };
  return (element: HTMLElement) => open.has(element);
}

describe('figure controls', () => {
  let container: HTMLDivElement;
  let root: Root;
  let isOpen: (element: HTMLElement) => boolean;

  beforeEach(() => {
    isOpen = popovers();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<Both />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  const choices = () => [...container.querySelectorAll<HTMLButtonElement>('[role="group"] button')];
  const trigger = () => container.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;
  const list = () => container.querySelector<HTMLElement>('[role="menu"]')!;
  const items = () => [...list().querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')];
  const focused = () => document.activeElement?.textContent;
  const press = (key: string) =>
    act(() => {
      (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    });
  const open = () =>
    act(() => {
      trigger().focus();
      list().showPopover();
    });

  it('presses exactly one choice, and moves the press on a click', () => {
    expect(choices().map((button) => button.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    act(() => choices()[2].click());
    expect(choices().map((button) => button.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true']);
  });

  it('says whether the menu is open, and names its current option', () => {
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-label')).toBe('Item type: core.task');
    open();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('opens on the current option, and moves with the arrows, Home and End', () => {
    open();
    expect(focused()).toBe('core.task');
    press('ArrowDown');
    expect(focused()).toBe('core.media.book');
    press('ArrowDown');
    expect(focused()).toBe('core.media.book');
    press('Home');
    expect(focused()).toBe('core.note');
    press('ArrowUp');
    expect(focused()).toBe('core.note');
    press('End');
    expect(focused()).toBe('core.media.book');
  });

  it('closes on Escape and puts focus back on its button, leaving the choice alone', () => {
    open();
    press('ArrowDown');
    press('Escape');
    expect(isOpen(list())).toBe(false);
    expect(document.activeElement).toBe(trigger());
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('output')!.textContent).toBe('task');
  });

  it('chooses an option, checks it, closes and puts focus back on its button', () => {
    open();
    act(() => items()[0].click());
    expect(container.querySelector('output')!.textContent).toBe('note');
    expect(items().map((item) => item.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    expect(isOpen(list())).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });
});

describe('menuLeft', () => {
  it('keeps the list at its button when it fits', () => {
    expect(menuLeft(100, 160, 375)).toBe(100);
  });

  it('moves the list left so it ends inside the viewport', () => {
    expect(menuLeft(260, 160, 375)).toBe(375 - 8 - 160);
  });

  it('never starts the list past the left edge', () => {
    expect(menuLeft(20, 400, 375)).toBe(8);
  });
});
