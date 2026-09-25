import { useState, useCallback, useEffect, useRef } from 'react';
import { getCurrentWindow, LogicalSize, PhysicalPosition, currentMonitor } from '@tauri-apps/api/window';

export type WindowMode = 'normal' | 'fullscreen' | 'widget';

interface WindowState {
  width: number;
  height: number;
  // physical px, so it restores right across monitors with different scaling
  x: number;
  y: number;
}

const WIDGET_SIZE = { width: 280, height: 320 };
const DEFAULT_SIZE = { width: 1100, height: 700 };
const MIN_SIZE = { width: 800, height: 600 };

export function useWindowMode() {
  const [mode, setMode] = useState<WindowMode>('normal');
  const savedStateRef = useRef<WindowState | null>(null);

  // Save current window state before changing modes (only when in normal mode)
  const saveWindowState = useCallback(async () => {
    // Only save if we're in normal mode - don't overwrite with fullscreen/widget dimensions
    if (savedStateRef.current !== null) return;

    try {
      const win = getCurrentWindow();
      const size = await win.innerSize();
      const position = await win.innerPosition();

      // Get scale factor for proper conversion
      const monitor = await currentMonitor();
      const scaleFactor = monitor?.scaleFactor ?? 1;

      savedStateRef.current = {
        width: size.width / scaleFactor,
        height: size.height / scaleFactor,
        x: position.x,
        y: position.y,
      };
    } catch (err) {
      console.error('Failed to save window state:', err);
    }
  }, []);

  // Restore saved window state
  const restoreWindowState = useCallback(async () => {
    const win = getCurrentWindow();

    try {
      // First, reset min size to allow proper resizing
      await win.setMinSize(new LogicalSize(MIN_SIZE.width, MIN_SIZE.height));
      await win.setResizable(true);
      await win.setAlwaysOnTop(false);

      if (savedStateRef.current) {
        const { width, height, x, y } = savedStateRef.current;
        await win.setSize(new LogicalSize(width, height));
        await win.setPosition(new PhysicalPosition(x, y));
      } else {
        // Nothing saved, fall back to default size and center it
        await win.setSize(new LogicalSize(DEFAULT_SIZE.width, DEFAULT_SIZE.height));
        await win.center();
      }

      // Clear saved state after restoring
      savedStateRef.current = null;
    } catch (err) {
      console.error('Failed to restore window state:', err);
    }
  }, []);

  const enterFullscreen = useCallback(async () => {
    if (mode === 'fullscreen') return;

    try {
      // Save state only if coming from normal mode
      if (mode === 'normal') {
        await saveWindowState();
      }

      const win = getCurrentWindow();

      // If coming from widget, first reset some properties
      if (mode === 'widget') {
        await win.setAlwaysOnTop(false);
        await win.setResizable(true);
      }

      await win.setFullscreen(true);
      setMode('fullscreen');
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
      // If the transition failed while we just saved normal-mode geometry, drop
      // it — leaving a stale save makes the next enter skip saving (guard at top
      // of saveWindowState) and restore to the wrong size/position later.
      if (mode === 'normal') savedStateRef.current = null;
    }
  }, [mode, saveWindowState]);

  const exitFullscreen = useCallback(async () => {
    try {
      const win = getCurrentWindow();
      await win.setFullscreen(false);

      // Small delay to let the window exit fullscreen properly
      await new Promise(resolve => setTimeout(resolve, 100));

      await restoreWindowState();
      setMode('normal');
    } catch (err) {
      console.error('Failed to exit fullscreen:', err);
    }
  }, [restoreWindowState]);

  const enterWidget = useCallback(async () => {
    if (mode === 'widget') return;

    try {
      const win = getCurrentWindow();

      // Save state only if coming from normal mode
      if (mode === 'normal') {
        await saveWindowState();
      }

      // Exit fullscreen first if needed
      if (mode === 'fullscreen') {
        await win.setFullscreen(false);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Set widget properties
      await win.setMinSize(new LogicalSize(WIDGET_SIZE.width, WIDGET_SIZE.height));
      await win.setSize(new LogicalSize(WIDGET_SIZE.width, WIDGET_SIZE.height));
      await win.setResizable(false);
      await win.setAlwaysOnTop(true);

      // Bottom-right corner of the monitor the window is on. monitor.position is
      // the monitor's origin in the virtual desktop, without it the widget always
      // jumps to the primary display.
      const monitor = await currentMonitor();
      if (monitor) {
        const { position, size, scaleFactor } = monitor;
        await win.setPosition(new PhysicalPosition(
          position.x + size.width - Math.round((WIDGET_SIZE.width + 20) * scaleFactor),
          position.y + size.height - Math.round((WIDGET_SIZE.height + 60) * scaleFactor)
        ));
      }

      setMode('widget');
    } catch (err) {
      console.error('Failed to enter widget mode:', err);
      if (mode === 'normal') savedStateRef.current = null;
    }
  }, [mode, saveWindowState]);

  const exitWidget = useCallback(async () => {
    try {
      const win = getCurrentWindow();
      await win.setAlwaysOnTop(false);

      // Small delay before restoring
      await new Promise(resolve => setTimeout(resolve, 50));

      await restoreWindowState();
      setMode('normal');
    } catch (err) {
      console.error('Failed to exit widget mode:', err);
    }
  }, [restoreWindowState]);

  const toggleFullscreen = useCallback(async () => {
    if (mode === 'fullscreen') {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [mode, enterFullscreen, exitFullscreen]);

  const toggleWidget = useCallback(async () => {
    if (mode === 'widget') {
      await exitWidget();
    } else {
      await enterWidget();
    }
  }, [mode, enterWidget, exitWidget]);

  const exitToNormal = useCallback(async () => {
    if (mode === 'fullscreen') {
      await exitFullscreen();
    } else if (mode === 'widget') {
      await exitWidget();
    }
  }, [mode, exitFullscreen, exitWidget]);

  // Handle escape key to exit fullscreen/widget
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode !== 'normal') {
        exitToNormal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, exitToNormal]);

  return {
    mode,
    isFullscreen: mode === 'fullscreen',
    isWidget: mode === 'widget',
    isNormal: mode === 'normal',
    enterFullscreen,
    exitFullscreen,
    enterWidget,
    exitWidget,
    toggleFullscreen,
    toggleWidget,
    exitToNormal,
  };
}
