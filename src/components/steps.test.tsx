// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Step, Steps } from './steps';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const titles = ['Make a key', 'Create the project', 'Add the directory', 'Confirm the first sync', 'Sync', 'Watch', 'Check', 'Stop', 'Remove'];

function guide(count: number) {
  return (
    <Steps paged>
      {titles.slice(0, count).map((title, index) => (
        <Step key={title}>
          <h3 id={`step-${index + 1}`}>{title}</h3>
          <p>Body of {title}</p>
        </Step>
      ))}
    </Steps>
  );
}

describe('paged steps', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    // jsdom lays nothing out and has no scrolling.
    Element.prototype.scrollIntoView = vi.fn();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.location.hash = '';
  });

  const render = (count: number) => act(() => root.render(guide(count)));
  const pill = () => container.querySelector('.marfa-paged-indicator')!;
  const live = () => container.querySelector('[aria-live]')!.textContent;
  const panels = () => [...container.querySelectorAll<HTMLElement>('.marfa-paged-step')];
  const shown = () => panels().findIndex((panel) => !panel.hasAttribute('hidden'));
  const button = (name: string) =>
    [...container.querySelectorAll('button')].find(
      (element) => element.getAttribute('aria-label') === name || element.textContent?.startsWith(name),
    )!;

  it('shows a dot for each step in a guide of up to 8 steps', () => {
    render(8);
    expect(pill().querySelectorAll('[data-dot]')).toHaveLength(8);
    expect(pill().textContent).toBe('');
  });

  it('shows "n of m" instead of dots in a guide of more than 8 steps', () => {
    render(9);
    expect(pill().querySelectorAll('[data-dot]')).toHaveLength(0);
    expect(pill().textContent).toBe('1 of 9');
    act(() => button('Next step').click());
    expect(pill().textContent).toBe('2 of 9');
  });

  it('tells a screen reader the step number, the total and the step name', () => {
    render(4);
    expect(live()).toBe('Step 1 of 4: Make a key');
    act(() => button('Next step').click());
    expect(live()).toBe('Step 2 of 4: Create the project');
  });

  it('keeps a disabled arrow focusable', () => {
    render(2);
    const previous = button('Previous step');
    expect(previous.hasAttribute('disabled')).toBe(false);
    expect(previous.getAttribute('aria-disabled')).toBe('true');
    previous.focus();
    act(() => previous.click());
    expect(document.activeElement).toBe(previous);
    expect(shown()).toBe(0);
  });

  it('moves focus to the new step from the button under the step, which the last step lacks', () => {
    render(3);
    act(() => button('Next: Create the project').click());
    expect(shown()).toBe(1);
    expect(document.activeElement).toBe(panels()[1]);
    act(() => button('Next: Add the directory').click());
    expect(shown()).toBe(2);
    expect(container.textContent).not.toContain('Next:');
  });

  it('leaves focus on an arrow when the arrow moves', () => {
    render(3);
    const next = button('Next step');
    next.focus();
    act(() => next.click());
    expect(shown()).toBe(1);
    expect(document.activeElement).toBe(next);
  });

  it('hides the other steps until found, so find-in-page reaches them', () => {
    render(3);
    expect(panels().map((panel) => panel.getAttribute('hidden'))).toEqual([null, 'until-found', 'until-found']);
  });

  it('opens the step that holds a linked heading on load', () => {
    window.location.hash = '#step-3';
    render(4);
    expect(shown()).toBe(2);
    expect(live()).toBe('Step 3 of 4: Add the directory');
  });

  it('opens a hidden step when find-in-page lands in it', () => {
    render(4);
    act(() => {
      panels()[3].dispatchEvent(new Event('beforematch'));
    });
    expect(shown()).toBe(3);
  });
});
