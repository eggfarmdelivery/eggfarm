// POST /api/orders  - 주문 생성
// GET  /api/orders  - 오늘 주문 목록 (관리자용, 토큰 필요)
const { sheetsGet, sheetsAppend } = require('./_sheets');
const { verifyAdmin } = require('./_auth');

function orderId(count) {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${d}-${String(count).padStart(3, '0')}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'POST') {
      // 고객 주문 생성 (인증 불필요)
      const { name, phone, aptId, aptName, dong, ho, doorPw, products, amount, deliveryFee, orderDate, request } = req.body;
      if (!name || !phone || !dong || !ho || !products) {
        return res.status(400).json({ error: '필수 항목이 누락되었습니다' });
      }

      const rows = await sheetsGet('주문내역!A:A');
      const id = orderId(rows.length); // 헤더 포함이므로 length = 다음 인덱스

      const now = new Date().toISOString();
      const row = [
        id, orderDate || now.slice(0, 10), name, phone,
        aptId || '', aptName || '', dong, ho, doorPw || '',
        products, amount || 0, deliveryFee || 0,
        'WAITING', now, '', '', '', '', request || ''
      ];
      await sheetsAppend('주문내역!A:S', [row]);

      return res.status(200).json({ success: true, orderId: id });
    }

    if (req.method === 'GET') {
      // 주문 조회 - 인증 없이 orderId 또는 name+phone4로 조회 가능
      const { orderId: oid, name, phone4, date } = req.query;

      const rows = await sheetsGet('주문내역!A2:S');
      const orders = rows.map(r => ({
        id: r[0] || '', orderDate: r[1] || '', name: r[2] || '',
        phone: r[3] || '', aptId: r[4] || '', aptName: r[5] || '',
        dong: r[6] || '', ho: r[7] || '', doorPw: r[8] || '',
        products: r[9] || '', amount: +r[10] || 0,
        deliveryFee: +r[11] || 0, status: r[12] || '',
        orderTime: r[13] || '', paidTime: r[14] || '',
        deliveryTime: r[15] || '', doneTime: r[16] || '',
        photoUrl: r[17] || '', request: r[18] || ''
      }));

      // 고객 배송조회: orderId 또는 name+phone4
      if (oid) {
        const order = orders.find(o => o.id.toUpperCase() === oid.toUpperCase());
        if (!order) return res.status(404).json({ error: '주문을 찾을 수 없습니다' });
        // 민감정보 제거 후 반환
        const { doorPw: _, phone: __, ...safe } = order;
        return res.status(200).json(safe);
      }
      if (name && phone4) {
        const order = orders.find(o => o.name === name && o.phone.endsWith(phone4));
        if (!order) return res.status(404).json({ error: '주문을 찾을 수 없습니다' });
        const { doorPw: _, phone: __, ...safe } = order;
        return res.status(200).json(safe);
      }

      // 관리자: 날짜/월별 전체 조회 (토큰 필요)
      if (!verifyAdmin(req)) return res.status(401).json({ error: '인증 필요' });
      const { month } = req.query;
      if (month) {
        // 월별 조회 (YYYY-MM)
        return res.status(200).json(orders.filter(o => (o.orderDate || '').startsWith(month)));
      }
      const targetDate = date || new Date().toISOString().slice(0, 10);
      return res.status(200).json(orders.filter(o => o.orderDate === targetDate));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
