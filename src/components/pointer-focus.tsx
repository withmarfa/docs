import { useEffect } from 'react';

// Records how the reader last moved focus, on the root element, so the focus
// ring in src/styles/app.css shows only after Tab. A browser matches
// :focus-visible on an element the reader clicked as soon as any key is
// pressed, so the ring cannot be left to :focus-visible alone.
//
// `data-input="pointer"` on any press of the mouse, pen or finger;
// `data-input="keyboard"` on Tab or Shift+Tab. Arrow keys, space and typing
// change nothing. Before either, there is no attribute and the ring may show.
export function PointerFocus() {
  useEffect(() => {
    const root = document.documentElement;
    const onPointerDown = () => {
      root.dataset.input = 'pointer';
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
      root.dataset.input = 'keyboard';
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      delete root.dataset.input;
    };
  }, []);
  return null;
}
