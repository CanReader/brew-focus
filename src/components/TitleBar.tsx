import React, { useRef, useState, useEffect } from 'react';
import { Settings, Minus, Square, X, RefreshCw, LogOut, ChevronDown, Zap } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '@supabase/supabase-js';
import { useAuthStore } from '../store/authStore';

// ── Avatar helpers ─────────────────────────────────────────────────────────────

function getInitials(user: User): string {
  const name = (user.user_metadata?.full_name || user.user_metadata?.name) as string | undefined;
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return (user.email?.[0] ?? 'U').toUpperCase();
}

function getDisplayName(user: User): string {
  const name = (user.user_metadata?.full_name || user.user_metadata?.name) as string | undefined;
  if (name) return name;
  return user.email?.split('@')[0] ?? 'User';
}

function getAvatarColor(seed: string): string {
  const palette = ['#ff4d4d', '#5b8dee', '#22d3a5', '#f5a623', '#a78bfa', '#f472b6', '#fb923c'];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

// ── Avatar component ──────────────────────────────────────────────────────────

function Avatar({ user, size = 24 }: { user: User; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const color = getAvatarColor(user.id);
  const initials = getInitials(user);

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={getDisplayName(user)}
        onError={() => setImgFailed(true)}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
        draggable={false}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-bold select-none"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}, ${color}aa)`,
        fontSize: size * 0.38,
        color: '#fff',
        boxShadow: `0 0 0 1.5px ${color}44`,
      }}
    >
      {initials}
    </div>
  );
}

// ── User popover ──────────────────────────────────────────────────────────────

function UserPopover({ user, onClose }: { user: User; onClose: () => void }) {
  const { signOut } = useAuthStore();
  const displayName = getDisplayName(user);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className="absolute right-0 top-[calc(100%+6px)] w-[230px] rounded-2xl overflow-hidden z-50"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--brd2)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      {/* Gradient top border */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, var(--accent), var(--blu), transparent)' }}
      />

      {/* Profile section */}
      <div className="flex items-center gap-3 px-4 py-4">
        <Avatar user={user} size={40} />
        <div className="flex flex-col min-w-0">
          <span
            className="text-[13px] font-semibold truncate"
            style={{ color: 'var(--t)' }}
          >
            {displayName}
          </span>
          <span
            className="text-[11px] truncate mt-0.5"
            style={{ color: 'var(--t3)' }}
          >
            {user.email}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--brd)', margin: '0 12px' }} />

      {/* Actions */}
      <div className="p-2 flex flex-col gap-0.5">

        {/* Sync Now */}
        <button
          onClick={() => { /* TODO: implement sync */ onClose(); }}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-150 text-left"
          style={{ color: 'var(--t2)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'var(--t)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--t2)';
          }}
        >
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(91,141,238,0.15)', color: 'var(--blu)' }}
          >
            <RefreshCw size={11} />
          </div>
          Sync Now
          <span
            className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{ background: 'rgba(245,166,35,0.15)', color: '#f5a623' }}
          >
            SOON
          </span>
        </button>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--brd)', margin: '4px 4px' }} />

        {/* Sign out */}
        <button
          onClick={() => { signOut(); onClose(); }}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-150 text-left"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,77,77,0.08)';
            e.currentTarget.style.color = '#ff6b6b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--t3)';
          }}
        >
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,77,77,0.1)', color: '#ff6b6b' }}
          >
            <LogOut size={11} />
          </div>
          Sign out
        </button>
      </div>

      {/* Footer: version / plan */}
      <div
        className="flex items-center gap-1.5 px-4 py-2.5"
        style={{ borderTop: '1px solid var(--brd)' }}
      >
        <Zap size={9} style={{ color: 'var(--accent)' }} />
        <span className="text-[10px]" style={{ color: 'var(--t3)' }}>Brew Focus — Free plan</span>
      </div>
    </motion.div>
  );
}

// ── User badge (button in titlebar) ──────────────────────────────────────────

function UserBadge({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayName = getDisplayName(user);
  const shortName = displayName.length > 14 ? displayName.slice(0, 13) + '…' : displayName;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-xl transition-all duration-150 select-none"
        style={{
          background: open ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? 'var(--brd2)' : 'var(--brd)'}`,
          maxWidth: 160,
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
            e.currentTarget.style.borderColor = 'var(--brd2)';
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.borderColor = 'var(--brd)';
          }
        }}
      >
        <Avatar user={user} size={20} />
        <span
          className="text-[11px] font-medium truncate"
          style={{ color: 'var(--t2)', maxWidth: 90 }}
        >
          {shortName}
        </span>
        <ChevronDown
          size={10}
          style={{
            color: 'var(--t3)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        />
      </button>

      <AnimatePresence>
        {open && <UserPopover user={user} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ── TitleBar ──────────────────────────────────────────────────────────────────

interface TitleBarProps {
  activeTab: 'focus' | 'tasks' | 'reports';
  onTabChange: (tab: 'focus' | 'tasks' | 'reports') => void;
  onSettingsClick: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ activeTab, onTabChange, onSettingsClick }) => {
  const { user } = useAuthStore();

  const handleMinimize = async () => { const win = getCurrentWindow(); await win.minimize(); };
  const handleMaximize = async () => {
    const win = getCurrentWindow();
    (await win.isMaximized()) ? await win.unmaximize() : await win.maximize();
  };
  const handleClose = async () => { const win = getCurrentWindow(); await win.close(); };

  const tabs: { id: 'focus' | 'tasks' | 'reports'; label: string }[] = [
    { id: 'focus',   label: 'Focus'   },
    { id: 'tasks',   label: 'Tasks'   },
    { id: 'reports', label: 'Reports' },
  ];

  return (
    <div
      className="h-[42px] flex items-center justify-between px-3 shrink-0 relative"
      style={{ background: 'var(--bg)', borderBottom: '1px solid var(--brd)' }}
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
          style={{ color: 'var(--t)', letterSpacing: '-0.3px' }}
        >
          Brew Focus
        </span>
      </div>

      {/* Center: Tab switcher */}
      <div
        className="flex items-center gap-0.5 rounded-xl p-0.5 absolute left-1/2 -translate-x-1/2"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}
        data-no-drag
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative px-3.5 py-1 rounded-lg text-[12px] font-medium transition-colors duration-150"
              style={{ color: isActive ? 'var(--t)' : 'var(--t3)' }}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-active-bg"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: 'var(--card-h)', boxShadow: '0 1px 6px rgba(0,0,0,0.4)' }}
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

      {/* Right: User badge + settings + window controls */}
      <div className="flex items-center gap-1.5 shrink-0" data-no-drag>
        {/* User badge */}
        {user && <UserBadge user={user} />}

        <div className="w-px h-3.5 mx-0.5" style={{ background: 'var(--brd)' }} />

        {/* Settings */}
        <button
          onClick={onSettingsClick}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = 'var(--t2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
          title="Settings"
        >
          <Settings size={13} />
        </button>

        <div className="w-px h-3.5 mx-1" style={{ background: 'var(--brd)' }} />

        {/* Window controls */}
        <button
          onClick={handleMinimize}
          className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--t2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
        >
          <Minus size={11} />
        </button>
        <button
          onClick={handleMaximize}
          className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--t2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
        >
          <Square size={9} />
        </button>
        <button
          onClick={handleClose}
          className="w-6 h-6 flex items-center justify-center rounded-md transition-all"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.boxShadow = '0 0 12px var(--accent-g)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
};
