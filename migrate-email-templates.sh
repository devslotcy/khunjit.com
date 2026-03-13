#!/bin/bash

# Script to migrate email templates to new role-based structure
# Structure: {language}/{role}/{template}

set -e

TEMPLATE_DIR="/Users/dev/development/Mendly/server/email/templates"

# List of all supported languages
LANGUAGES=("de" "fil" "fr" "id" "it" "ja" "ko" "th" "tr" "vi")

echo "🚀 Starting email template migration..."
echo ""

for lang in "${LANGUAGES[@]}"; do
  echo "📁 Processing language: $lang"
  
  # Create role directories
  mkdir -p "$TEMPLATE_DIR/$lang/patient"
  mkdir -p "$TEMPLATE_DIR/$lang/psychologist"
  
  # Patient templates
  [ -f "$TEMPLATE_DIR/$lang/welcome.html" ] && cp "$TEMPLATE_DIR/$lang/welcome.html" "$TEMPLATE_DIR/$lang/patient/welcome.html"
  [ -f "$TEMPLATE_DIR/$lang/booking-confirmed-patient.html" ] && cp "$TEMPLATE_DIR/$lang/booking-confirmed-patient.html" "$TEMPLATE_DIR/$lang/patient/appointment-confirmed.html"
  [ -f "$TEMPLATE_DIR/$lang/reminder.html" ] && cp "$TEMPLATE_DIR/$lang/reminder.html" "$TEMPLATE_DIR/$lang/patient/reminder-24h.html"
  [ -f "$TEMPLATE_DIR/$lang/reminder.html" ] && cp "$TEMPLATE_DIR/$lang/reminder.html" "$TEMPLATE_DIR/$lang/patient/reminder-1h.html"
  [ -f "$TEMPLATE_DIR/$lang/after-session.html" ] && cp "$TEMPLATE_DIR/$lang/after-session.html" "$TEMPLATE_DIR/$lang/patient/session-followup.html"
  [ -f "$TEMPLATE_DIR/$lang/appointment-cancelled.html" ] && cp "$TEMPLATE_DIR/$lang/appointment-cancelled.html" "$TEMPLATE_DIR/$lang/patient/appointment-cancelled.html"
  
  # Psychologist templates
  [ -f "$TEMPLATE_DIR/$lang/welcome.html" ] && cp "$TEMPLATE_DIR/$lang/welcome.html" "$TEMPLATE_DIR/$lang/psychologist/welcome.html"
  [ -f "$TEMPLATE_DIR/$lang/booking-confirmed-psychologist.html" ] && cp "$TEMPLATE_DIR/$lang/booking-confirmed-psychologist.html" "$TEMPLATE_DIR/$lang/psychologist/appointment-confirmed.html"
  [ -f "$TEMPLATE_DIR/$lang/reminder.html" ] && cp "$TEMPLATE_DIR/$lang/reminder.html" "$TEMPLATE_DIR/$lang/psychologist/reminder-24h.html"
  [ -f "$TEMPLATE_DIR/$lang/reminder.html" ] && cp "$TEMPLATE_DIR/$lang/reminder.html" "$TEMPLATE_DIR/$lang/psychologist/reminder-1h.html"
  [ -f "$TEMPLATE_DIR/$lang/appointment-cancelled.html" ] && cp "$TEMPLATE_DIR/$lang/appointment-cancelled.html" "$TEMPLATE_DIR/$lang/psychologist/appointment-cancelled.html"
  [ -f "$TEMPLATE_DIR/$lang/verification-approved.html" ] && cp "$TEMPLATE_DIR/$lang/verification-approved.html" "$TEMPLATE_DIR/$lang/psychologist/verification-approved.html"
  [ -f "$TEMPLATE_DIR/$lang/verification-rejected.html" ] && cp "$TEMPLATE_DIR/$lang/verification-rejected.html" "$TEMPLATE_DIR/$lang/psychologist/verification-rejected.html"
  
  echo "   ✅ $lang templates migrated"
done

echo ""
echo "✅ Migration complete!"
echo ""
echo "Summary:"
echo "- All templates copied to {language}/{role}/{template} structure"
echo "- Old templates remain in place for backward compatibility"
echo "- Next step: Update service.ts to use new structure"
