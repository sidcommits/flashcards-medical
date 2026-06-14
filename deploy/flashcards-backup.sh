#!/usr/bin/env bash
# Nightly snapshot of the flashcards-sync data: current card state
# (progress.json) and the append-only review log (reviews.db). Keeps the most
# recent 14 of each so a bad write, deletion, or corruption can't wipe history.
#
# Installed on the VPS at /usr/local/bin/flashcards-backup.sh, run daily by
# root cron (03:30). Same-box backups protect against data loss, NOT full disk
# loss — when traffic justifies it, stream reviews.db off-box with Litestream.
set -euo pipefail

DIR=/var/backups/flashcards
KEEP=14
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p "$DIR"

# Current card state.
SRC=/var/lib/flashcards-sync/progress.json
[ -f "$SRC" ] && cp "$SRC" "$DIR/progress-$TS.json"

# Review log — consistent single-file snapshot via the helper (VACUUM INTO).
if [ -f /var/lib/flashcards-sync/reviews.db ]; then
  node --disable-warning=ExperimentalWarning /opt/flashcards-sync/backup-events.js "$DIR/reviews-$TS.db" \
    || echo "flashcards-backup: events snapshot failed"
fi

# Prune each family to the most recent $KEEP.
for prefix in progress reviews; do
  ls -1t "$DIR/$prefix-"* 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
done

echo "flashcards-backup: ok ($TS)"
