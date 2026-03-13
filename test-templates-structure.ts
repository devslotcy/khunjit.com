/**
 * Test Email Template Structure (No Database Required)
 *
 * Validates that templates are properly organized in the new role-based structure.
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

const TEMPLATE_DIR = './server/email/templates';

console.log('🧪 Testing Email Template Structure\n');
console.log('=' .repeat(70));

let passed = 0;
let failed = 0;

// Test configuration
const languages = ['de', 'en', 'fil', 'fr', 'id', 'it', 'ja', 'ko', 'th', 'tr', 'vi'];
const roles = ['patient', 'psychologist'];

const patientTemplates = [
  'welcome.html',
  'appointment-confirmed.html',
  'appointment-cancelled.html',
  'reminder-24h.html',
  'reminder-1h.html',
  'session-followup.html'
];

const psychologistTemplates = [
  'welcome.html',
  'appointment-confirmed.html',
  'appointment-cancelled.html',
  'reminder-24h.html',
  'reminder-1h.html',
  'verification-approved.html',
  'verification-rejected.html'
];

// Test 1: Verify role subdirectories exist
console.log('\n📂 Test 1: Verifying Role Subdirectories Exist\n');

for (const lang of languages) {
  for (const role of roles) {
    const dirPath = join(TEMPLATE_DIR, lang, role);
    const exists = existsSync(dirPath);

    if (exists) {
      console.log(`✅ ${lang}/${role}/`);
      passed++;
    } else {
      console.log(`❌ ${lang}/${role}/ (MISSING)`);
      failed++;
    }
  }
}

// Test 2: Verify patient templates exist in all languages
console.log('\n👤 Test 2: Verifying Patient Templates\n');

let missingPatientTemplates: string[] = [];

for (const lang of languages) {
  const roleDir = join(TEMPLATE_DIR, lang, 'patient');

  if (!existsSync(roleDir)) {
    console.log(`⚠️  ${lang}: Patient directory missing, skipping...`);
    continue;
  }

  const files = readdirSync(roleDir);

  for (const template of patientTemplates) {
    const exists = files.includes(template);

    if (exists) {
      passed++;
    } else {
      console.log(`❌ ${lang}/patient/${template} (MISSING)`);
      missingPatientTemplates.push(`${lang}/patient/${template}`);
      failed++;
    }
  }

  console.log(`   ${lang}/patient/: ${patientTemplates.filter(t => files.includes(t)).length}/${patientTemplates.length} templates`);
}

// Test 3: Verify psychologist templates exist in all languages
console.log('\n👨‍⚕️ Test 3: Verifying Psychologist Templates\n');

let missingPsychologistTemplates: string[] = [];

for (const lang of languages) {
  const roleDir = join(TEMPLATE_DIR, lang, 'psychologist');

  if (!existsSync(roleDir)) {
    console.log(`⚠️  ${lang}: Psychologist directory missing, skipping...`);
    continue;
  }

  const files = readdirSync(roleDir);

  for (const template of psychologistTemplates) {
    const exists = files.includes(template);

    if (exists) {
      passed++;
    } else {
      console.log(`❌ ${lang}/psychologist/${template} (MISSING)`);
      missingPsychologistTemplates.push(`${lang}/psychologist/${template}`);
      failed++;
    }
  }

  console.log(`   ${lang}/psychologist/: ${psychologistTemplates.filter(t => files.includes(t)).length}/${psychologistTemplates.length} templates`);
}

// Test 4: Check for old templates that should be deprecated
console.log('\n🗑️  Test 4: Identifying Old Templates (Can Be Removed After Migration)\n');

const oldTemplates = [
  'booking-confirmed.html',
  'booking-confirmed-patient.html',
  'booking-confirmed-psychologist.html'
];

for (const lang of languages) {
  for (const oldTemplate of oldTemplates) {
    const oldPath = join(TEMPLATE_DIR, lang, oldTemplate);
    if (existsSync(oldPath)) {
      console.log(`📝 ${lang}/${oldTemplate} (still exists, safe to remove after migration)`);
    }
  }
}

// Summary
console.log('\n' + '='.repeat(70));
console.log('\n📊 Test Summary\n');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed === 0) {
  console.log(`📈 Success Rate: 100%`);
  console.log('\n🎉 All templates properly organized! Ready for production use.');
  console.log('\n✨ Template Structure:');
  console.log('   ├── {language}/');
  console.log('   │   ├── patient/');
  console.log('   │   │   ├── welcome.html');
  console.log('   │   │   ├── appointment-confirmed.html');
  console.log('   │   │   ├── appointment-cancelled.html');
  console.log('   │   │   ├── reminder-24h.html');
  console.log('   │   │   ├── reminder-1h.html');
  console.log('   │   │   └── session-followup.html');
  console.log('   │   └── psychologist/');
  console.log('   │       ├── welcome.html');
  console.log('   │       ├── appointment-confirmed.html');
  console.log('   │       ├── appointment-cancelled.html');
  console.log('   │       ├── reminder-24h.html');
  console.log('   │       ├── reminder-1h.html');
  console.log('   │       ├── verification-approved.html');
  console.log('   │       └── verification-rejected.html');
} else {
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('\n⚠️  Some templates are missing. Details above.');

  if (missingPatientTemplates.length > 0) {
    console.log('\n❌ Missing Patient Templates:');
    missingPatientTemplates.forEach(t => console.log(`   - ${t}`));
  }

  if (missingPsychologistTemplates.length > 0) {
    console.log('\n❌ Missing Psychologist Templates:');
    missingPsychologistTemplates.forEach(t => console.log(`   - ${t}`));
  }
}

console.log('\n📋 Next Steps:');
console.log('1. ✅ Templates organized in role-based structure');
console.log('2. ✅ Type-safe email service created (server/email/type-safe-service.ts)');
console.log('3. ✅ Helper functions created (server/email/helpers.ts)');
console.log('4. 📝 Run database migration: migrations/add-email-logs-recipient-role.sql');
console.log('5. 📝 Update email sending code to use new helpers');
console.log('6. 🧪 Test in development environment');
console.log('\n');
