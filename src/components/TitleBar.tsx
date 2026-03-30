import React from 'react';
import { Settings, Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface TitleBarProps {
  activeTab: 'focus' | 'tasks';
  onTabChange: (tab: 'focus' | 'tasks') => void;
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

  return (
    <div
      className="h-[46px] flex items-center justify-between px-4 shrink-0 border-b"
      style={{ borderColor: 'var(--brd)', background: 'var(--bg)' }}
      data-tauri-drag-region
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5 select-none" data-no-drag>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 4h10v1H3V4zM3 6h8c0 2.5-1 5-4 5S3 8.5 3 6z" fill="white" opacity="0.9"/>
            <path d="M11 7h1.5a1.5 1.5 0 000-3H11" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
            <path d="M5 11.5c1 .5 5 .5 6 0" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M5.5 3.5c0-1 1-1.5 1-2.5M7.5 3.5c0-1 1-1.5 1-2.5" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
          </svg>
        </div>
        <span className="font-fraunces text-[17px] font-semibold" style={{ color: 'var(--t)' }}>
          Brew
        </span>
        <span className="text-[13px] font-light tracking-widest uppercase" style={{ color: 'var(--t3)' }}>
          Focus
        </span>
      </div>

      {/* Center: Tab switcher */}
      <div
        className="flex items-center gap-0.5 rounded-xl p-1"
        style={{ background: 'var(--card)' }}
        data-no-drag
      >
        <button
          onClick={() => onTabChange('focus')}
          className="px-4 py-1 rounded-lg text-[13px] font-medium transition-all duration-200"
          style={{
            background: activeTab === 'focus' ? 'var(--card-h)' : 'transparent',
            color: activeTab === 'focus' ? 'var(--t)' : 'var(--t3)',
            boxShadow: activeTab === 'focus' ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          Focus
        </button>
        <button
          onClick={() => onTabChange('tasks')}
          className="px-4 py-1 rounded-lg text-[13px] font-medium transition-all duration-200"
          style={{
            background: activeTab === 'tasks' ? 'var(--card-h)' : 'transparent',
            color: activeTab === 'tasks' ? 'var(--t)' : 'var(--t3)',
            boxShadow: activeTab === 'tasks' ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          Tasks
        </button>
      </div>

      {/* Right: Settings + window controls */}
      <div className="flex items-center gap-1" data-no-drag>
        <button
          onClick={onSettingsClick}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 hover:scale-105"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Settings"
        >
          <Settings size={15} />
        </button>

        <div className="w-px h-4 mx-1" style={{ background: 'var(--brd)' }} />

        <button
          onClick={handleMinimize}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--brd2)';
            e.currentTarget.style.color = 'var(--t)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--t3)';
          }}
        >
          <Minus size={12} />
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--brd2)';
            e.currentTarget.style.color = 'var(--t)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--t3)';
          }}
        >
          <Square size={10} />
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--t3)';
          }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};
