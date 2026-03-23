#!/bin/bash

# Mission Control API Key Setup Script

echo "🎯 Mission Control API Key Setup"
echo "================================"

# Check if .env exists
if [[ ! -f .env ]]; then
    echo "❌ .env file not found!"
    exit 1
fi

echo "📝 Current .env file:"
echo "ANTHROPIC_API_KEY=your_claude_api_key_here"
echo ""
echo "Please provide your Claude API key:"
read -p "Claude API Key: " CLAUDE_API_KEY

if [[ -z "$CLAUDE_API_KEY" ]]; then
    echo "❌ No API key provided. Exiting."
    exit 1
fi

# Update the .env file
sed -i.backup "s/your_claude_api_key_here/$CLAUDE_API_KEY/g" .env

echo "✅ API key updated in .env file"
echo "🚀 Starting Mission Control with real Claude API integration..."

# Start the dashboard
node dashboard.js