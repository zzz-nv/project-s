// scripts/seed.js
// Run with: node scripts/seed.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const FAKE_PASSWORD = 'password123';

// ═══════════════════════════════════════════════════════════════
// THE BOTS — 18 personas
// ═══════════════════════════════════════════════════════════════
const BOTS = [
  // ── DEVELOPERS ──
  { username: 'dev_maria', displayName: 'Maria Santos', bio: 'Full-stack. Currently living in React land.' },
  { username: 'kaito_dev', displayName: 'Kaito Tanaka', bio: 'Backend. Rust, Postgres, and too much coffee.' },
  { username: 'code_amelia', displayName: 'Amelia Brooks', bio: 'Junior dev documenting the journey.' },

  // ── DESIGNERS ──
  { username: 'pixel_sofia', displayName: 'Sofia Rossi', bio: 'Product designer. Obsessed with typography.' },
  { username: 'ui_karim', displayName: 'Karim Aziz', bio: 'UI engineer. Figma → code, every day.' },

  // ── PHOTOGRAPHERS ──
  { username: 'lens_jonas', displayName: 'Jonas Weber', bio: 'Chasing light. Mostly landscapes.' },
  { username: 'maya_shoots', displayName: 'Maya Okafor', bio: 'Street & portrait photographer. London.' },

  // ── MEME ACCOUNTS ──
  { username: 'chaotic_leo', displayName: 'Leo Martinez', bio: 'shitposting professionally' },
  { username: 'dumb_moments', displayName: 'Nour Haddad', bio: 'Curator of very specific memes.' },

  // ── NICHE ──
  { username: 'eats_amina', displayName: 'Amina Cherif', bio: 'Cooking, eating, photographing. In that order.' },
  { username: 'words_sam', displayName: 'Sam Whitaker', bio: 'Essays, thoughts, occasionally good ones.' },
  { username: 'data_rin', displayName: 'Rin Matsuda', bio: 'Data viz. Charts that actually tell stories.' },
  { username: 'plays_hugo', displayName: 'Hugo Bernard', bio: 'Games. Sometimes finishing them.' },
  { username: 'lifts_zara', displayName: 'Zara Malik', bio: 'Powerlifting. Nutrition. Discipline.' },
  { username: 'sonic_theo', displayName: 'Theo Nkosi', bio: 'Producer. Beats. Always cooking something.' },

  // ── LOCAL / ARABIC ──
  { username: 'ahmed_sa', displayName: 'Ahmed Al-Saud', bio: 'يومياتي في الرياض. صور وأفكار.' },
  { username: 'lina_kw', displayName: 'Lina Al-Kuwait', bio: 'أكتب عن التقنية والحياة.' },
  { username: 'travels_mo', displayName: 'Mohamed El-Sayed', bio: 'Slow travel. Street food. Long walks.' },
];

// ═══════════════════════════════════════════════════════════════
// MAIN SCRIPT — creates auth users + profiles
// ═══════════════════════════════════════════════════════════════
async function seed() {
  console.log('🌱 Seeding bots...\n');

  const createdBots = [];

  for (const bot of BOTS) {
    const email = `${bot.username}@example.com`;

    // 1. Create the auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: FAKE_PASSWORD,
      email_confirm: true,
      user_metadata: { username: bot.username }
    });

    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        // Fetch existing user instead
        const { data: list } = await supabase.auth.admin.listUsers();
        const existing = list.users.find(x => x.email === email);
        if (existing) {
          createdBots.push({ id: existing.id, ...bot });
          console.log(`  ↺ ${bot.username} (already existed)`);
          continue;
        }
      }
      console.error(`  ✗ ${bot.username}: ${authErr.message}`);
      continue;
    }

    // 2. Avatar from DiceBear (deterministic, free, no storage)
    const avatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(bot.username)}&backgroundColor=6366f1,8b5cf6,ec4899,f43f5e,f59e0b,10b981`;

    // 3. Create the profile row
    const { error: profileErr } = await supabase.from('profiles').insert({
      id: authData.user.id,
      username: bot.username,
      display_name: bot.displayName,
      bio: bot.bio,
      avatar_url: avatarUrl,
    });

    if (profileErr) {
      console.error(`  ✗ profile ${bot.username}: ${profileErr.message}`);
      continue;
    }

    createdBots.push({ id: authData.user.id, ...bot });
    console.log(`  ✓ ${bot.username}`);
  }

  console.log(`\n🎉 Done. Created ${createdBots.length} bots.`);

}

seed().catch(console.error);