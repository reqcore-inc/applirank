#!/bin/bash
set -euo pipefail
cd /opt/reqcore

QUICK=false
[[ "${1:-}" == "-quick" ]] && QUICK=true

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$CURRENT_BRANCH" = "esc" ]; then
    echo "==> Updating upstream (main)..."
    git fetch origin main
    
    echo "==> Rebasing ESC patches onto latest upstream..."
    if ! git rebase origin/main; then
        echo "❌ Rebase conflict! Resolve manually:"
        echo "   cd /opt/reqcore"
        echo "   # fix conflicts, then: git rebase --continue"
        echo "   # or abort: git rebase --abort"
        exit 1
    fi
    echo "✅ ESC patches rebased successfully"
else
    echo "==> Pulling latest code..."
    git pull --ff-only
fi

if [ "$QUICK" = false ]; then
    echo "==> Rebuilding Docker images..."
    docker compose build --no-cache
fi

echo "==> Restarting stack..."
docker compose up -d

echo "==> Running migrations..."
sleep 5
docker compose exec app npm run db:migrate

echo "==> Done!"
docker ps --format 'table {{.Names}}\t{{.Status}}'
