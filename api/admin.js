// POST /api/admin/login   - 관리자 로그인 → 토큰 반환
// PUT  /api/admin/orders  - 주문 상태 변경
// POST /api/admin/photo   - 배달 완료 사진 업로드
const { sheetsGet, sheetsUpdate, getDrive } = require('./_sheets');
const { createToken, verifyAdmin } = require('./_auth');
const { Readable } = require('stream');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = req.url.replace('/api/admin', '');

  try {
    // ── 로그인 (인증 불필요) ──
    if (req.method === 'POST' && path === '/login') {
      const { password } = req.body;
      const token = createToken(password);
      if (!token) return res.status(401).json({ error: '비밀번호가 틀렸습니다' });
      return res.status(200).json({ token });
    }

    // 이하 모든 요청은 토큰 필요
    if (!verifyAdmin(req)) return res.status(401).json({ error: '인증 필요' });

    // ── 주문 상태 변경 ──
    if (req.method === 'PUT' && path === '/orders') {
      const { orderId, status, photoUrl } = req.body;
      if (!orderId || !status) return res.status(400).json({ error: '필수 항목 누락' });

      const rows = await sheetsGet('주문내역!A:A');
      const rowIdx = rows.findIndex(r => r[0] === orderId);
      if (rowIdx < 0) return res.status(404).json({ error: '주문을 찾을 수 없습니다' });

      const r = rowIdx + 1; // 1-based (헤더 포함)
      const now = new Date().toISOString();

      // 상태별 시간 컬럼 업데이트 (M:R = 13:18)
      const statusMap = {
        PAID:       { col: 'O', val: now }, // paidTime
        DELIVERING: { col: 'P', val: now }, // deliveryTime
        DONE:       { col: 'Q', val: now }, // doneTime
      };

      await sheetsUpdate(`주문내역!M${r}`, [[status]]);
      if (statusMap[status]) {
        await sheetsUpdate(`주문내역!${statusMap[status].col}${r}`, [[statusMap[status].val]]);
      }
      if (photoUrl) {
        await sheetsUpdate(`주문내역!R${r}`, [[photoUrl]]);
      }

      return res.status(200).json({ success: true });
    }

    // ── 사진 업로드 (배달완료) ──
    if (req.method === 'POST' && path === '/photo') {
      // base64 이미지 수신 후 Drive 업로드
      const { base64, mimeType, orderId } = req.body;
      if (!base64 || !orderId) return res.status(400).json({ error: '필수 항목 누락' });

      const drive = await getDrive();
      const buffer = Buffer.from(base64, 'base64');
      const stream = Readable.from(buffer);

      const uploaded = await drive.files.create({
        requestBody: {
          name: `delivery_${orderId}_${Date.now()}.jpg`,
          mimeType: mimeType || 'image/jpeg',
        },
        media: { mimeType: mimeType || 'image/jpeg', body: stream },
        fields: 'id,webViewLink',
      });

      // 공개 읽기 권한 부여
      await drive.permissions.create({
        fileId: uploaded.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      });

      return res.status(200).json({ url: uploaded.data.webViewLink, fileId: uploaded.data.id });
    }

    // ── 설정 조회 ──
    if (req.method === 'GET' && path === '/settings') {
      const [products, apts, schedules, settings] = await Promise.all([
        sheetsGet('상품!A2:C'),
        sheetsGet('단지!A2:C'),
        sheetsGet('운영설정!A2:J'),
        sheetsGet('설정!A2:B'),
      ]);
      return res.status(200).json({ products, apts, schedules, settings });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
