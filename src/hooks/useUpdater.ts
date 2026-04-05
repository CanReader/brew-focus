import { useState, useEffect, useCallback } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdaterState {
  update: Update | null;
  checking: boolean;
  downloading: boolean;
  progress: number; // 0–100
  error: string | null;
}

export function useUpdater() {
  const [state, setState] = useState<UpdaterState>({
    update: null,
    checking: false,
    downloading: false,
    progress: 0,
    error: null,
  });

  useEffect(() => {
    // Skip update check in dev
    if (import.meta.env.DEV) return;

    const timer = setTimeout(async () => {
      setState((s) => ({ ...s, checking: true, error: null }));
      try {
        const update = await check();
        setState((s) => ({ ...s, checking: false, update: update ?? null }));
      } catch {
        // Silently ignore — update server might not exist yet
        setState((s) => ({ ...s, checking: false }));
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const installUpdate = useCallback(async () => {
    if (!state.update) return;
    setState((s) => ({ ...s, downloading: true, progress: 0, error: null }));
    try {
      let downloaded = 0;
      let total = 0;
      await state.update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? 0;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          setState((s) => ({
            ...s,
            progress: total > 0 ? Math.min(99, Math.round((downloaded / total) * 100)) : 0,
          }));
        } else if (event.event === 'Finished') {
          setState((s) => ({ ...s, progress: 100 }));
        }
      });
      await relaunch();
    } catch (e) {
      setState((s) => ({
        ...s,
        downloading: false,
        error: e instanceof Error ? e.message : 'Update failed.',
      }));
    }
  }, [state.update]);

  const dismiss = useCallback(() => {
    setState((s) => ({ ...s, update: null, error: null }));
  }, []);

  return { ...state, installUpdate, dismiss };
}
