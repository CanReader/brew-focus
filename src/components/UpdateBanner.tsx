import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, RefreshCw, ArrowUp } from 'lucide-react';
import type { Update } from '@tauri-apps/plugin-updater';

interface UpdateBannerProps {
  update: Update | null;
  downloading: boolean;
  progress: number;
  error: string | null;
  onInstall: () => void;
  onDismiss: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  update, downloading, progress, error, onInstall, onDismiss,
}) => {
  return (
    <AnimatePresence>
      {(update || error) && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden shrink-0"
        >
          <div
            className="flex items-center gap-3 px-4 py-2 text-[12px] relative overflow-hidden"
            style={{
              background: error
                ? 'rgba(255,77,77,0.08)'
                : 'linear-gradient(90deg, rgba(91,141,238,0.1), rgba(167,139,250,0.08))',
              borderBottom: `1px solid ${error ? 'rgba(255,77,77,0.2)' : 'rgba(91,141,238,0.2)'}`,
            }}
          >
            {downloading && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
                }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: error ? 'rgba(255,77,77,0.15)' : 'rgba(91,141,238,0.15)',
                color: error ? '#ff6b6b' : 'var(--blu)',
              }}
            >
              {downloading
                ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                : error
                ? <X size={12} />
                : <ArrowUp size={12} />}
            </div>

            <div className="flex-1 min-w-0">
              {error ? (
                <span style={{ color: '#ff6b6b' }}>{error}</span>
              ) : downloading ? (
                <span style={{ color: 'var(--t2)' }}>
                  Downloading update…
                  {progress > 0 && (
                    <span style={{ color: 'var(--blu)', marginLeft: 6, fontWeight: 600 }}>
                      {progress}%
                    </span>
                  )}
                </span>
              ) : (
                <span style={{ color: 'var(--t2)' }}>
                  <span style={{ color: 'var(--t)', fontWeight: 600 }}>
                    v{update?.version}
                  </span>
                  {' '}is available
                  {update?.body && (
                    <span style={{ color: 'var(--t3)', marginLeft: 6 }}>— {update.body}</span>
                  )}
                </span>
              )}
            </div>

            {downloading && progress > 0 && (
              <div
                className="h-1 rounded-full overflow-hidden shrink-0"
                style={{ width: 80, background: 'rgba(255,255,255,0.08)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--blu)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut' }}
                />
              </div>
            )}

            {!downloading && !error && (
              <button
                onClick={onInstall}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-all"
                style={{
                  background: 'rgba(91,141,238,0.2)',
                  border: '1px solid rgba(91,141,238,0.35)',
                  color: 'var(--blu)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(91,141,238,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(91,141,238,0.2)'; }}
              >
                <Download size={11} />
                Install & Restart
              </button>
            )}

            {!downloading && (
              <button
                onClick={onDismiss}
                className="w-5 h-5 flex items-center justify-center rounded-md shrink-0 transition-all"
                style={{ color: 'var(--t3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={11} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
