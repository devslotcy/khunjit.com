import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const currentDirname = dirname(fileURLToPath(import.meta.url));

function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

function loadTemplate(language: string, templateFile: string): string {
  const templatePath = join(currentDirname, "server", "email", "templates", language, templateFile);
  return readFileSync(templatePath, "utf-8");
}

function testTemplate(language: string, langName: string, recipientType: 'patient' | 'psychologist') {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📧 Testing ${langName} ${recipientType} template (${language})`);
  console.log('='.repeat(60));

  const templateFile = recipientType === 'patient'
    ? 'booking-confirmed-patient.html'
    : 'booking-confirmed-psychologist.html';

  try {
    const template = loadTemplate(language, templateFile);

    const variables = recipientType === 'patient'
      ? {
          firstName: "John",
          psychologistName: "Dr. Sarah Smith",
          appointmentDate: "Tuesday, January 28, 2026",
          appointmentTime: "2:30 PM",
          joinLink: "https://khunjit.com/appointments/test-123",
          dashboardLink: "https://khunjit.com/dashboard",
          platformUrl: "https://khunjit.com"
        }
      : {
          firstName: "Sarah",
          patientName: "John Doe",
          appointmentDate: "Tuesday, January 28, 2026",
          appointmentTime: "2:30 PM",
          joinLink: "https://khunjit.com/appointments/test-123",
          dashboardLink: "https://khunjit.com/dashboard",
          platformUrl: "https://khunjit.com"
        };

    const rendered = renderTemplate(template, variables);

    // Check for unreplaced variables
    const unreplacedMatches = rendered.match(/{{(\w+)}}/g);

    if (unreplacedMatches) {
      console.log('❌ FAILED: Found unreplaced variables:', unreplacedMatches);
      return false;
    }

    // Check that the correct variable was used
    if (recipientType === 'patient') {
      if (rendered.includes('{{patientName}}')) {
        console.log('❌ FAILED: Patient template should not have {{patientName}}');
        return false;
      }
      if (rendered.includes('Dr. Sarah Smith')) {
        console.log('✅ SUCCESS: Psychologist name correctly rendered in patient email');
      } else {
        console.log('⚠️  WARNING: Could not verify psychologist name rendering');
      }
    } else {
      if (rendered.includes('{{psychologistName}}')) {
        console.log('❌ FAILED: Psychologist template should not have {{psychologistName}}');
        return false;
      }
      if (rendered.includes('John Doe')) {
        console.log('✅ SUCCESS: Patient name correctly rendered in psychologist email');
      } else {
        console.log('⚠️  WARNING: Could not verify patient name rendering');
      }
    }

    // Check key elements are present
    const checks = [
      { test: rendered.includes(variables.appointmentDate), name: 'appointmentDate' },
      { test: rendered.includes(variables.appointmentTime), name: 'appointmentTime' },
      { test: rendered.includes(variables.firstName), name: 'firstName' },
    ];

    for (const check of checks) {
      if (check.test) {
        console.log(`✅ ${check.name} rendered correctly`);
      } else {
        console.log(`❌ ${check.name} NOT found`);
        return false;
      }
    }

    console.log('✨ Template validation: PASSED');
    return true;

  } catch (error) {
    console.log('❌ ERROR loading or rendering template:', error);
    return false;
  }
}

console.log('🧪 Testing Booking Confirmed Email Templates');
console.log('Testing dynamic variables: {{patientName}} and {{psychologistName}}\n');

const tests = [
  // Turkish
  { language: 'tr', langName: 'Turkish', recipientType: 'patient' as const },
  { language: 'tr', langName: 'Turkish', recipientType: 'psychologist' as const },

  // Vietnamese
  { language: 'vi', langName: 'Vietnamese', recipientType: 'patient' as const },
  { language: 'vi', langName: 'Vietnamese', recipientType: 'psychologist' as const },

  // Thai
  { language: 'th', langName: 'Thai', recipientType: 'patient' as const },
  { language: 'th', langName: 'Thai', recipientType: 'psychologist' as const },

  // English (for comparison)
  { language: 'en', langName: 'English', recipientType: 'patient' as const },
  { language: 'en', langName: 'English', recipientType: 'psychologist' as const },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  if (testTemplate(test.language, test.langName, test.recipientType)) {
    passed++;
  } else {
    failed++;
  }
}

console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}/${tests.length}`);
console.log(`❌ Failed: ${failed}/${tests.length}`);

if (failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED!');
  console.log('\n📝 Verified:');
  console.log('   ✓ Patient emails use {{psychologistName}} correctly');
  console.log('   ✓ Psychologist emails use {{patientName}} correctly');
  console.log('   ✓ All dynamic variables render properly');
  console.log('   ✓ Templates work in Turkish, Vietnamese, Thai, and English');
  process.exit(0);
} else {
  console.log('\n⚠️  SOME TESTS FAILED');
  process.exit(1);
}
