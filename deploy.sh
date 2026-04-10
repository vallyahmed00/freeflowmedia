#!/bin/bash
echo "🚀 Building..."
npm run build
echo "🔥 Deploying to Firebase..."
firebase deploy --only hosting
echo "📦 Pushing to GitHub..."
git add .
git commit -m "Auto deploy $(date '+%Y-%m-%d %H:%M')"
git push
echo "✅ Done!"
