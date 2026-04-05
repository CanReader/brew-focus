import React, { useState, useRef, useEffect } from 'react';
import {
  Camera, AtSign, Lock, Trash2, CheckCircle, XCircle,
  Loader, AlertTriangle, Eye, EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '@supabase/supabase-js';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../utils/supabase';

// ── Avatar helpers ─────────────────────────────────────────────────────────────

function getInitials(user: User): string {
  const name = (user.user_metadata?.full_name || user.user_metadata?.name) as string | undefined;
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }
  const username = user.user_metadata?.username as string | undefined;
  if (username) return username[0].toUpperCase();
  return (user.email?.[0] ?? 'U').toUpperCase();
}

function getAvatarColor(seed: string): string {
  const palette = ['#ff4d4d', '#5b8dee', '#22d3a5', '#f5a623', '#a78bfa', '#f472b6', '#fb923c'];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--brd)',
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--t3)',
  marginBottom: 12,
};

const inputBaseStyle: React.CSSProperties = {
  height: 36,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--brd)',
  borderRadius: 10,
  padding: '0 12px',
  fontSize: 13,
  color: 'var(--t)',
  outline: 'none',
  boxShadow: 'none',
  width: '100%',
  transition: 'border-color 0.15s',
};

const smallBtnStyle: React.CSSProperties = {
  height: 32,
  padding: '0 14px',
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  transition: 'opacity 0.15s',
};

const accentBtnStyle: React.CSSProperties = {
  ...smallBtnStyle,
  background: 'linear-gradient(135deg, var(--accent), rgba(255,77,77,0.75))',
  color: '#fff',
};

const ghostBtnStyle: React.CSSProperties = {
  ...smallBtnStyle,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid var(--brd)',
  color: 'var(--t2)',
};

// ── Inline feedback ────────────────────────────────────────────────────────────

function FeedbackMsg({ type, text }: { type: 'success' | 'error'; text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        marginTop: 8,
        color: type === 'success' ? 'var(--grn)' : '#ff6b6b',
      }}
    >
      {type === 'success'
        ? <CheckCircle size={12} />
        : <XCircle size={12} />}
      {text}
    </motion.div>
  );
}

// ── Section A: Profile Picture ─────────────────────────────────────────────────

function AvatarSection({ user }: { user: User }) {
  const { updateAvatar } = useAuthStore();
  const [imgFailed, setImgFailed] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const color = getAvatarColor(user.id);
  const initials = getInitials(user);

  // Displayed image: local preview if selected, else saved avatar, else initials
  const displayUrl = preview ?? (imgFailed ? null : avatarUrl ?? null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFeedback(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setFeedback(null);
    const result = await updateAvatar(selectedFile);
    setLoading(false);
    if (result.success) {
      setFeedback({ type: 'success', text: 'Photo updated successfully.' });
      setSelectedFile(null);
      setPreview(null);
      setImgFailed(false);
    } else {
      setFeedback({ type: 'error', text: result.error ?? 'Failed to upload photo.' });
    }
  };

  return (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>
        <Camera size={10} style={{ display: 'inline', marginRight: 5 }} />
        Profile Photo
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Avatar preview */}
        <div style={{ flexShrink: 0, position: 'relative' }}>
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="Avatar"
              onError={() => { setImgFailed(true); setPreview(null); }}
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: 64, height: 64, borderRadius: '50%',
                background: `linear-gradient(135deg, ${color}, ${color}aa)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 700, color: '#fff',
                boxShadow: `0 0 0 1.5px ${color}44`,
              }}
            >
              {initials}
            </div>
          )}
          {/* Camera overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Choose photo"
            style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--card)', border: '1.5px solid var(--brd2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--t2)',
            }}
          >
            <Camera size={11} />
          </button>
        </div>

        {/* File picker + upload */}
        <div style={{ flex: 1 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {selectedFile ? (
            <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 8, wordBreak: 'break-all' }}>
              {selectedFile.name}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>
              PNG, JPG, WEBP up to 2 MB
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ ...ghostBtnStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Camera size={11} />
              Choose Photo
            </button>
            {selectedFile && (
              <button
                onClick={handleUpload}
                disabled={loading}
                style={{
                  ...accentBtnStyle,
                  opacity: loading ? 0.5 : 1,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                {loading
                  ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} />
                  : null}
                Upload
              </button>
            )}
          </div>
          <AnimatePresence>
            {feedback && <FeedbackMsg type={feedback.type} text={feedback.text} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Section B: Username ────────────────────────────────────────────────────────

type AvailStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

function UsernameSection({ user }: { user: User }) {
  const { updateUsername } = useAuthStore();
  const currentUsername = (user.user_metadata?.username as string | undefined) ?? '';

  const [input, setInput] = useState('');
  const [availStatus, setAvailStatus] = useState<AvailStatus>('idle');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isValidFormat = /^[a-z0-9_]{3,20}$/.test(input);
  const isDifferent = input !== currentUsername;
  const canSave = isValidFormat && isDifferent && availStatus === 'available' && !loading;

  const sanitize = (val: string) => val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);

  const handleChange = (val: string) => {
    const cleaned = sanitize(val);
    setInput(cleaned);
    setFeedback(null);

    if (!cleaned) { setAvailStatus('idle'); return; }
    if (cleaned === currentUsername) { setAvailStatus('idle'); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(cleaned)) { setAvailStatus('invalid'); return; }

    setAvailStatus('checking');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleaned)
        .neq('id', user.id)
        .maybeSingle();
      setAvailStatus(data ? 'taken' : 'available');
    }, 600);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleSave = async () => {
    if (!canSave) return;
    setLoading(true);
    setFeedback(null);
    const result = await updateUsername(input);
    setLoading(false);
    if (result.success) {
      setFeedback({ type: 'success', text: 'Username updated successfully.' });
      setInput('');
      setAvailStatus('idle');
    } else {
      setFeedback({ type: 'error', text: result.error ?? 'Failed to update username.' });
    }
  };

  const availIndicator = () => {
    if (!input || input === currentUsername) return null;
    if (availStatus === 'checking') return (
      <span style={{ color: '#f5a623', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
        <Loader size={10} style={{ animation: 'spin 1s linear infinite' }} /> Checking…
      </span>
    );
    if (availStatus === 'available') return (
      <span style={{ color: 'var(--grn)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
        <CheckCircle size={10} /> Available
      </span>
    );
    if (availStatus === 'taken') return (
      <span style={{ color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
        <XCircle size={10} /> Taken
      </span>
    );
    if (availStatus === 'invalid') return (
      <span style={{ color: 'var(--t3)', fontSize: 11 }}>3–20 chars, letters/numbers/underscore</span>
    );
    return null;
  };

  return (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>
        <AtSign size={10} style={{ display: 'inline', marginRight: 5 }} />
        Username
      </div>
      <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 10 }}>
        Current: <span style={{ color: 'var(--t2)', fontWeight: 600 }}>@{currentUsername || '—'}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="new_username"
            style={inputBaseStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--brd)')}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            ...accentBtnStyle,
            opacity: canSave ? 1 : 0.4,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          {loading ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          Save
        </button>
      </div>
      <div style={{ marginTop: 6, minHeight: 18 }}>{availIndicator()}</div>
      <AnimatePresence>
        {feedback && <FeedbackMsg type={feedback.type} text={feedback.text} />}
      </AnimatePresence>
    </div>
  );
}

// ── Section C: Change Password ─────────────────────────────────────────────────

function PasswordField({
  label, value, onChange, show, onToggleShow, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 5 }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputBaseStyle, paddingRight: 36 }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--brd)')}
        />
        <button
          type="button"
          onClick={onToggleShow}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--t3)',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
          }}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    </div>
  );
}

function PasswordSection() {
  const { updatePassword } = useAuthStore();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const mismatch = confirm.length > 0 && next !== confirm;
  const canSave = current.length > 0 && next.length >= 6 && next === confirm && !loading;

  const handleSave = async () => {
    if (!canSave) return;
    setLoading(true);
    setFeedback(null);
    const result = await updatePassword(current, next);
    setLoading(false);
    if (result.success) {
      setFeedback({ type: 'success', text: 'Password updated successfully.' });
      setCurrent(''); setNext(''); setConfirm('');
    } else {
      setFeedback({ type: 'error', text: result.error ?? 'Failed to update password.' });
    }
  };

  return (
    <div style={sectionStyle}>
      <div style={sectionTitleStyle}>
        <Lock size={10} style={{ display: 'inline', marginRight: 5 }} />
        Change Password
      </div>
      <PasswordField label="Current Password" value={current} onChange={setCurrent} show={showCurrent} onToggleShow={() => setShowCurrent((v) => !v)} placeholder="Enter current password" />
      <PasswordField label="New Password" value={next} onChange={setNext} show={showNext} onToggleShow={() => setShowNext((v) => !v)} placeholder="At least 6 characters" />
      <PasswordField label="Confirm New Password" value={confirm} onChange={setConfirm} show={showConfirm} onToggleShow={() => setShowConfirm((v) => !v)} placeholder="Repeat new password" />
      {mismatch && (
        <div style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 8 }}>Passwords do not match.</div>
      )}
      <button
        onClick={handleSave}
        disabled={!canSave}
        style={{
          ...accentBtnStyle,
          opacity: canSave ? 1 : 0.4,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {loading ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : null}
        Update Password
      </button>
      <AnimatePresence>
        {feedback && <FeedbackMsg type={feedback.type} text={feedback.text} />}
      </AnimatePresence>
    </div>
  );
}

// ── Section D: Danger Zone ─────────────────────────────────────────────────────

function DangerSection() {
  const { deleteAccount } = useAuthStore();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    setLoading(true);
    await deleteAccount();
    setLoading(false);
  };

  return (
    <div
      style={{
        ...sectionStyle,
        border: '1px solid rgba(255,77,77,0.3)',
        background: 'rgba(255,77,77,0.04)',
      }}
    >
      <div style={{ ...sectionTitleStyle, color: '#ff6b6b' }}>
        <AlertTriangle size={10} style={{ display: 'inline', marginRight: 5 }} />
        Danger Zone
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'rgba(255,77,77,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <Trash2 size={14} style={{ color: '#ff6b6b' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t)', marginBottom: 3 }}>
            Delete Account
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12, lineHeight: 1.5 }}>
            This permanently deletes all your data and cannot be undone.
          </div>

          <AnimatePresence mode="wait">
            {!confirming ? (
              <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button
                  onClick={() => setConfirming(true)}
                  style={{
                    ...smallBtnStyle,
                    background: 'rgba(255,77,77,0.12)',
                    border: '1px solid rgba(255,77,77,0.3)',
                    color: '#ff6b6b',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Trash2 size={11} />
                  Delete Account
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 8 }}>
                  Type <span style={{ fontWeight: 700, color: '#ff6b6b' }}>DELETE</span> to confirm
                </div>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  style={{
                    ...inputBaseStyle,
                    maxWidth: 200,
                    borderColor: confirmText === 'DELETE' ? 'rgba(255,77,77,0.5)' : 'var(--brd)',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,77,77,0.5)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = confirmText === 'DELETE' ? 'rgba(255,77,77,0.5)' : 'var(--brd)')}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    onClick={handleDelete}
                    disabled={confirmText !== 'DELETE' || loading}
                    style={{
                      ...smallBtnStyle,
                      background: confirmText === 'DELETE' ? '#ef4444' : 'rgba(255,77,77,0.12)',
                      border: '1px solid rgba(255,77,77,0.3)',
                      color: '#fff',
                      opacity: confirmText !== 'DELETE' || loading ? 0.5 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {loading ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={11} />}
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => { setConfirming(false); setConfirmText(''); }}
                    style={ghostBtnStyle}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export const AccountSettings: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div style={{ color: 'var(--t3)', fontSize: 13, padding: 16 }}>
        Not signed in.
      </div>
    );
  }

  return (
    <div>
      <AvatarSection user={user} />
      <UsernameSection user={user} />
      <PasswordSection />
      <DangerSection />
    </div>
  );
};
