require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ═══════════════════════════════════════════════════════════════
// IMAGE MAP — replace with direct image URLs if rendering fails
// ═══════════════════════════════════════════════════════════════
const IMG = {
  // DEV
  devMaria_code1: 'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  devMaria_code2: 'https://images.unsplash.com/photo-1624953587687-daf255b6b80a?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  devMaria_terminal: 'https://images.unsplash.com/photo-1608742213509-815b97c30b36?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  kaito_desktop: 'https://plus.unsplash.com/premium_photo-1678564741870-d68a69925537?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  kaito_keyboard: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?q=80&w=1165&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  amelia_laptop: 'https://images.unsplash.com/photo-1648058016614-0327ec9b2dea?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  sofia_macbook: 'https://images.unsplash.com/photo-1602576666092-bf6447a729fc?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  sofia_color: 'https://images.unsplash.com/photo-1619632973808-4acf8041df42?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  sofia_type: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  karim_figma1: 'https://images.unsplash.com/photo-1653647054667-c99dc7f914ef?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  karim_figma2: 'https://images.unsplash.com/photo-1559028012-481c04fa702d?q=80&w=1036&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',

  // PHOTOGRAPHERS
  jonas_sunset: 'https://images.unsplash.com/photo-1465080357990-d4bc259ec4a9?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  jonas_sea: 'https://images.unsplash.com/photo-1503803548695-c2a7b4a5b875?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  jonas_road: 'https://images.unsplash.com/photo-1478059299873-f047d8c5fe1a?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  maya_illus1: 'https://images.unsplash.com/vector-1753409054432-a32f340f3775?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  maya_illus2: 'https://plus.unsplash.com/premium_vector-1752680084231-a884e5b6c7ff?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',

  // MEMES
  leo_cat1: 'https://plus.unsplash.com/premium_vector-1776962442553-0efabab0e890?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  leo_cat2: 'https://plus.unsplash.com/premium_vector-1776962442479-0459a52f8628?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  dumb_cattle: 'https://images.unsplash.com/photo-1556997685-309989c1aa82?q=80&w=1173&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  dumb_orangutan: 'https://plus.unsplash.com/premium_photo-1664304287258-f4509f1efb3b?q=80&w=882&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',

  // FOOD
  amina_pasta1: 'https://plus.unsplash.com/premium_photo-1664472619078-9db415ebef44?q=80&w=1076&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  amina_pasta2: 'https://plus.unsplash.com/premium_photo-1664472682525-0c0b50534850?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  amina_pasta3: 'https://plus.unsplash.com/premium_photo-1664478291780-0c67f5fb15e6?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',

  // DATA
  rin_chart1: 'https://images.unsplash.com/photo-1691643158804-d3f02eb456a3?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  rin_chart2: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',

  // GAMING
  hugo_setup: 'https://plus.unsplash.com/premium_photo-1682141882061-c7676602e111?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  hugo_game: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?q=80&w=1057&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',

  // FITNESS
  zara_gym1: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  zara_gym2: 'https://images.unsplash.com/photo-1641337221253-fdc7237f6b61?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',

  // MUSIC
  theo_studio: 'https://plus.unsplash.com/premium_photo-1683140707316-42df87760f3f?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  theo_mic: 'https://plus.unsplash.com/premium_photo-1683140710605-a3065665a46c?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',

  // ARABIC
  ahmed_city: 'https://images.unsplash.com/photo-1663900108404-a05e8bf82cda?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  ahmed_building: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  lina_coffee: 'https://plus.unsplash.com/premium_photo-1723559972702-2659e41dbb5b?q=80&w=736&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  lina_food: 'https://plus.unsplash.com/premium_photo-1672363353897-ae5a81a1ab57?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',

  // TRAVEL
  mo_van: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1121&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  mo_plane: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?q=80&w=1331&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  mo_cup: 'https://images.unsplash.com/photo-1611520189922-f7b1ba7d801e?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
};

// ═══════════════════════════════════════════════════════════════
// TWEETS — 4 per bot (avg)
// ═══════════════════════════════════════════════════════════════
const TWEETS = [
  // dev_maria
  { u: 'dev_maria', c: 'Finally fixed that memory leak. Three days of my life gone. And it was a missing await.', i: ['devMaria_code1', 'devMaria_terminal'] },
  { u: 'dev_maria', c: 'Unpopular opinion: TypeScript is just JavaScript with extra steps and I love it.', i: [] },
  { u: 'dev_maria', c: 'The amount of time I spend reading Stack Overflow vs actually coding is embarrassing.', i: ['devMaria_code2'] },
  { u: 'dev_maria', c: 'Reminder: your code will be read 10x more than it will be written. Write for the reader.', i: [] },

  // kaito_dev
  { u: 'kaito_dev', c: 'New keyboard day. Switched from Cherry MX Blue to something quieter. My roommates thank me.', i: ['kaito_keyboard'] },
  { u: 'kaito_dev', c: 'Rewrote a service in Rust yesterday. 40% faster. 3x the compile time. Worth it.', i: [] },
  { u: 'kaito_dev', c: 'My desk setup after 3 years of iterating. Still not perfect.', i: ['kaito_desktop'] },
  { u: 'kaito_dev', c: 'Postgres + a JSON column beats MongoDB every time. Fight me.', i: [] },

  // code_amelia
  { u: 'code_amelia', c: 'Day 47 of learning to code. Today I learned what a for loop actually does. Not just what it looks like.', i: ['amelia_laptop'] },
  { u: 'code_amelia', c: 'Junior dev tip: if you are stuck for more than 30 minutes, ask for help. Your ego is not worth the time.', i: [] },
  { u: 'code_amelia', c: 'Made my first PR today. It got rejected. And that is okay.', i: [] },

  // pixel_sofia
  { u: 'pixel_sofia', c: 'Spent 4 hours on a button today. Not because it was hard, but because it needed to be perfect.', i: ['sofia_macbook', 'sofia_color'] },
  { u: 'pixel_sofia', c: 'Typography moodboard for a client this week. Serif is back, and I am here for it.', i: ['sofia_type'] },
  { u: 'pixel_sofia', c: 'Some of the best design decisions are the ones you do not make.', i: [] },

  // ui_karim
  { u: 'ui_karim', c: 'Figma to code is finally not painful. Well, less painful.', i: ['karim_figma1'] },
  { u: 'ui_karim', c: 'If your design system does not have spacing tokens, it is not a design system.', i: [] },
  { u: 'ui_karim', c: 'Rebuilt the settings page from scratch. Users will not notice. That is the point.', i: ['karim_figma2'] },

  // lens_jonas
  { u: 'lens_jonas', c: 'Caught this at 6am. Worth waking up at 4.', i: ['jonas_sunset'] },
  { u: 'lens_jonas', c: 'Golden hour doing golden hour things.', i: ['jonas_sea'] },
  { u: 'lens_jonas', c: 'The road less traveled. Literally.', i: ['jonas_road'] },
  { u: 'lens_jonas', c: 'Sometimes I forget I own a camera and just need to go for a walk.', i: [] },

  // maya_shoots
  { u: 'maya_shoots', c: 'New sketch from this morning. Coffee, flowers, and sunlight.', i: ['maya_illus1'] },
  { u: 'maya_shoots', c: 'Street sketch from last night. Cities feel different in ink.', i: ['maya_illus2'] },
  { u: 'maya_shoots', c: 'Every photograph is a self-portrait of the photographer.', i: [] },

  // chaotic_leo
  { u: 'chaotic_leo', c: 'Me: I will be productive today. My brain: nope.', i: ['leo_cat1'] },
  { u: 'chaotic_leo', c: 'Monday mood.', i: ['leo_cat2'] },
  { u: 'chaotic_leo', c: 'Thinking about that one comment I made in 2016. Anyway.', i: [] },
  { u: 'chaotic_leo', c: 'Who needs therapy when you have shitposting.', i: [] },

  // dumb_moments
  { u: 'dumb_moments', c: 'Sometimes I look at cows and think about how peaceful they are.', i: ['dumb_cattle'] },
  { u: 'dumb_moments', c: 'This orangutan has more personality than most people I know.', i: ['dumb_orangutan'] },
  { u: 'dumb_moments', c: 'If you are reading this, drink some water. That is the tweet.', i: [] },

  // eats_amina
  { u: 'eats_amina', c: 'Sunday pasta. Non-negotiable.', i: ['amina_pasta1'] },
  { u: 'eats_amina', c: 'Tried a new recipe tonight. Simple is hard to get right.', i: ['amina_pasta2'] },
  { u: 'eats_amina', c: 'Cooking for one is underrated.', i: ['amina_pasta3'] },
  { u: 'eats_amina', c: 'Best meal I have had all month and it cost $12.', i: [] },

  // words_sam
  { u: 'words_sam', c: 'Writing is thinking. If you cannot explain it simply, you have not finished thinking.', i: [] },
  { u: 'words_sam', c: 'Reading old journals. Younger me had a lot of opinions. Some of them were good.', i: [] },
  { u: 'words_sam', c: 'The best writing advice: cut 30% and see if it still works. It always does.', i: [] },

  // data_rin
  { u: 'data_rin', c: 'Good data viz does not just show data, it shows the story inside the data.', i: ['rin_chart1'] },
  { u: 'data_rin', c: 'Dashboard refresher. Analytics are not the goal, decisions are.', i: ['rin_chart2'] },
  { u: 'data_rin', c: 'Reminder that pie charts are usually the wrong choice.', i: [] },

  // plays_hugo
  { u: 'plays_hugo', c: 'New setup. Went from console to PC. Worth every penny.', i: ['hugo_setup'] },
  { u: 'plays_hugo', c: 'Still processing that ending. No spoilers, but wow.', i: ['hugo_game'] },
  { u: 'plays_hugo', c: 'Games I have actually finished this year: 3. Games I have started: 47.', i: [] },

  // lifts_zara
  { u: 'lifts_zara', c: 'Deadlifts today. New PR. Grip strength is the real metric.', i: ['zara_gym1'] },
  { u: 'lifts_zara', c: 'Consistency over intensity. Every single time.', i: ['zara_gym2'] },
  { u: 'lifts_zara', c: 'Training is not punishment. It is a privilege. Reframe your mind.', i: [] },

  // sonic_theo
  { u: 'sonic_theo', c: 'New beat coming. This one is different.', i: ['theo_studio'] },
  { u: 'sonic_theo', c: 'Sometimes the best production move is to take a mic out.', i: ['theo_mic'] },
  { u: 'sonic_theo', c: 'Studio days over everything else.', i: [] },

  // ahmed_sa
  { u: 'ahmed_sa', c: 'صور من الرياض الليلة. المدينة أجمل بعد منتصف الليل.', i: ['ahmed_city'] },
  { u: 'ahmed_sa', c: 'صباح الخير من الرياض. بداية يوم جديد.', i: ['ahmed_building'] },
  { u: 'ahmed_sa', c: 'في بعض الأيام أحتاج فقط أن أجلس وأتأمل.', i: [] },

  // lina_kw
  { u: 'lina_kw', c: 'قهوة الصباح وكتاب جيد. لا شيء أفضل من هذا.', i: ['lina_coffee'] },
  { u: 'lina_kw', c: 'وصفة اليوم: طبق بسيط لكنه مليء بالنكهة.', i: ['lina_food'] },
  { u: 'lina_kw', c: 'أحب الأيام التي لا يوجد فيها شيء مستعجل.', i: [] },

  // travels_mo
  { u: 'travels_mo', c: 'Van life day 247. Would not trade it.', i: ['mo_van'] },
  { u: 'travels_mo', c: 'Sunrise from 30,000 feet.', i: ['mo_plane'] },
  { u: 'travels_mo', c: 'Traveling light is a skill. It took me years to learn.', i: ['mo_cup'] },
  { u: 'travels_mo', c: 'The best places are not on any map.', i: [] },
];

// ═══════════════════════════════════════════════════════════════
// REPLIES — bot replies to another bot's tweet (by index in TWEETS)
// ═══════════════════════════════════════════════════════════════
const REPLIES = [
  { toIdx: 0,  from: 'kaito_dev',    c: 'Missing await? It is always a missing await.' },
  { toIdx: 0,  from: 'code_amelia',  c: 'Needed to hear this today.' },
  { toIdx: 5,  from: 'dev_maria',    c: 'Rust is worth it for the safety alone.' },
  { toIdx: 10, from: 'pixel_sofia',  c: 'Spacing tokens or it did not happen.' },
  { toIdx: 13, from: 'ui_karim',     c: 'Serif is always back.' },
  { toIdx: 18, from: 'maya_shoots',  c: 'Where was this? Stunning.' },
  { toIdx: 22, from: 'dumb_moments', c: 'This is too real.' },
  { toIdx: 24, from: 'chaotic_leo',  c: 'Monday mood is a real thing.' },
  { toIdx: 29, from: 'travels_mo',   c: 'Following for the food recommendations.' },
  { toIdx: 33, from: 'words_sam',    c: 'Data tells, charts show, you decide.' },
  { toIdx: 41, from: 'lifts_zara',   c: 'Walking 20k steps a day IS the workout.' },
  { toIdx: 47, from: 'ahmed_sa',     c: 'أتفق تمامًا 🌙' },
  { toIdx: 47, from: 'lina_kw',      c: 'كلام جميل.' },
  { toIdx: 55, from: 'lens_jonas',   c: 'Van life is the dream.' },
  { toIdx: 55, from: 'eats_amina',   c: 'Goals.' },
];

function daysAgo(d, h = 0) {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(t.getHours() - h);
  return t.toISOString();
}

async function seed() {
  console.log('🌱 Seeding content...\n');

  // 1. Load all bot profiles
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, username');

  if (pErr || !profiles) {
    console.error('Could not load profiles:', pErr?.message);
    return;
  }

  const idByUsername = {};
  profiles.forEach(p => { idByUsername[p.username] = p.id; });
  console.log(`Loaded ${profiles.length} profiles\n`);

  // 2. Insert tweets
  console.log('📝 Inserting tweets...');
  const tweetIds = [];
  for (const t of TWEETS) {
    const userId = idByUsername[t.u];
    if (!userId) {
      console.warn(`  ✗ unknown user: ${t.u}`);
      continue;
    }

    const imageUrls = t.i.length > 0 ? t.i.map(k => IMG[k]).filter(Boolean) : null;
    const createdAt = daysAgo(Math.floor(Math.random() * 3), Math.floor(Math.random() * 24));

    const { data, error } = await supabase
      .from('tweets')
      .insert({
        user_id: userId,
        content: t.c,
        image_urls: imageUrls,
        created_at: createdAt,
      })
      .select('id')
      .single();

    if (error) {
      console.warn(`  ✗ ${t.u}: ${error.message}`);
    } else {
      tweetIds.push(data.id);
    }
  }
  console.log(`  ✓ ${tweetIds.length} tweets\n`);

  // 3. Insert replies
  console.log('💬 Inserting replies...');
  let replyCount = 0;
  for (const r of REPLIES) {
    const parentId = tweetIds[r.toIdx];
    const userId = idByUsername[r.from];
    if (!parentId || !userId) continue;

    const { error } = await supabase.from('tweets').insert({
      user_id: userId,
      content: r.c,
      parent_id: parentId,
      created_at: daysAgo(Math.random() * 2, Math.floor(Math.random() * 24)),
    });

    if (!error) replyCount++;
  }
  console.log(`  ✓ ${replyCount} replies\n`);

  // 4. Random follows
  console.log('👥 Inserting follows...');
  const usernames = Object.keys(idByUsername);
  let followCount = 0;
  for (const follower of usernames) {
    const targets = usernames.filter(u => u !== follower);
    const shuffled = targets.sort(() => Math.random() - 0.5).slice(0, 6 + Math.floor(Math.random() * 4));
    for (const target of shuffled) {
      const { error } = await supabase.from('follows').insert({
        follower_id: idByUsername[follower],
        following_id: idByUsername[target],
      });
      if (!error) followCount++;
    }
  }
  console.log(`  ✓ ${followCount} follows\n`);

  // 5. Random likes
  console.log('❤️  Inserting likes...');
  let likeCount = 0;
  for (const tweetId of tweetIds) {
    const numLikes = Math.floor(Math.random() * 4);
    const shuffled = [...usernames].sort(() => Math.random() - 0.5).slice(0, numLikes);
    for (const liker of shuffled) {
      const { error } = await supabase.from('likes').insert({
        tweet_id: tweetId,
        user_id: idByUsername[liker],
      });
      if (!error) likeCount++;
    }
  }
  console.log(`  ✓ ${likeCount} likes\n`);

  console.log('🎉 Done.\n');
}

seed().catch(console.error);