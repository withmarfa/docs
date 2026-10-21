import { useEffect } from 'react';

// A link clicked with a pointer navigates within the app, so the page changes
// but focus stays on the link. The next key the reader presses, such as an
// arrow to scroll, then makes the browser treat that focus as keyboard focus
// and draw the ring on a sidebar row. Releasing focus after a pointer click
// avoids that; a link followed from the keyboard (detail 0) keeps its focus.
export function PointerFocus() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.detail === 0) return;
      const link = (event.target as Element | null)?.closest?.('a');
      if (link) setTimeout(() => link.blur(), 0);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  return null;
}
