function mergeMap(a = {}, b = {}, tsOf) {
  const out = { ...a };
  for (const [id, v] of Object.entries(b || {})) {
    if (!out[id] || tsOf(v) >= tsOf(out[id])) out[id] = v;
  }
  return out;
}

const reviewTs = (r) => (r && r.ts) || 0;
const flagTs = (f) => (f && f.ts) || 0;

const NO_EXAM = { value: null, ts: 0 };
function mergeExam(a, b) {
  const x = a ?? NO_EXAM, y = b ?? NO_EXAM;
  return (y.ts >= x.ts ? y : x);
}

function emptyDoc() {
  return { version: 1, updatedAt: Date.now(), resetAt: null, reviews: {}, bookmarks: {}, hidden: {}, examDate: { value: null, ts: 0 }, goalDays: {} };
}

function mergeDoc(base, incoming) {
  return {
    version: 1,
    updatedAt: Date.now(),
    resetAt: incoming.resetAt ?? base.resetAt ?? null,
    reviews: mergeMap(base.reviews ?? {}, incoming.reviews ?? {}, reviewTs),
    bookmarks: mergeMap(base.bookmarks ?? {}, incoming.bookmarks ?? {}, flagTs),
    hidden: mergeMap(base.hidden ?? {}, incoming.hidden ?? {}, flagTs),
    examDate: mergeExam(base.examDate, incoming.examDate),
    goalDays: mergeMap(base.goalDays ?? {}, incoming.goalDays ?? {}, flagTs),
  };
}

module.exports = { mergeMap, mergeDoc, emptyDoc, reviewTs, flagTs };
