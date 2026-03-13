import { readFileSync, writeFileSync, mkdirSync } from 'fs';
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

console.log('🎨 Generating Appointment Cancellation Email Previews\n');

const outputDir = join(currentDirname, 'email-previews-cancellation');
mkdirSync(outputDir, { recursive: true});

// Test 1: Patient receives cancellation (they cancelled it)
console.log('📧 1. Patient cancellation email (patient cancelled)...');
const patientTemplate = loadTemplate('en', 'appointment-cancelled.html');
const patientHtml = renderTemplate(patientTemplate, {
  firstName: 'John',
  psychologistName: 'Dr. Sarah Smith',
  patientName: '', // Empty for patient email
  appointmentDate: 'Tuesday, January 28, 2026',
  appointmentTime: '2:30 PM',
  dashboardLink: 'https://khunjit.com/dashboard',
  platformUrl: 'https://khunjit.com'
});
writeFileSync(join(outputDir, '1-patient-cancelled.html'), patientHtml);
console.log('   ✅ Saved: 1-patient-cancelled.html');

// Test 2: Psychologist receives notification (patient cancelled)
console.log('\n📧 2. Psychologist notification email (patient cancelled)...');
const psychTemplate = loadTemplate('en', 'appointment-cancelled.html');
const psychHtml = renderTemplate(psychTemplate, {
  firstName: 'Sarah',
  psychologistName: '', // Empty for psychologist email
  patientName: 'John Doe',
  appointmentDate: 'Tuesday, January 28, 2026',
  appointmentTime: '2:30 PM',
  dashboardLink: 'https://khunjit.com/dashboard',
  platformUrl: 'https://khunjit.com'
});
writeFileSync(join(outputDir, '2-psychologist-notified.html'), psychHtml);
console.log('   ✅ Saved: 2-psychologist-notified.html');

// Test 3: Patient receives cancellation (psychologist rejected)
console.log('\n📧 3. Patient cancellation email (psychologist rejected)...');
const patientRejectedHtml = renderTemplate(patientTemplate, {
  firstName: 'John',
  psychologistName: 'Dr. Sarah Smith',
  patientName: '',
  appointmentDate: 'Tuesday, January 28, 2026',
  appointmentTime: '2:30 PM',
  dashboardLink: 'https://khunjit.com/dashboard',
  platformUrl: 'https://khunjit.com'
});
writeFileSync(join(outputDir, '3-patient-psychologist-rejected.html'), patientRejectedHtml);
console.log('   ✅ Saved: 3-patient-psychologist-rejected.html');

// Generate index
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancellation Email Previews</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #111827;
      border-bottom: 3px solid #ef4444;
      padding-bottom: 10px;
    }
    .scenario {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .scenario h3 {
      color: #ef4444;
      margin: 0 0 10px;
    }
    .scenario p {
      margin: 5px 0;
      color: #6b7280;
    }
    .scenario a {
      color: #8b5cf6;
      text-decoration: none;
      font-weight: 600;
    }
    .scenario a:hover {
      text-decoration: underline;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 10px;
    }
    .badge-patient {
      background: #dbeafe;
      color: #1e40af;
    }
    .badge-psychologist {
      background: #fae8ff;
      color: #6d28d9;
    }
    .key-points {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>❌ Appointment Cancellation Email Previews</h1>

  <div class="key-points">
    <h3>🔍 New Feature: Cancellation Emails</h3>
    <p><strong>✨ What's New:</strong></p>
    <ul>
      <li>Email sent when patient cancels appointment</li>
      <li>Email sent when psychologist rejects appointment</li>
      <li>Both patient and psychologist are notified</li>
      <li>Uses {{patientName}} and {{psychologistName}} variables dynamically</li>
    </ul>
  </div>

  <div class="scenario">
    <h3>Scenario 1: Patient Cancels Appointment</h3>
    <p><strong>Trigger:</strong> Patient clicks "Cancel Appointment" button</p>
    <p><strong>Emails Sent:</strong></p>
    <ul>
      <li>
        <a href="1-patient-cancelled.html" target="_blank">
          Patient Confirmation Email
          <span class="badge badge-patient">patient</span>
        </a>
        <br>
        <small>Shows: "Your appointment with Dr. Sarah Smith has been cancelled"</small>
      </li>
      <li>
        <a href="2-psychologist-notified.html" target="_blank">
          Psychologist Notification Email
          <span class="badge badge-psychologist">psychologist</span>
        </a>
        <br>
        <small>Shows: "John Doe cancelled their appointment"</small>
      </li>
    </ul>
  </div>

  <div class="scenario">
    <h3>Scenario 2: Psychologist Rejects Appointment</h3>
    <p><strong>Trigger:</strong> Psychologist clicks "Reject" on pending appointment</p>
    <p><strong>Emails Sent:</strong></p>
    <ul>
      <li>
        <a href="3-patient-psychologist-rejected.html" target="_blank">
          Patient Notification Email
          <span class="badge badge-patient">patient</span>
        </a>
        <br>
        <small>Shows: "Your appointment with Dr. Sarah Smith has been cancelled"</small>
      </li>
    </ul>
  </div>

  <div class="key-points">
    <h3>📋 Implementation Details</h3>
    <ul>
      <li><strong>File:</strong> server/routes.ts</li>
      <li><strong>Patient Cancel:</strong> Line ~1755 (POST /api/appointments/:id/cancel)</li>
      <li><strong>Psychologist Reject:</strong> Line ~1586 (POST /api/appointments/:id/reject)</li>
      <li><strong>Template:</strong> server/email/templates/{lang}/appointment-cancelled.html</li>
      <li><strong>Languages:</strong> All 11 languages supported</li>
    </ul>
  </div>
</body>
</html>`;

writeFileSync(join(outputDir, 'index.html'), indexHtml);

console.log('\n' + '='.repeat(60));
console.log('✨ Cancellation email previews generated!');
console.log('='.repeat(60));
console.log('\n📂 Output directory: email-previews-cancellation/');
console.log('\n📋 Generated files:');
console.log('   1. 1-patient-cancelled.html');
console.log('   2. 2-psychologist-notified.html');
console.log('   3. 3-patient-psychologist-rejected.html');
console.log('   4. index.html');

// Open in browser
import('child_process').then(({ exec }) => {
  exec(`open "${join(outputDir, 'index.html')}"`);
});
