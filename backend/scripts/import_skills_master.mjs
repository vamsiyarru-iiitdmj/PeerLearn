import { createAdminClient } from '@insforge/sdk';
import fs from 'fs';
import path from 'path';

const envText = fs.readFileSync(path.resolve('.env'), 'utf-8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.substring(0, idx).trim(), l.substring(idx + 1).trim()];
    })
);

const admin = createAdminClient({
  baseUrl: env.INSFORGE_URL,
  apiKey: env.INSFORGE_API_KEY,
});

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function categorize(skill) {
  const s = skill.toLowerCase();
  if (
    s.includes('algorithm') ||
    s.includes('data structure') ||
    s.includes('complexity')
  ) {
    return 'Data Structures & Algorithms';
  }
  if (
    s.includes('python') ||
    s.includes('java') ||
    s.includes('c++') ||
    s.includes('c#') ||
    s.includes('swift') ||
    s.includes('scala') ||
    s.includes('rust') ||
    s.includes('kotlin') ||
    s.includes('php') ||
    s.includes('ruby') ||
    s.includes('haskell') ||
    s.includes('ansi c') ||
    s.includes('embedded c') ||
    s.includes('bash') ||
    s.includes('shell')
  ) {
    return 'Programming Languages';
  }
  if (
    s.includes('machine learning') ||
    s.includes('artificial intelligence') ||
    s.includes('neural') ||
    s.includes('nlp') ||
    s.includes('natural language') ||
    s.includes('vision') ||
    s.includes('deep learning') ||
    s.includes('reinforcement') ||
    s.includes('data science') ||
    s.includes('data mining') ||
    s.includes('statistics') ||
    s.includes('statistical') ||
    s.includes('regression') ||
    s.includes('analytics') ||
    s.includes('numpy') ||
    s.includes('pandas') ||
    s.includes('scikit') ||
    s.includes('matlab') ||
    s.includes('r ') ||
    s.includes('big data') ||
    s.includes('spark') ||
    s.includes('hadoop') ||
    s.includes('tableau') ||
    s.includes('power bi')
  ) {
    return 'AI & Data Science';
  }
  if (
    s.includes('web') ||
    s.includes('front-end') ||
    s.includes('back-end') ||
    s.includes('html') ||
    s.includes('css') ||
    s.includes('javascript') ||
    s.includes('typescript') ||
    s.includes('react') ||
    s.includes('angular') ||
    s.includes('vue') ||
    s.includes('node') ||
    s.includes('express') ||
    s.includes('django') ||
    s.includes('flask') ||
    s.includes('spring') ||
    s.includes('bootstrap') ||
    s.includes('tailwind') ||
    s.includes('android') ||
    s.includes('ios') ||
    s.includes('mobile') ||
    s.includes('flutter') ||
    s.includes('api') ||
    s.includes('rest') ||
    s.includes('graphql')
  ) {
    return 'Web & App Development';
  }
  if (
    s.includes('operating system') ||
    s.includes('linux') ||
    s.includes('unix') ||
    s.includes('multithreading') ||
    s.includes('parallel') ||
    s.includes('distributed') ||
    s.includes('systems') ||
    s.includes('kernel') ||
    s.includes('concurrency')
  ) {
    return 'Operating Systems & Concurrency';
  }
  if (
    s.includes('network') ||
    s.includes('tcp') ||
    s.includes('security') ||
    s.includes('cryptography') ||
    s.includes('ethical hacking') ||
    s.includes('penetration') ||
    s.includes('firewall') ||
    s.includes('cyber')
  ) {
    return 'Networks & Cybersecurity';
  }
  if (
    s.includes('database') ||
    s.includes('sql') ||
    s.includes('mysql') ||
    s.includes('postgres') ||
    s.includes('mongodb') ||
    s.includes('nosql') ||
    s.includes('oracle') ||
    s.includes('warehousing') ||
    s.includes('redis')
  ) {
    return 'Database Systems';
  }
  if (
    s.includes('cloud') ||
    s.includes('aws') ||
    s.includes('azure') ||
    s.includes('gcp') ||
    s.includes('docker') ||
    s.includes('kubernetes') ||
    s.includes('devops') ||
    s.includes('ci/cd') ||
    s.includes('jenkins') ||
    s.includes('git') ||
    s.includes('github') ||
    s.includes('version control')
  ) {
    return 'Cloud & DevOps';
  }
  if (
    s.includes('design') ||
    s.includes('ui') ||
    s.includes('ux') ||
    s.includes('graphics') ||
    s.includes('game') ||
    s.includes('unity') ||
    s.includes('animation')
  ) {
    return 'Design & Graphics';
  }
  if (
    s.includes('test') ||
    s.includes('qa') ||
    s.includes('quality') ||
    s.includes('selenium') ||
    s.includes('agile') ||
    s.includes('scrum') ||
    s.includes('software engineering')
  ) {
    return 'Software Engineering & Testing';
  }
  if (
    s.includes('hardware') ||
    s.includes('electronics') ||
    s.includes('embedded') ||
    s.includes('iot') ||
    s.includes('robotics') ||
    s.includes('microcontroller') ||
    s.includes('arduino')
  ) {
    return 'Hardware & IoT';
  }
  return 'Computer Science Core';
}

async function run() {
  console.log('--- Loading skills_master.csv ---');
  const csvPath = path.resolve('../skills_master.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rawSkills = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.toLowerCase() !== 'skill');

  // Deduplicate case-insensitively
  const uniqueMap = new Map();
  for (const s of rawSkills) {
    const key = s.toLowerCase();
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, s);
    }
  }

  const skillNames = Array.from(uniqueMap.values());
  console.log(`Found ${skillNames.length} unique skills in skills_master.csv`);

  // 1. Clear old tutor_pro_skills and doubt_tags before replacing skills table
  console.log('Clearing old tutor_pro_skills...');
  await admin.database.from('tutor_pro_skills').delete().neq('student_id', '00000000-0000-0000-0000-000000000000');

  console.log('Clearing old doubt_tags...');
  await admin.database.from('doubt_tags').delete().neq('doubt_id', '00000000-0000-0000-0000-000000000000');

  // 2. Clear old skills
  console.log('Clearing old skills table entries...');
  await admin.database.from('skills').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 3. Prepare skill rows with unique slugs
  const slugCounts = new Map();
  const skillRows = skillNames.map((name) => {
    let baseSlug = slugify(name);
    if (!baseSlug) baseSlug = 'skill';
    let slug = baseSlug;
    if (slugCounts.has(baseSlug)) {
      const count = slugCounts.get(baseSlug) + 1;
      slugCounts.set(baseSlug, count);
      slug = `${baseSlug}-${count}`;
    } else {
      slugCounts.set(baseSlug, 1);
    }

    return {
      name,
      slug,
      category: categorize(name),
      is_active: true,
    };
  });

  // 4. Insert in chunks of 50
  console.log('Inserting skills in batches of 50...');
  const chunkSize = 50;
  let inserted = 0;
  for (let i = 0; i < skillRows.length; i += chunkSize) {
    const chunk = skillRows.slice(i, i + chunkSize);
    const { data, error } = await admin.database.from('skills').insert(chunk).select('id, name');
    if (error) {
      console.error(`Error inserting chunk starting at index ${i}:`, error);
      throw error;
    }
    inserted += chunk.length;
    console.log(`Inserted ${inserted} / ${skillRows.length} skills`);
  }

  // 5. Fetch newly inserted skills to associate pro-skills for registered students
  const { data: newSkills } = await admin.database.from('skills').select('id, name, slug');
  console.log(`Total skills verified in database: ${newSkills?.length}`);

  // Fetch all students in students table
  const { data: students } = await admin.database.from('students').select('id, roll_number');
  if (students && students.length > 0 && newSkills && newSkills.length > 0) {
    const dsaSkill = newSkills.find((s) => s.slug === 'data-structures' || s.slug === 'algorithms') || newSkills[0];
    const pySkill = newSkills.find((s) => s.slug === 'python') || newSkills[1];
    const osSkill = newSkills.find((s) => s.slug === 'operating-systems') || newSkills[2];

    const proSkillRows = [];
    for (const st of students) {
      if (dsaSkill) proSkillRows.push({ student_id: st.id, skill_id: dsaSkill.id });
      if (pySkill) proSkillRows.push({ student_id: st.id, skill_id: pySkill.id });
      if (osSkill) proSkillRows.push({ student_id: st.id, skill_id: osSkill.id });
    }

    if (proSkillRows.length > 0) {
      await admin.database.from('tutor_pro_skills').insert(proSkillRows);
      console.log(`Associated initial master tutor skills for ${students.length} students`);
    }
  }

  console.log('=== SKILLS MASTER IMPORT COMPLETED SUCCESSFULLY ===');
}

run().catch((err) => {
  console.error('Fatal error during skills import:', err);
  process.exit(1);
});
