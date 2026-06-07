// 관리자 인증 헬퍼
// Authorization: Bearer <token> 헤더 검증
// 토큰 = ADMIN_PASSWORD를 SHA-256 해시한 값 (클라이언트에서 전송)
const crypto = require('crypto');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// 로그인: 비밀번호 → 토큰 발급
function createToken(password) {
  if (password !== ADMIN_PASSWORD) return null;
  // 토큰 = sha256(password + secret_salt)
  const salt = process.env.TOKEN_SALT || 'egfarm_salt_2024';
  return sha256(password + salt);
}

// 요청 검증
function verifyAdmin(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return false;
  const salt = process.env.TOKEN_SALT || 'egfarm_salt_2024';
  const expected = sha256(ADMIN_PASSWORD + salt);
  return token === expected;
}

module.exports = { createToken, verifyAdmin };
