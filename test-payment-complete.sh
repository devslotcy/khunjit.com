#!/bin/bash
# Test script to simulate payment completion
# Usage: ./test-payment-complete.sh <payment-id> <auth-token>

if [ -z "$1" ]; then
  echo "❌ Error: Payment ID required"
  echo "Usage: ./test-payment-complete.sh <payment-id> <auth-token>"
  exit 1
fi

PAYMENT_ID="$1"
AUTH_TOKEN="$2"

if [ -z "$AUTH_TOKEN" ]; then
  echo "⚠️  Warning: No auth token provided. Request may fail if authentication is required."
fi

echo "🔄 Simulating payment completion for: $PAYMENT_ID"
echo ""

if [ -n "$AUTH_TOKEN" ]; then
  RESPONSE=$(curl -s -X POST "http://localhost:5055/api/payments/$PAYMENT_ID/simulate-complete" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN")
else
  RESPONSE=$(curl -s -X POST "http://localhost:5055/api/payments/$PAYMENT_ID/simulate-complete" \
    -H "Content-Type: application/json")
fi

echo "📡 Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if successful
if echo "$RESPONSE" | grep -q "\"success\":true"; then
  echo "✅ Payment simulation successful!"
  echo "📋 Check your appointment status - it should be 'confirmed' now"
else
  echo "❌ Payment simulation failed"
fi
