// GET  /api/settings  - 고객용 공개 설정 (운영일, 상품, 단지, 계좌)
// POST /api/settings  - 설정 저장 (관리자 전용)
const { sheetsGet, sheetsAppend, sheetsUpdate } = require('./_sheets');
const { verifyAdmin } = require('./_auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      // 고객도 접근 가능한 공개 데이터
      const [products, apts, schedules, settingsRows] = await Promise.all([
        sheetsGet('상품!A2:C'),
        sheetsGet('단지!A2:C'),
        sheetsGet('운영설정!A2:J'),
        sheetsGet('설정!A2:B'),
      ]);

      const settings = {};
      settingsRows.forEach(r => { settings[r[0]] = r[1] || ''; });

      return res.status(200).json({
        products: products.map(r => ({ id: r[0], name: r[1], price: +r[2] || 0 })),
        apts: apts.map(r => ({ id: r[0], name: r[1], address: r[2] || '' })),
        schedules: schedules.map(r => ({
          id: r[0], orderDate: r[1], deadline: r[2],
          deliveryDate: r[3], deliveryTime: r[4],
          fee1: +r[5] || 0, fee2: +r[6] || 0,
          products: (r[7] || '').split(',').filter(Boolean),
          active: r[8] !== 'FALSE',
        })),
        // 고객에게 노출할 설정만 (계좌, 카카오)
        account: settings.account || '',
        accountName: settings.accountName || '',
        kakao: settings.kakao || '',
      });
    }

    // 이하 관리자 전용
    if (!verifyAdmin(req)) return res.status(401).json({ error: '인증 필요' });

    if (req.method === 'POST') {
      const { type, data } = req.body;

      if (type === 'schedule') {
        const { id, orderDate, deadline, deliveryDate, deliveryTime, fee1, fee2, products, active } = data;
        const row = [id, orderDate, deadline, deliveryDate, deliveryTime || '', fee1 || 0, fee2 || 0, (products || []).join(','), active !== false ? 'TRUE' : 'FALSE', ''];
        await sheetsAppend('운영설정!A:J', [row]);
        return res.status(200).json({ success: true });
      }

      if (type === 'product') {
        const { id, name, price } = data;
        await sheetsAppend('상품!A:C', [[id, name, price]]);
        return res.status(200).json({ success: true });
      }

      if (type === 'apt') {
        const { id, name, address } = data;
        await sheetsAppend('단지!A:C', [[id, name, address]]);
        return res.status(200).json({ success: true });
      }

      if (type === 'setting') {
        const { key, value } = data;
        const rows = await sheetsGet('설정!A:A');
        const idx = rows.findIndex(r => r[0] === key);
        if (idx >= 0) {
          await sheetsUpdate(`설정!B${idx + 2}`, [[value]]);
        } else {
          await sheetsAppend('설정!A:B', [[key, value]]);
        }
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: '알 수 없는 type' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
