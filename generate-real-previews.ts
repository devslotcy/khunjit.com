import { config } from 'dotenv';
config();

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from "./server/db.js";
import { users, psychologistProfiles, appointments, userProfiles, languages } from "@shared/schema";
import { eq } from "drizzle-orm";

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

async function generateRealPreviews() {
  console.log('🎨 Generating Email Previews with Real User Data\n');

  // Get a real appointment
  const [apt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.status, 'confirmed'))
    .limit(1);

  if (!apt) {
    console.log('❌ No confirmed appointments found. Using sample data...');
    return;
  }

  // Get patient
  const [patient] = await db.select().from(users).where(eq(users.id, apt.patientId)).limit(1);
  const [patientProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, apt.patientId)).limit(1);
  let patientLang = 'en';
  if (patientProfile?.languageId) {
    const [lang] = await db.select().from(languages).where(eq(languages.id, patientProfile.languageId)).limit(1);
    patientLang = lang?.code || 'en';
  }

  // Get psychologist
  const [psychProfile] = await db.select().from(psychologistProfiles).where(eq(psychologistProfiles.id, apt.psychologistId)).limit(1);
  const [psychUser] = psychProfile ? await db.select().from(users).where(eq(users.id, psychProfile.userId)).limit(1) : [null];
  const [psychUserProfile] = psychProfile ? await db.select().from(userProfiles).where(eq(userProfiles.userId, psychProfile.userId)).limit(1) : [null];
  let psychLang = 'en';
  if (psychUserProfile?.languageId) {
    const [lang] = await db.select().from(languages).where(eq(languages.id, psychUserProfile.languageId)).limit(1);
    psychLang = lang?.code || 'en';
  }

  if (!patient || !psychProfile || !psychUser) {
    console.log('❌ Could not find patient or psychologist');
    return;
  }

  console.log('✅ Found real appointment:');
  console.log(`   Patient: ${patient.firstName} ${patient.lastName || ''} (${patientLang})`);
  console.log(`   Psychologist: ${psychProfile.fullName} (${psychLang})`);
  console.log(`   Date: ${apt.startAt}`);

  const appointmentDate = new Date(apt.startAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const appointmentTime = new Date(apt.startAt).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  });

  // Create output directory
  const outputDir = join(currentDirname, 'email-previews-real');
  mkdirSync(outputDir, { recursive: true });

  // Generate patient email
  console.log(`\n📧 Generating patient email (${patientLang})...`);
  const patientTemplate = loadTemplate(patientLang as any, 'booking-confirmed-patient.html');
  const patientHtml = renderTemplate(patientTemplate, {
    firstName: patient.firstName,
    psychologistName: psychProfile.fullName,
    appointmentDate,
    appointmentTime,
    joinLink: `https://khunjit.com/appointments/${apt.id}`,
    dashboardLink: 'https://khunjit.com/dashboard',
    platformUrl: 'https://khunjit.com'
  });
  writeFileSync(join(outputDir, `patient-${patientLang}.html`), patientHtml);
  console.log(`   ✅ Saved: patient-${patientLang}.html`);
  console.log(`   📝 Shows psychologist name: ${psychProfile.fullName}`);

  // Generate psychologist email
  console.log(`\n📧 Generating psychologist email (${psychLang})...`);
  const psychTemplate = loadTemplate(psychLang as any, 'booking-confirmed-psychologist.html');
  const psychHtml = renderTemplate(psychTemplate, {
    firstName: psychUser.firstName,
    patientName: `${patient.firstName} ${patient.lastName || ''}`.trim(), // 🔑 Using patientName
    appointmentDate,
    appointmentTime,
    joinLink: `https://khunjit.com/appointments/${apt.id}`,
    dashboardLink: 'https://khunjit.com/dashboard',
    platformUrl: 'https://khunjit.com'
  });
  writeFileSync(join(outputDir, `psychologist-${psychLang}.html`), psychHtml);
  console.log(`   ✅ Saved: psychologist-${psychLang}.html`);
  console.log(`   📝 Shows patient name: ${patient.firstName} ${patient.lastName || ''}`);

  // Generate index
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Previews - Real Data</title>
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
      border-bottom: 3px solid #8b5cf6;
      padding-bottom: 10px;
    }
    .info-box {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .info-box h3 {
      margin: 0 0 10px;
      color: #8b5cf6;
    }
    .info-box p {
      margin: 5px 0;
      color: #6b7280;
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
  </style>
</head>
<body>
  <h1>📧 Email Previews - Real User Data</h1>

  <div class="info-box">
    <h3>📋 Appointment Details</h3>
    <p><strong>Patient:</strong> ${patient.firstName} ${patient.lastName || ''} (Language: ${patientLang})</p>
    <p><strong>Psychologist:</strong> ${psychProfile.fullName} (Language: ${psychLang})</p>
    <p><strong>Date:</strong> ${appointmentDate}</p>
    <p><strong>Time:</strong> ${appointmentTime}</p>
  </div>

  <div class="info-box">
    <h3>🔍 What to Check</h3>
    <p>✅ Patient email shows psychologist name: <strong>${psychProfile.fullName}</strong></p>
    <p>✅ Psychologist email shows patient name: <strong>${patient.firstName} ${patient.lastName || ''}</strong></p>
    <p>✅ All dynamic variables are rendered correctly</p>
  </div>

  <div class="preview-list">
    <div class="preview-item">
      <a href="patient-${patientLang}.html" target="_blank">
        Patient Email
        <span class="badge badge-patient">${patientLang}</span>
      </a>
      <p>Shows: "Your appointment with <strong>${psychProfile.fullName}</strong>"</p>
      <p>Uses: {{psychologistName}} variable</p>
    </div>

    <div class="preview-item">
      <a href="psychologist-${psychLang}.html" target="_blank">
        Psychologist Email
        <span class="badge badge-psychologist">${psychLang}</span>
      </a>
      <p>Shows: "New appointment with <strong>${patient.firstName} ${patient.lastName || ''}</strong>"</p>
      <p>Uses: {{patientName}} variable 🔑 (NEW)</p>
    </div>
  </div>
</body>
</html>`;

  writeFileSync(join(outputDir, 'index.html'), indexHtml);

  console.log('\n' + '='.repeat(60));
  console.log('✨ Email previews generated with real data!');
  console.log('='.repeat(60));
  console.log('\n📂 Output directory: email-previews-real/');
  console.log('\n📋 Open index.html to view all previews');

  // Open in browser
  const { exec } = await import('child_process');
  exec(`open "${join(outputDir, 'index.html')}"`);
}

generateRealPreviews()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
