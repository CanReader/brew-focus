import { useEffect } from 'react';
import { playClick } from '../utils/sounds';

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const el = target.closest(
    'button, a, [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="checkbox"], [role="radio"], [role="switch"]'
  );
  if (!el) return false;
  // Skip disabled elements
  if ((el as HTMLButtonElement).disabled) return false;
  return true;
}

/**
 * Attaches a global click listener that plays a subtle click sound
 * whenever an interactive element (button, link, etc.) is clicked.
 * Controlled by the `enabled` flag from settings.
 */
export function useClickSound(enabled: boolean, volumePct: number) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: MouseEvent) => {
      if (isInteractive(e.target)) {
        playClick(volumePct);
      }
    };

    document.addEventListener('click', handler, { capture: true });
    return () => document.removeEventListener('click', handler, { capture: true });
  }, [enabled, volumePct]);
}
