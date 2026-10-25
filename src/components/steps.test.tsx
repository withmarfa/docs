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
    Element.prototype.getAnimations = () => [];
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

  it('shows "n of m" for any number of steps', () => {
    render(4);
    expect(pill().textContent).toBe('1 of 4');
    act(() => button('Next step').click());
    expect(pill().textContent).toBe('2 of 4');
  });

  it('names each step group by its title, so the count is spoken once, by the live region', () => {
    render(4);
    expect(panels().map((panel) => panel.getAttribute('aria-label'))).toEqual([
      'Make a key',
      'Create the project',
      'Add the directory',
      'Confirm the first sync',
    ]);
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

  it('scrolls a linked heading into view once its step shows', () => {
    window.location.hash = '#step-3';
    render(4);
    const scroll = vi.mocked(Element.prototype.scrollIntoView);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.contexts[0]).toBe(container.querySelector('#step-3'));
    expect(scroll).toHaveBeenCalledWith({ block: 'start' });
  });

  it('treats a malformed hash as matching no step', () => {
    window.location.hash = '#100%';
    expect(() => render(4)).not.toThrow();
    expect(shown()).toBe(0);
  });

  it('opens a hidden step when find-in-page lands in it', () => {
    render(4);
    act(() => {
      panels()[3].dispatchEvent(new Event('beforematch'));
    });
    expect(shown()).toBe(3);
  });

  describe('the height animation', () => {
    type Fake = { finished: Promise<void>; cancel: () => void; finish: () => void };
    let running: Fake[];
    let log: string[];

    beforeEach(() => {
      running = [];
      log = [];
      window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia;
      Element.prototype.getAnimations = (() => running) as unknown as typeof Element.prototype.getAnimations;
      Element.prototype.animate = (() => {
        let settle!: (reject: boolean) => void;
        const finished = new Promise<void>((resolve, reject) => {
          settle = (fail) => (fail ? reject(new DOMException('cancelled', 'AbortError')) : resolve());
        });
        const fake: Fake = {
          finished,
          cancel: () => {
            log.push('cancel');
            running.splice(running.indexOf(fake), 1);
            settle(true);
          },
          finish: () => {
            running.splice(running.indexOf(fake), 1);
            settle(false);
          },
        };
        running.push(fake);
        log.push('animate');
        return fake;
      }) as unknown as typeof Element.prototype.animate;
    });

    afterEach(() => {
      delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
      delete (Element.prototype as { animate?: unknown }).animate;
    });

    const body = () => container.querySelector<HTMLElement>('.marfa-paged-step')!.parentElement!;
    const settled = () => act(async () => {});
    // Each move measures twice: the height before it, then the height after it.
    const measures = (...heights: number[]) => {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        configurable: true,
        get() {
          log.push('measure');
          return heights.shift() ?? 0;
        },
      });
    };

    it('cancels a running animation before measuring the new height', async () => {
      render(3);
      measures(100, 200, 150, 250);
      act(() => button('Next step').click());
      expect(running).toHaveLength(1);
      log.length = 0;
      act(() => button('Next step').click());
      // go() measures once, then the layout effect cancels before its own measure.
      expect(log).toEqual(['measure', 'cancel', 'measure', 'animate']);
      await settled();
      expect(running).toHaveLength(1);
    });

    it('keeps the clip while a newer animation runs, and clears it when none is left', async () => {
      render(3);
      measures(100, 200, 150, 250);
      act(() => button('Next step').click());
      act(() => button('Next step').click());
      // The first animation settled as cancelled, but the second still needs the clip.
      await settled();
      expect(body().style.overflow).toBe('clip');
      running[0].finish();
      await settled();
      expect(body().style.overflow).toBe('');
    });
  });
});
