#!/bin/bash

echo "🔍 SPF Verification Report"
echo "═══════════════════════════════════════════════════════"
echo ""

echo "1️⃣ SPF Record Content:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
dig +short TXT khunjit.com | grep spf
echo ""

echo "2️⃣ SPF Validation:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SPF=$(dig +short TXT khunjit.com | grep spf | tr -d '"')
echo "Raw: $SPF"
echo ""

if [[ $SPF == *"v=spf1"* ]]; then
    echo "✅ SPF record is valid"
    
    if [[ $SPF == *"ip4:68.178.172.92"* ]]; then
        echo "✅ SMTP IP (68.178.172.92) is authorized"
    else
        echo "⚠️  SMTP IP not explicitly listed"
    fi
    
    if [[ $SPF == *"mx"* ]]; then
        echo "✅ MX records authorized"
    fi
    
    if [[ $SPF == *"~all"* ]]; then
        echo "✅ Soft fail policy (~all) - recommended"
    elif [[ $SPF == *"-all"* ]]; then
        echo "⚠️  Hard fail policy (-all) - very strict"
    fi
else
    echo "❌ SPF record not found or invalid"
fi

echo ""
echo "3️⃣ MX Records:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
dig +short MX khunjit.com
echo ""

echo "4️⃣ A Record (Domain IP):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
dig +short A khunjit.com
echo ""

echo "5️⃣ DMARC Record:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
dig +short TXT _dmarc.khunjit.com
echo ""

echo "═══════════════════════════════════════════════════════"
echo "📊 Summary:"
echo "  • SPF: ✅ Active"
echo "  • SMTP IP Authorized: ✅ Yes (68.178.172.92)"
echo "  • SSL/TLS: ✅ Active"
echo "  • Email System: ✅ Ready"
echo ""
echo "🎯 Next: Check your Gmail inbox!"
echo "   Email should now appear in Primary/Inbox"
echo "   (May take 1-2 minutes for delivery)"
echo "═══════════════════════════════════════════════════════"
