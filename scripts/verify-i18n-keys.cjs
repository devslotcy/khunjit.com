#!/usr/bin/env node

/**
 * i18n Translation Files Key Structure Verification Script
 *
 * This script verifies that all language files have identical key structure.
 * Run this script whenever you modify translation files to ensure consistency.
 *
 * Usage:
 *   node scripts/verify-i18n-keys.js
 *   npm run verify-i18n (if added to package.json scripts)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const I18N_DIR = path.join(__dirname, '../client/src/i18n');
const LANGUAGES = ['tr', 'en', 'th', 'vi', 'fil', 'id', 'ja', 'ko', 'de', 'fr', 'it'];
const MASTER_LANGUAGE = 'tr'; // Turkish is the source of truth

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Recursively extract all keys from a nested object
 */
function getAllKeys(obj, prefix = '') {
  let keys = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys.sort();
}

/**
 * Count non-empty values in a nested object
 */
function countNonEmptyValues(obj) {
  let count = 0;

  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      count += countNonEmptyValues(obj[key]);
    } else if (obj[key] !== '') {
      count++;
    }
  }

  return count;
}

/**
 * Find missing keys by comparing two key arrays
 */
function findMissingKeys(referenceKeys, targetKeys) {
  return referenceKeys.filter(key => !targetKeys.includes(key));
}

/**
 * Find extra keys by comparing two key arrays
 */
function findExtraKeys(referenceKeys, targetKeys) {
  return targetKeys.filter(key => !referenceKeys.includes(key));
}

/**
 * Main verification function
 */
function verifyI18nFiles() {
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}    i18n Translation Files Verification${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  // Check if i18n directory exists
  if (!fs.existsSync(I18N_DIR)) {
    console.error(`${colors.red}❌ Error: i18n directory not found at ${I18N_DIR}${colors.reset}`);
    process.exit(1);
  }

  // Load all language files
  const languageData = {};
  const languageKeys = {};

  for (const lang of LANGUAGES) {
    const filePath = path.join(I18N_DIR, `${lang}.json`);

    if (!fs.existsSync(filePath)) {
      console.error(`${colors.red}❌ Error: ${lang}.json not found${colors.reset}`);
      process.exit(1);
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      languageData[lang] = JSON.parse(content);
      languageKeys[lang] = getAllKeys(languageData[lang]);
    } catch (error) {
      console.error(`${colors.red}❌ Error parsing ${lang}.json: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }

  // Get reference keys from master language
  const referenceKeys = languageKeys[MASTER_LANGUAGE];
  const totalKeys = referenceKeys.length;

  console.log(`${colors.blue}Master Language:${colors.reset} ${MASTER_LANGUAGE} (Turkish)`);
  console.log(`${colors.blue}Total Keys:${colors.reset} ${totalKeys}\n`);

  // Verify each language
  let allValid = true;
  const results = [];

  for (const lang of LANGUAGES) {
    const keys = languageKeys[lang];
    const nonEmptyCount = countNonEmptyValues(languageData[lang]);
    const completionPercent = ((nonEmptyCount / totalKeys) * 100).toFixed(1);

    const missingKeys = findMissingKeys(referenceKeys, keys);
    const extraKeys = findExtraKeys(referenceKeys, keys);

    const structureMatch = missingKeys.length === 0 && extraKeys.length === 0;

    results.push({
      lang,
      structureMatch,
      nonEmptyCount,
      completionPercent,
      missingKeys,
      extraKeys,
    });

    if (!structureMatch) {
      allValid = false;
    }
  }

  // Display results
  console.log(`${colors.cyan}Key Structure Verification:${colors.reset}\n`);

  for (const result of results) {
    const statusIcon = result.structureMatch
      ? `${colors.green}✅${colors.reset}`
      : `${colors.red}❌${colors.reset}`;

    const completion = result.completionPercent === '100.0'
      ? `${colors.green}${result.completionPercent}%${colors.reset}`
      : `${colors.yellow}${result.completionPercent}%${colors.reset}`;

    console.log(
      `${statusIcon} ${result.lang}.json - ` +
      `${result.nonEmptyCount}/${totalKeys} translated (${completion})`
    );

    if (!result.structureMatch) {
      if (result.missingKeys.length > 0) {
        console.log(`   ${colors.red}Missing keys: ${result.missingKeys.length}${colors.reset}`);
        if (result.missingKeys.length <= 5) {
          result.missingKeys.forEach(key => {
            console.log(`     - ${key}`);
          });
        } else {
          result.missingKeys.slice(0, 5).forEach(key => {
            console.log(`     - ${key}`);
          });
          console.log(`     ... and ${result.missingKeys.length - 5} more`);
        }
      }

      if (result.extraKeys.length > 0) {
        console.log(`   ${colors.red}Extra keys: ${result.extraKeys.length}${colors.reset}`);
        if (result.extraKeys.length <= 5) {
          result.extraKeys.forEach(key => {
            console.log(`     - ${key}`);
          });
        } else {
          result.extraKeys.slice(0, 5).forEach(key => {
            console.log(`     - ${key}`);
          });
          console.log(`     ... and ${result.extraKeys.length - 5} more`);
        }
      }
    }
  }

  // Display summary
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);

  if (allValid) {
    console.log(`${colors.green}✅ All files have identical key structure!${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Some files have mismatched keys!${colors.reset}`);
  }

  // Translation progress summary
  console.log(`\n${colors.cyan}Translation Progress:${colors.reset}\n`);

  const progressBars = results.map(result => {
    const percent = parseFloat(result.completionPercent);
    const barLength = 30;
    const filledLength = Math.round((percent / 100) * barLength);
    const emptyLength = barLength - filledLength;

    const bar =
      colors.green + '█'.repeat(filledLength) +
      colors.reset + '░'.repeat(emptyLength);

    return `  ${result.lang.padEnd(4)} [${bar}${colors.reset}] ${result.completionPercent}%`;
  });

  progressBars.forEach(bar => console.log(bar));

  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  // Exit with appropriate code
  process.exit(allValid ? 0 : 1);
}

// Run verification
verifyI18nFiles();
