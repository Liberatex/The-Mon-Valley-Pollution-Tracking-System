#!/bin/bash

echo "🚀 Setting up Ollama Cloud for Mon Valley Pollution Tracking System"
echo "================================================================"

echo ""
echo "📋 Steps to complete:"
echo "1. Sign up at: https://cloud.ollama.com"
echo "2. Get your API key from the dashboard"
echo "3. Add the API key to Firebase Functions environment"
echo ""

echo "🔑 To add your API key to Firebase Functions:"
echo "firebase functions:config:set ollama.api_key=\"YOUR_API_KEY_HERE\""
echo ""

echo "📦 Then deploy the updated functions:"
echo "firebase deploy --only functions"
echo ""

echo "✅ That's it! Your BreatheAI will now use cloud-based Llama 3.1"
echo ""

echo "💰 Pricing:"
echo "- Free tier: 100 requests/month"
echo "- Paid: $0.10 per 1M tokens"
echo "- Very cost-effective for production"
echo ""

echo "🎯 Benefits:"
echo "- ✅ Always available (24/7)"
echo "- ✅ No server management"
echo "- ✅ Scales automatically"
echo "- ✅ Same Llama 3 models you're used to"
echo "- ✅ Perfect for production"
echo ""

echo "Ready to proceed? Run the commands above after getting your API key!" 