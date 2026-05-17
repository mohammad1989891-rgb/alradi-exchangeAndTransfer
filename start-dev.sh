#!/bin/bash
# Keep Next.js dev server alive - restart if it dies
cd /home/z/my-project
while true; do
  NODE_OPTIONS="--max-old-space-size=384" node node_modules/.bin/next dev -p 3000
  echo "Server crashed at $(date), restarting in 3s..."
  sleep 3
done
