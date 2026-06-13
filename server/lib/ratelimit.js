const hits = new Map();

function rateLimit(key, max = 10, windowMs = 60000) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  const ok = arr.length < max;
  if (ok) arr.push(now);
  hits.set(key, arr);
  return ok;
}

module.exports = { rateLimit };
