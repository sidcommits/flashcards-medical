#!/usr/bin/env bash
# Nightly snapshot of the flashcards-sync progress store.
#
# The sync service keeps ALL of her review history in a single JSON file. This
# takes a timestamped copy and retains the most recent 14, so a bad write,
# accidental deletion, or file corruption can't wipe her progress.
#
# Installed on the VPS at /usr/local/bin/flashcards-backup.sh, run daily by
# root cron (03:30). Same-box backups protect against data loss, NOT full disk
# loss — when Wave 3 moves the store to SQLite, switch this to Litestream for
# off-box durability.
set -euo pipefail

SRC=/var/lib/flashcards-sync/progress.json
DIR=/var/backups/flashcards
KEEP=14

mkdir -p "$DIR"
[ -f "$SRC" ] || { echo "flashcards-backup: source $SRC missing, nothing to do"; exit 0; }

cp "$SRC" "$DIR/progress-$(date +%Y%m%d-%H%M%S).json"

# Prune to the most recent $KEEP snapshots.
ls -1t "$DIR"/progress-*.json 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

echo "flashcards-backup: ok ($(ls -1 "$DIR"/progress-*.json | wc -l) snapshots retained)"
