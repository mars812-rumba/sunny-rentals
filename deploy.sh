#!/bin/bash
# Deploy script для sunny-rentals

set -e

echo "🚀 Deploying sunny-rentals..."

cd /home/openclawbot/clawd/sunny-rentals

# Pull latest changes
echo "📥 Git pull..."
git pull origin marsel-collab

# Install dependencies (если нужно)
# echo "📦 npm install..."
# npm install

# Build
echo "🔨 Building..."
npm run build

# Restart service (пример для PM2)
echo "🔄 Restarting service..."
# pm2 restart sunny-api || pm2 start npm --name "sunny-api" -- run start

echo "✅ Deploy complete!"
