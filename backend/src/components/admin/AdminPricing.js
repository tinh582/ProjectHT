import express from 'express';
import { HttpError, requireText, requireId } from '../../http.js';

const router = express.Router();

// In-memory store for extended pricing metadata if optional columns aren't in DB schema yet
const pricingMetaCache = new Map();

function inferVehicleType(planType = '') {
  const lower = String(planType).toLowerCase();
  if (lower.includes('xe máy') || lower.includes('moto') || lower.includes('motorbike')) {
    return 'Xe máy';
  }
  return 'Ô tô';
}

function inferDurationDays(planType = '') {
  const lower = String(planType).toLowerCase();
  if (lower.includes('năm') || lower.includes('year')) return 365;
  if (lower.includes('quý') || lower.includes('quarter') || lower.includes('3 tháng')) return 90;
  if (lower.includes('tuần') || lower.includes('week')) return 7;
  if (lower.includes('ngày') || lower.includes('day') || lower.includes('lượt')) return 1;
  return 30;
}

// 1. READ ALL PRICING PLANS
router.get('/', async (req, res) => {
  const { data, error } = await req.db
    .from('pricing_configs')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;

  const enriched = (data || []).map((p) => {
    const cached = pricingMetaCache.get(String(p.id)) || pricingMetaCache.get(p.plan_type) || {};
    return {
      ...p,
      vehicle_type: p.vehicle_type || cached.vehicle_type || inferVehicleType(p.plan_type),
      duration_days: p.duration_days || cached.duration_days || inferDurationDays(p.plan_type),
      description:
        p.description ||
        cached.description ||
        'Giữ cố định 1 Slot = 1 Xe • Hầm chống ngập 3 cấp • Duyệt tự động AI OCR'
    };
  });

  res.json(enriched);
});

// 2. CREATE NEW PRICING PLAN
router.post('/', async (req, res) => {
  const plan_type = requireText(req.body.plan_type, 'Plan name');
  const price = Number(req.body.price);
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    price > 1000000000 ||
    req.body.price === null ||
    req.body.price === ''
  ) {
    throw new HttpError(400, 'Invalid price.');
  }

  const vehicle_type = req.body.vehicle_type || inferVehicleType(plan_type);
  const duration_days = Number(req.body.duration_days) || inferDurationDays(plan_type);
  const description =
    req.body.description ||
    'Giữ cố định 1 Slot = 1 Xe • Hầm chống ngập 3 cấp • Duyệt tự động AI OCR';

  pricingMetaCache.set(plan_type, { vehicle_type, duration_days, description });

  const { error } = await req.db.from('pricing_configs').insert([{ plan_type, price }]);
  if (error) throw error;
  res.json({ success: true });
});

// 3. UPDATE EXISTING PRICING PLAN
router.put('/:id', async (req, res) => {
  const id = requireId(req.params.id);
  const plan_type = requireText(req.body.plan_type, 'Plan name');
  const price = Number(req.body.price);
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    price > 1000000000 ||
    req.body.price === null ||
    req.body.price === ''
  ) {
    throw new HttpError(400, 'Invalid price.');
  }

  const vehicle_type = req.body.vehicle_type || inferVehicleType(plan_type);
  const duration_days = Number(req.body.duration_days) || inferDurationDays(plan_type);
  const description =
    req.body.description ||
    'Giữ cố định 1 Slot = 1 Xe • Hầm chống ngập 3 cấp • Duyệt tự động AI OCR';

  pricingMetaCache.set(String(id), { vehicle_type, duration_days, description });
  pricingMetaCache.set(plan_type, { vehicle_type, duration_days, description });

  const { error } = await req.db
    .from('pricing_configs')
    .update({ plan_type, price })
    .eq('id', id);

  if (error) throw error;
  res.json({ success: true, message: 'Đã cập nhật gói cước thành công!' });
});

// 4. DELETE PRICING PLAN
router.delete('/:id', async (req, res) => {
  const id = requireId(req.params.id);
  const { error } = await req.db.from('pricing_configs').delete().eq('id', id);
  if (error) throw error;
  pricingMetaCache.delete(String(id));
  res.json({ success: true });
});

export default router;
