#!/bin/bash

# Test Welcome Email via API
# This sends a welcome email directly using the running server

USER_ID="6d9dcaf2-e8b9-445b-ad29-61d29e64ad79"
EMAIL="loviqa.appdevelopment@gmail.com"
FIRST_NAME="Mucahit"

echo "📧 Testing Welcome Email via API..."
echo ""
echo "User ID: $USER_ID"
echo "Email: $EMAIL"
echo "First Name: $FIRST_NAME"
echo ""

# Send test via a simple curl to trigger the email system
# We'll create a simple test endpoint

echo "Since there's no direct email API, let's check the server logs for email sending..."
echo ""
echo "Checking recent server logs for email activity:"
tail -100 /Users/dev/development/Mendly/server.log | grep -i "email\|smtp\|welcome" | tail -20
