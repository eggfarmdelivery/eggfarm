// POST /api/admin
// body: { action: 'login'|'update-order'|'photo'|'settings', ...data }
const { sheetsGet, sheetsUpdate, getDrive } = require('./_sheets');
const { createToken, verifyAdmin } = require('./_auth');
const { Readable } = require('stream');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action, ...data } = req.body || {};

    // ── 로그인 (인증 불필요) ──
    if (action === 'login') {
      const token = createToken(data.password);
      if (!token) return res.status(401).json({ error: '비밀번호가 틀렸습니다' });
      return res.status(200).json({ token });
    }

    // 이하 모든 요청은 토큰 필요
    if (!verifyAdmin(req)) return res.status(401).json({ error: '인증 필요' });

    // ── 주문 상태 변경 ──
    if (action === 'update-order') {
      const { orderId, status, photoUrl } = data;
      if (!orderId || !status) return res.status(400).json({ error: '필수 항목 누락' });

      const rows = await sheetsGet('주문내역!A:A');
      const rowIdx = rows.findIndex(r => r[0] === orderId);
      if (rowIdx < 0) return res.status(404).json({ error: '주문을 찾을 수 없습니다' });

      const r = rowIdx + 1;
      const now = new Date().toISOString();
      await sheetsUpdate(`주문내역!M${r}`, [[status]]);

      if (status === 'PAID')       await sheetsUpdate(`주문내역!O${r}`, [[now]]);
      if (status === 'DELIVERING') await sheetsUpdate(`주문내역!P${r}`, [[now]]);
      if (status === 'DONE')       await sheetsUpdate(`주문내역!Q${r}`, [[now]]);
      if (photoUrl)                await sheetsUpdate(`주문내역!R${r}`, [[photoUrl]]);

      return res.status(200).json({ success: true });
    }

    // ── 사진 업로드 ──
    if (action === 'photo') {
      const { base64, mimeType, orderId } = data;
      if (!base64 || !orderId) return res.status(400).json({ error: '필수 항목 누락' });

      const drive = await getDrive();
      const buffer = Buffer.from(base64, 'base64');
      const stream = Readable.from(buffer);

      const uploaded = await drive.files.create({
        requestBody: { name: `delivery_${orderId}_${Date.now()}.jpg`, mimeType: mimeType || 'image/jpeg' },
        media: { mimeType: mimeType || 'image/jpeg', body: stream },
        fields: 'id,webViewLink',
      });

      await drive.permissions.create({
        fileId: uploaded.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      });

      return res.status(200).json({ url: uploaded.data.webViewLink });
    }

    // ── 설정 조회 (관리자용 전체) ──
    if (action === 'get-settings') {
      const [products, apts, schedules, settings] = await Promise.all([
        sheetsGet('상품!A2:C'),
        sheetsGet('단지!A2:C'),
        sheetsGet('운영설정!A2:J'),
        sheetsGet('설정!A2:B'),
      ]);
      return res.status(200).json({ products, apts, schedules, settings });
    }

    return res.status(400).json({ error: '알 수 없는 action: ' + action });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
