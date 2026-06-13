const crypto = require('crypto');

function hashPassword(password, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
  const dk = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${dk.toString('hex')}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [saltHex, hashHex] = stored.split(':');
  const expected = Buffer.from(hashHex, 'hex');
  const dk = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  return dk.length === expected.length && crypto.timingSafeEqual(dk, expected);
}

module.exports = { hashPassword, verifyPassword };
