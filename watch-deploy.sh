#!/bin/bash
echo "👀 Watching for changes..."
chokidar "src/**/*" -c "npm run build && firebase deploy --only hosting"
