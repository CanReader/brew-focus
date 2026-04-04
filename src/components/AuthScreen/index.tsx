import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Coffee, CheckCircle, AtSign } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

type Mode = 'signIn' | 'signUp' | 'forgot';

function InputField({
  label,
  type,
  value,
  onChange,
  placeholder,
  icon,
  rightSlot,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon: React.ReactNode;
  rightSlot?: React.ReactNode;
  autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium" style={{ color: 'var(--t3)' }}>{label}</label>
      <div
        className="flex items-center gap-2.5 px-3.5 rounded-xl h-11 transition-all duration-150"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${focused ? 'var(--accent-g)' : 'var(--brd)'}`,
          boxShadow: focused ? '0 0 0 3px var(--accent-d)' : 'none',
        }}
      >
        <span style={{ color: focused ? 'var(--accent)' : 'var(--t3)', transition: 'color 0.15s' }}>{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent text-[13px] outline-none placeholder:opacity-30"
          style={{ color: 'var(--t)' }}
        />
        {rightSlot}
      </div>
    </div>
  );
}

export const AuthScreen: React.FC = () => {
  const { signIn, signUp, resetPassword, isLoading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<Mode>('signIn');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const switchMode = (next: Mode) => {
    setMode(next);
    setUsernameOrEmail('');
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setSuccessMsg('');
    clearError();
  };

  const isValidUsername = (v: string) => /^[a-z0-9_]{3,20}$/.test(v.toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    clearError();

    if (mode === 'forgot') {
      const ok = await resetPassword(email);
      if (ok) setSuccessMsg(`Reset link sent to ${email}. Check your inbox.`);
      return;
    }

    if (mode === 'signUp') {
      if (password !== confirmPassword) return;
      if (!isValidUsername(username)) return;
      const result = await signUp(email, password, username);
      if (result.success && result.needsConfirmation) {
        setSuccessMsg('Account created! Check your email to confirm before signing in.');
      }
      return;
    }

    await signIn(usernameOrEmail, password);
  };

  const eyeButton = (show: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      className="p-0.5 transition-colors"
      style={{ color: 'var(--t3)' }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; }}
    >
      {show ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );

  const passwordsMatch = mode !== 'signUp' || !confirmPassword || password === confirmPassword;

  return (
    <div
      className="w-full h-full flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Background blobs */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 700, height: 700, borderRadius: '50%',
          background: 'rgba(255,77,77,0.055)',
          filter: 'blur(120px)',
          top: '-15%', left: '50%', transform: 'translateX(-50%)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400, height: 400, borderRadius: '50%',
          background: 'rgba(91,141,238,0.04)',
          filter: 'blur(80px)',
          bottom: '5%', right: '5%',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: 300, height: 300, borderRadius: '50%',
          background: 'rgba(167,139,250,0.035)',
          filter: 'blur(60px)',
          top: '20%', left: '5%',
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full mx-4 rounded-3xl flex flex-col"
        style={{
          maxWidth: 420,
          background: 'var(--card)',
          border: '1px solid var(--brd2)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)',
        }}
      >
        {/* Gradient top border */}
        <div
          className="absolute top-0 left-0 right-0 h-px rounded-t-3xl pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 5%, var(--accent) 35%, var(--blu) 65%, transparent 95%)' }}
        />

        {/* Brand header */}
        <div className="flex flex-col items-center pt-9 pb-7 px-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.35, ease: 'backOut' }}
            className="relative"
            style={{ filter: 'drop-shadow(0 0 22px rgba(255,77,77,0.32))' }}
          >
            <img src="/logo.svg" alt="Brew Focus" className="w-14 h-14 rounded-2xl" draggable={false} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.3 }}
            className="text-center mt-4"
          >
            <h1
              className="font-fraunces text-[22px] font-semibold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, var(--t) 0%, var(--t2) 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}
            >
              Brew Focus
            </h1>
            <p className="text-[12px] mt-1" style={{ color: 'var(--t3)' }}>
              {mode === 'forgot' ? 'Reset your password' : 'Your personal focus space'}
            </p>
          </motion.div>
        </div>

        {/* Tab switcher — hidden on forgot mode */}
        {mode !== 'forgot' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.22 }}
            className="flex mx-6 mb-5 p-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}
          >
            {(['signIn', 'signUp'] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className="flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all duration-150"
                style={{
                  background: mode === m ? 'rgba(255,255,255,0.09)' : 'transparent',
                  color: mode === m ? 'var(--t)' : 'var(--t3)',
                  border: mode === m ? '1px solid var(--brd2)' : '1px solid transparent',
                }}
              >
                {m === 'signIn' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </motion.div>
        )}

        {/* Form */}
        <div className="px-6 pb-8">
          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === 'signUp' ? 12 : -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'signUp' ? -12 : 12 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-3.5"
            >
              {/* Success message */}
              <AnimatePresence>
                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 4 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
                    style={{ background: 'rgba(34,211,165,0.08)', border: '1px solid rgba(34,211,165,0.2)' }}
                  >
                    <CheckCircle size={14} style={{ color: 'var(--grn)', marginTop: 1, flexShrink: 0 }} />
                    <span className="text-[12px] leading-snug" style={{ color: 'var(--grn)' }}>{successMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
                    style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)' }}
                  >
                    <span className="text-[18px] leading-none" style={{ marginTop: -1 }}>⚠️</span>
                    <span className="text-[12px] leading-snug" style={{ color: '#ff6b6b' }}>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sign in: username or email */}
              {mode === 'signIn' && (
                <InputField
                  label="Username or email"
                  type="text"
                  value={usernameOrEmail}
                  onChange={setUsernameOrEmail}
                  placeholder="username or you@example.com"
                  icon={<AtSign size={14} />}
                  autoComplete="username"
                />
              )}

              {/* Sign up: username */}
              {mode === 'signUp' && (
                <div>
                  <InputField
                    label="Username"
                    type="text"
                    value={username}
                    onChange={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="your_username"
                    icon={<AtSign size={14} />}
                    autoComplete="username"
                  />
                  {username && !isValidUsername(username) && (
                    <p className="text-[11px] mt-1.5 ml-1" style={{ color: '#f5a623' }}>
                      3–20 chars, letters, numbers, underscores only
                    </p>
                  )}
                </div>
              )}

              {/* Email (sign up + forgot) */}
              {mode !== 'signIn' && (
                <InputField
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  icon={<Mail size={14} />}
                  autoComplete="email"
                />
              )}

              {/* Password (not shown on forgot) */}
              {mode !== 'forgot' && (
                <InputField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  icon={<Lock size={14} />}
                  rightSlot={eyeButton(showPassword, () => setShowPassword(!showPassword))}
                  autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                />
              )}

              {/* Confirm password (sign up only) */}
              {mode === 'signUp' && (
                <div>
                  <InputField
                    label="Confirm password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="••••••••"
                    icon={<Lock size={14} />}
                    rightSlot={eyeButton(showConfirmPassword, () => setShowConfirmPassword(!showConfirmPassword))}
                    autoComplete="new-password"
                  />
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-[11px] mt-1.5 ml-1" style={{ color: '#ff6b6b' }}>
                      Passwords do not match
                    </p>
                  )}
                </div>
              )}

              {/* Forgot password link */}
              {mode === 'signIn' && (
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-[11px] transition-colors"
                    style={{ color: 'var(--t3)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading || (mode === 'signUp' && (!passwordsMatch || !isValidUsername(username)))}
                className="flex items-center justify-center gap-2 h-11 rounded-xl text-[13px] font-semibold mt-1 transition-all duration-150"
                style={{
                  background: isLoading ? 'rgba(255,77,77,0.4)' : 'linear-gradient(135deg, var(--accent) 0%, rgba(255,77,77,0.75) 100%)',
                  color: '#fff',
                  boxShadow: isLoading ? 'none' : '0 4px 16px rgba(255,77,77,0.3)',
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,77,77,0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isLoading ? 'none' : '0 4px 16px rgba(255,77,77,0.3)'; }}
              >
                {isLoading ? (
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <>
                    <Coffee size={14} />
                    {mode === 'signIn' ? 'Sign in' : mode === 'signUp' ? 'Create account' : 'Send reset link'}
                    <ArrowRight size={13} />
                  </>
                )}
              </button>

              {/* Back to sign in (forgot mode) */}
              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => switchMode('signIn')}
                  className="text-[12px] text-center mt-1 transition-colors"
                  style={{ color: 'var(--t3)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--t2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--t3)'; }}
                >
                  ← Back to sign in
                </button>
              )}
            </motion.form>
          </AnimatePresence>
        </div>

        {/* Footer divider */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <div className="flex-1 h-px" style={{ background: 'var(--brd)' }} />
          <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
            {mode === 'signUp'
              ? 'Already have an account?'
              : mode === 'signIn'
              ? 'New to Brew Focus?'
              : ''}
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--brd)' }} />
        </div>
        {mode !== 'forgot' && (
          <div className="pb-7 px-6 -mt-3 text-center">
            <button
              onClick={() => switchMode(mode === 'signIn' ? 'signUp' : 'signIn')}
              className="text-[12px] font-medium transition-colors"
              style={{ color: 'var(--accent)' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              {mode === 'signIn' ? 'Create a free account →' : '← Sign in instead'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
