function mergeMap(a = {}, b = {}, tsOf) {
  const out = { ...a };
  for (const [id, v] of Object.entries(b || {})) {
    if (!out[id] || tsOf(v) >= tsOf(out[id])) out[id] = v;
  }
  return out;
}

const reviewTs = (r) => (r && r.ts) || 0;
const flagTs = (f) => (f && f.ts) || 0;

function emptyDoc() {
  return { version: 1, updatedAt: Date.now(), resetAt: null, reviews: {}, bookmarks: {}, hidden: {} };
}

function mergeDoc(base, incoming) {
  return {
    version: 1,
    updatedAt: Date.now(),
    resetAt: incoming.resetAt ?? base.resetAt ?? null,
    reviews: mergeMap(base.reviews, incoming.reviews, reviewTs),
    bookmarks: mergeMap(base.bookmarks, incoming.bookmarks, flagTs),
    hidden: mergeMap(base.hidden, incoming.hidden, flagTs),
  };
}

module.exports = { mergeMap, mergeDoc, emptyDoc, reviewTs, flagTs };
