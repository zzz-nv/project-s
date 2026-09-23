'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/supabase';
import InlineBackButton from '@/components/InlineBackButton';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('account');
  const [searchQuery, setSearchQuery] = useState('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Securely fetch active session credentials on mount
  useEffect(() => {
    async function loadAuthUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserEmail(session.user.email || '');
      setUserId(session.user.id || '');
      setLoading(false);
    }
    loadAuthUser();
  }, [router]);

  const navigationSections = [
    {
      title: 'ACCOUNT',
      items: [
        { id: 'account', label: 'Your account', desc: 'Account information and data options' },
        { id: 'profile', label: 'Profile customization', desc: 'Manage your public persona and bio' },
        { id: 'security', label: 'Security and access', desc: 'Password and session management' },
      ]
    },
    {
      title: 'PREFERENCES',
      items: [
        { id: 'privacy', label: 'Privacy and safety', desc: 'Control visibility and interactions' },
        { id: 'notifications', label: 'Notifications', desc: 'Manage alerts and push updates' },
        { id: 'appearance', label: 'Display and theme', desc: 'Dark mode and typography scaling' },
      ]
    }
  ];

  // Safeguard: If search filters out the active tab, fallback safely to the first available item
  const filteredSections = navigationSections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white flex w-full">
      
      {/* LEFT SIDEBAR: Professional Dashboard Navigation */}
      <aside className="w-80 border-r border-border-subtle bg-background flex flex-col shrink-0">
        <InlineBackButton title="Settings" />
        
        <div className="p-6 flex flex-col flex-1 space-y-6">
          
          {/* Search Input */}
          <div className="relative">
            <svg className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="w-full bg-surface border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          {/* Grouped Navigation */}
          <div className="bg-backgroundspace-y-6 flex-1 overflow-y-auto">
            {filteredSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <p className="px-3 text-[11px] font-bold tracking-wider text-text-muted mb-2">{section.title}</p>
                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all ${
                        isActive 
                          ? 'bg-surface-muted/90 text-white font-semibold shadow-sm border-l-2 border-brand' 
                          : 'text-text-muted hover:bg-surface hover:text-zinc-200'
                      }`}
                    >
                      <span className="text-sm">{item.label}</span>
                      <svg className={`w-4 h-4 transition-transform ${isActive ? 'text-brand translate-x-0.5' : 'text-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sidebar Footer Badge */}
          <div className="pt-4 border-t border-border-subtle text-xs text-text-muted flex items-center justify-between px-2">
            <span>Project S Core</span>
            <span className="bg-surface border border-border-subtle px-2 py-0.5 rounded text-text-muted font-mono">v1.0</span>
          </div>

        </div>
      </aside>

      {/* RIGHT CANVAS: Centered, Balanced Content Area */}
      <main className="flex-1 bg-background flex justify-center py-12 px-8 overflow-y-auto">
        <div className="w-full max-w-3xl space-y-8">
          
          {activeTab === 'account' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* Header Section */}
              <div className="flex items-center justify-between border-b border-border-subtle/60 pb-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Your Account</h1>
                  <p className="text-sm text-text-muted mt-1">
                    Manage your credentials, security preferences, and account lifecycle.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected
                </div>
              </div>

              {/* Cards Group */}
              <div className="space-y-4">
                <div className="bg-surface border border-border-subtle rounded-2xl p-6 transition">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base text-zinc-100">Account Information</h3>
                    <span className="text-xs text-text-muted font-mono">ID: {userId.slice(0, 8)}...</span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-border-subtle">
                      <span className="text-text-muted">Registered Email</span>
                      <span className="text-zinc-200 font-medium">{userEmail}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-text-muted">Authentication Provider</span>
                      <span className="text-zinc-200 font-medium">Supabase Auth</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border-subtle rounded-2xl p-6 hover:border-border-subtle transition flex items-center justify-between cursor-pointer group">
                  <div>
                    <h3 className="font-bold text-base text-zinc-100 group-hover:text-white">Change Password</h3>
                    <p className="text-sm text-text-muted mt-1">Update your authentication credentials to maintain security.</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-surface-muted/80 flex items-center justify-center text-text-muted group-hover:bg-brand group-hover:text-background transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                  </div>
                </div>

                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 hover:bg-red-500/10 transition flex items-center justify-between cursor-pointer group">
                  <div>
                    <h3 className="font-bold text-base text-red-400">Deactivate Account</h3>
                    <p className="text-sm text-red-400/70 mt-1">Permanently erase your data nodes and terminate your creator status.</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab !== 'account' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-border-subtle/60 pb-6">
                <h1 className="text-2xl font-bold tracking-tight text-white capitalize">{activeTab} Settings</h1>
                <p className="text-sm text-text-muted mt-1">Configure your workspace parameters and custom platform preferences.</p>
              </div>
              <div className="bg-surface border border-border-subtle rounded-2xl p-12 text-center text-text-muted">
                Subsystem module ready for integration.
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}