#!/usr/bin/env bash
# Off-site nightly backup: mirrors the flashcards-sync data (progress.json +
# a consistent reviews.db snapshot) to a PRIVATE GitHub repo so a full disk
# loss on the VPS can't take the only copy with it. Complements
# flashcards-backup.sh, which keeps same-box snapshots in /var/backups.
#
# Installed on the VPS at /usr/local/bin/flashcards-github-backup.sh, run daily
# by root cron (03:45, just after the local backup). Pushes with a deploy key
# scoped to the one private repo (/root/.ssh/flashcards_backup_deploy) — no
# account-wide token. Restore = `git clone` the repo anywhere.
#
# NOT auto-deployed by CI. When this file changes, scp it to the box manually.
set -euo pipefail

REPO=/opt/flashcards-backups
DATA=/var/lib/flashcards-sync
export GIT_SSH_COMMAND="ssh -i /root/.ssh/flashcards_backup_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

cd "$REPO"

# Stay current with the remote (in case of a manual restore commit), then refresh
# the working copy from live data.
git pull --quiet --ff-only origin main 2>/dev/null || true

[ -f "$DATA/progress.json" ] && cp "$DATA/progress.json" "$REPO/progress.json"

# Review log — consistent single-file snapshot via the helper (VACUUM INTO).
# VACUUM INTO refuses to overwrite, so clear last run's snapshot into a temp
# file first and only swap it in on success (never leave a half-written db).
if [ -f "$DATA/reviews.db" ]; then
  rm -f "$REPO/reviews.db.tmp"
  if node --disable-warning=ExperimentalWarning /opt/flashcards-sync/backup-events.js "$REPO/reviews.db.tmp"; then
    mv -f "$REPO/reviews.db.tmp" "$REPO/reviews.db"
  else
    rm -f "$REPO/reviews.db.tmp"
    echo "flashcards-github-backup: events snapshot failed"
  fi
fi

git add -A
if git diff --cached --quiet; then
  echo "flashcards-github-backup: no changes"
  exit 0
fi

git commit --quiet -m "backup $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push --quiet origin main
echo "flashcards-github-backup: pushed $(date -u +%Y-%m-%dT%H:%M:%SZ)"
