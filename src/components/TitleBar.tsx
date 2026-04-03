import React from 'react';
import { Settings, Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { motion } from 'framer-motion';

interface TitleBarProps {
  activeTab: 'focus' | 'tasks' | 'reports';
  onTabChange: (tab: 'focus' | 'tasks' | 'reports') => void;
  onSettingsClick: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  activeTab,
  onTabChange,
  onSettingsClick,
}) => {
  const handleMinimize = async () => {
    const win = getCurrentWindow();
    await win.minimize();
  };

  const handleMaximize = async () => {
    const win = getCurrentWindow();
    const maximized = await win.isMaximized();
    if (maximized) {
      await win.unmaximize();
    } else {
      await win.maximize();
    }
  };

  const handleClose = async () => {
    const win = getCurrentWindow();
    await win.close();
  };

  const tabs: { id: 'focus' | 'tasks' | 'reports'; label: string }[] = [
    { id: 'focus', label: 'Focus' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <div
      className="h-[42px] flex items-center justify-between px-3 shrink-0 relative"
      style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--brd)',
      }}
      data-tauri-drag-region
    >
      {/* Top gradient accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--accent) 40%, var(--blu) 70%, transparent 100%)',
          opacity: 0.25,
        }}
      />

      {/* Left: Logo */}
      <div className="flex items-center gap-2 select-none shrink-0" data-no-drag>
        <img
          src="/logo.svg"
          alt="Brew Focus"
          className="w-6 h-6 rounded-md shrink-0"
          style={{ filter: 'drop-shadow(0 0 6px var(--accent-g))' }}
        />
        <span
          className="font-fraunces text-[15px] font-semibold"
          style={{
            color: 'var(--t)',
            letterSpacing: '-0.3px',
          }}
        >
          Brew Focus
        </span>
      </div>

      {/* Center: Tab switcher */}
      <div
        className="flex items-center gap-0.5 rounded-xl p-0.5 absolute left-1/2 -translate-x-1/2"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--brd)',
        }}
        data-no-drag
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative px-3.5 py-1 rounded-lg text-[12px] font-medium transition-colors duration-150"
              style={{
                color: isActive ? 'var(--t)' : 'var(--t3)',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-active-bg"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: 'var(--card-h)',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.4)',
                  }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="tab-active-dot"
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: 'var(--accent)' }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Right: Settings + window controls */}
      <div className="flex items-center gap-0.5 shrink-0" data-no-drag>
        <button
          onClick={onSettingsClick}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--card)';
            e.currentTarget.style.color = 'var(--t2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--t3)';
          }}
          title="Settings"
        >
          <Settings size={13} />
        </button>

        <div className="w-px h-3.5 mx-1.5" style={{ background: 'var(--brd)' }} />

        <button
          onClick={handleMinimize}
          className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'var(--t2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--t3)';
          }}
        >
          <Minus size={11} />
        </button>
        <button
          onClick={handleMaximize}
          className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'var(--t2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--t3)';
          }}
        >
          <Square size={9} />
        </button>
        <button
          onClick={handleClose}
          className="w-6 h-6 flex items-center justify-center rounded-md transition-all"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.boxShadow = '0 0 12px var(--accent-g)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--t3)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
};
