# Flashcards

An Anki-style spaced-repetition flashcard site whose **source of truth is plain CSV
spreadsheets**. Add cards by editing CSVs in Excel / Numbers / Google Sheets — one row per
card. The app reads those CSVs in the browser at runtime, so adding a row and refreshing
shows the new card. No database, no backend, no auth. Exports to a fully static site.

Cards are organized as **Subject → Deck → Topic → Card**. Study works like Anki: flip a card,
self-grade recall (Again / Hard / Good / Easy), and a spaced-repetition scheduler picks what's
due. Progress persists in `localStorage`.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000  (regenerates public/decks/index.json first)
```

## Adding cards

1. Open `public/decks/obgyn.csv` (or a new subject file) in Excel / Numbers / Sheets.
2. Add rows with this exact header, columns in order:

   ```
   subject,deck,topic,front,back
   ```

   An optional 6th column `hint` is supported (a small toggle-able hint on the card front).
3. Save / export as **CSV UTF-8**.
4. **New subject?** Save a new file like `pharmacology.csv` with the same header, drop it in
   `public/decks/`. Optionally add a color entry to `public/decks/manifest.json`.
5. `npm run dev` — the index script runs automatically. Adding rows to an *existing* file just
   needs a browser refresh; adding a *new* file needs the dev server to re-run the index step
   (restart `npm run dev`).

### CSV rules

- One row = one card. Comma-separated; fields with commas/quotes/newlines must be double-quoted
  (spreadsheets do this automatically on export).
- UTF-8 — characters like `° → ↑ ↓ β α` are preserved. Multi-line answers (quoted) render their
  line breaks.
- Blank rows, and rows missing `front` or `back`, are skipped.
- A card whose `front` begins with `[DRAW` (e.g. `[DRAW & LABEL] …`) is a "draw it yourself"
  prompt and gets a distinct teal accent.
- A card's stable id = a hash of `subject | deck | front`, so reordering rows preserves history.
  Editing a card's `front` resets its review history (treated as a new card).

### Optional theming — `public/decks/manifest.json`

```json
{
  "subjects": {
    "Obstetrics & Gynaecology": { "color": "#7c2b3e", "order": 1, "blurb": "O&G revision" }
  }
}
```

Subjects not listed fall back to an auto-assigned palette color and alphabetical order.

## Deployment (static)

```bash
npm run build    # outputs a static site to out/
```

- **Vercel / Netlify:** import the repo — framework auto-detected, works out of the box.
- **GitHub Pages (subpath):** set `basePath` / `assetPrefix` to `/<repo>` in `next.config.mjs`
  and build with `NEXT_PUBLIC_BASE_PATH=/<repo>`.
- **Any static host / VPS:** serve the `out/` folder.

### This project's live deployment

Hosted at **https://flashcards.webkraft.work** on a VPS (nginx static serving).
Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the static
export and `rsync`s `out/` to `/var/www/flashcards` on the server. DNS (`*.webkraft.work`)
and TLS (wildcard cert) are already in place, so a normal `git push` is all that's needed.

The server nginx block is mirrored at `deploy/nginx-flashcards.conf` for reference.
Deploy secrets (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`) live in the
repo's GitHub Actions secrets; the deploy uses a dedicated, restricted SSH key.

## Keyboard shortcuts (study)

| Key            | Action                       |
| -------------- | ---------------------------- |
| `Space`/`Enter`| Flip / show answer           |
| `1` `2` `3` `4`| Again / Hard / Good / Easy   |
| `H`            | Toggle hint                  |
