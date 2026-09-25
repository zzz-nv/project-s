'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/app/supabase';

export default function ChangePasswordModal({
  onClose,
  userEmail,
}: {
  onClose: () => void;
  userEmail: string;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!currentPassword) return setError('Enter your current password.');
    if (newPassword.length < 6) return setError('New password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setError('New passwords do not match.');
    if (currentPassword === newPassword) return setError('New password must be different.');

    setSaving(true);

    // Verify current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });

    if (verifyError) {
      setSaving(false);
      setError('Current password is incorrect.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (updateError) return setError(updateError.message);

    setSuccess(true);
    setTimeout(() => onClose(), 1200);
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.form
          onSubmit={handleSubmit}
          initial={{ scale: 0.95, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-zinc-950 border border-border-subtle rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border-subtle">
            <h2 className="text-lg font-bold text-white">Change password</h2>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoFocus
                className="w-full bg-background border border-border-subtle rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-background border border-border-subtle rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wider">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-background border border-border-subtle rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {success && <p className="text-emerald-400 text-sm">Password updated.</p>}
          </div>

          <div className="px-5 py-4 border-t border-border-subtle flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-bold text-zinc-300 hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || success}
              className="px-4 py-2 rounded-full text-sm font-bold bg-brand hover:bg-brand-hover disabled:opacity-50 text-white transition-colors active:scale-95"
            >
              {saving ? 'Updating…' : 'Update'}
            </button>
          </div>
        </motion.form>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}