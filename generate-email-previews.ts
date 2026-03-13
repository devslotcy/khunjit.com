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

function generatePreview(
  language: string,
  langName: string,
  recipientType: 'patient' | 'psychologist',
  fileName: string
) {
  console.log(`📧 Generating ${langName} ${recipientType} email preview...`);

  const templateFile = recipientType === 'patient'
    ? 'booking-confirmed-patient.html'
    : 'booking-confirmed-psychologist.html';

  const template = loadTemplate(language, templateFile);

  const variables = recipientType === 'patient'
    ? {
        firstName: language === 'tr' ? 'Ahmet' : language === 'vi' ? 'Nguyen' : 'สมชาย',
        psychologistName: language === 'tr' ? 'Dr. Ayşe Yılmaz' : language === 'vi' ? 'Bác sĩ Trần Văn A' : 'คุณหมอ ศิริพร',
        appointmentDate: language === 'tr' ? 'Salı, 28 Ocak 2026' : language === 'vi' ? 'Thứ Ba, 28 tháng 1, 2026' : 'วันอังคาร 28 มกราคม 2026',
        appointmentTime: '14:30',
        joinLink: 'https://khunjit.com/appointments/test-123',
        dashboardLink: 'https://khunjit.com/dashboard',
        platformUrl: 'https://khunjit.com'
      }
    : {
        firstName: language === 'tr' ? 'Ayşe' : language === 'vi' ? 'Trần' : 'ศิริพร',
        patientName: language === 'tr' ? 'Ahmet Demir' : language === 'vi' ? 'Nguyễn Văn B' : 'คุณ สมชาย',
        appointmentDate: language === 'tr' ? 'Salı, 28 Ocak 2026' : language === 'vi' ? 'Thứ Ba, 28 tháng 1, 2026' : 'วันอังคาร 28 มกราคม 2026',
        appointmentTime: '14:30',
        joinLink: 'https://khunjit.com/appointments/test-123',
        dashboardLink: 'https://khunjit.com/dashboard',
        platformUrl: 'https://khunjit.com'
      };

  const rendered = renderTemplate(template, variables);

  // Create output directory
  const outputDir = join(currentDirname, 'email-previews');
  mkdirSync(outputDir, { recursive: true });

  // Write to file
  const outputPath = join(outputDir, fileName);
  writeFileSync(outputPath, rendered, 'utf-8');

  console.log(`   ✅ Saved to: ${fileName}`);
  return outputPath;
}

console.log('🎨 Generating Email Previews for Booking Confirmations\n');
console.log('='.repeat(60));

const previews = [
  // Turkish
  { language: 'tr', langName: 'Turkish', recipientType: 'patient' as const, fileName: '1-turkish-patient.html' },
  { language: 'tr', langName: 'Turkish', recipientType: 'psychologist' as const, fileName: '2-turkish-psychologist.html' },

  // Vietnamese
  { language: 'vi', langName: 'Vietnamese', recipientType: 'patient' as const, fileName: '3-vietnamese-patient.html' },
  { language: 'vi', langName: 'Vietnamese', recipientType: 'psychologist' as const, fileName: '4-vietnamese-psychologist.html' },

  // Thai
  { language: 'th', langName: 'Thai', recipientType: 'patient' as const, fileName: '5-thai-patient.html' },
  { language: 'th', langName: 'Thai', recipientType: 'psychologist' as const, fileName: '6-thai-psychologist.html' },
];

const outputPaths: string[] = [];

for (const preview of previews) {
  const path = generatePreview(preview.language, preview.langName, preview.recipientType, preview.fileName);
  outputPaths.push(path);
}

console.log('\n' + '='.repeat(60));
console.log('✨ All email previews generated!');
console.log('='.repeat(60));
console.log('\n📂 Output directory: email-previews/');
console.log('\n📧 Generated files:');
outputPaths.forEach((path, index) => {
  const fileName = path.split('/').pop();
  console.log(`   ${index + 1}. ${fileName}`);
});

console.log('\n💡 To view the previews:');
console.log('   Open each HTML file in your browser to see how the emails look!');
console.log('\n🔍 What to check:');
console.log('   ✓ Patient emails show psychologist name');
console.log('   ✓ Psychologist emails show patient name');
console.log('   ✓ All other variables (date, time, links) are rendered');
console.log('   ✓ Layout and styling look correct');
console.log('   ✓ Language-specific text is displayed properly');

// Generate an index.html to view all at once
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Previews - Booking Confirmation</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #111827;
      border-bottom: 3px solid #8b5cf6;
      padding-bottom: 10px;
    }
    .preview-list {
      display: grid;
      gap: 15px;
      margin-top: 20px;
    }
    .preview-item {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .preview-item a {
      color: #8b5cf6;
      text-decoration: none;
      font-weight: 600;
      font-size: 18px;
    }
    .preview-item a:hover {
      text-decoration: underline;
    }
    .preview-item p {
      margin: 8px 0 0;
      color: #6b7280;
      font-size: 14px;
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
    .key-points h3 {
      margin: 0 0 10px;
      color: #92400e;
    }
    .key-points ul {
      margin: 0;
      padding-left: 20px;
      color: #78350f;
    }
  </style>
</head>
<body>
  <h1>📧 Email Previews - Booking Confirmation</h1>

  <div class="key-points">
    <h3>🔍 Key Points to Check:</h3>
    <ul>
      <li><strong>Patient emails</strong> use <code>{{psychologistName}}</code> variable</li>
      <li><strong>Psychologist emails</strong> use <code>{{patientName}}</code> variable</li>
      <li>All dynamic variables are properly rendered</li>
      <li>Layout and styling are consistent across languages</li>
    </ul>
  </div>

  <div class="preview-list">
    ${previews.map(p => `
      <div class="preview-item">
        <a href="${p.fileName}" target="_blank">
          ${p.langName} - ${p.recipientType === 'patient' ? 'Patient' : 'Psychologist'} Email
          <span class="badge badge-${p.recipientType}">${p.recipientType}</span>
        </a>
        <p>Template: booking-confirmed-${p.recipientType}.html (${p.language})</p>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

const indexPath = join(currentDirname, 'email-previews', 'index.html');
writeFileSync(indexPath, indexHtml, 'utf-8');

console.log('\n📋 Index page created: email-previews/index.html');
console.log('   Open this file to browse all previews easily!');
