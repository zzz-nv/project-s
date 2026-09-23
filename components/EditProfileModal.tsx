'use client';

import { useState } from 'react';
import { supabase } from '@/app/supabase';

interface EditProfileModalProps {
  profile: any;
  onClose: () => void;
  onUpdate: (updatedData: any) => void;
}

export default function EditProfileModal({ profile, onClose, onUpdate }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        bio: bio.trim(),
      })
      .eq('id', profile.id);

    setIsSaving(false);

    if (!error) {
      // Pass the new data back to the parent page so it updates instantly without a reload
      onUpdate({ ...profile, display_name: displayName.trim(), bio: bio.trim() });
      onClose();
    } else {
      alert('Failed to update profile.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm px-4">
      <div className="bg-background border border-border-subtle rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <form onSubmit={handleSave}>
          
          <div className="flex items-center justify-between p-4 border-b border-border-subtle">
            <button type="button" onClick={onClose} className="text-text-muted hover:text-white transition font-bold">
              Cancel
            </button>
            <h2 className="font-bold text-lg text-zinc-200">Edit Profile</h2>
            <button 
              type="submit" 
              disabled={isSaving}
              className="bg-white hover:bg-zinc-200 text-background font-bold py-1.5 px-4 rounded-full text-sm transition disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>

          <div className="p-4 space-y-6">
            <div>
              <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">Display Name</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">Bio</label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={3}
                className="w-full bg-surface border border-border-subtle rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand transition-colors resize-none"
              />
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}