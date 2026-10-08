import express from 'express';
import { requireId, rpc } from '../../http.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const { data, error } = await req.db.from('parking_sessions')
    .select('id, entry_time, vehicles(id, user_id, type, plate, brand, model)').eq('status', 'active');
  if (error) throw error;
  res.json(data || []);
});

router.post('/:id/open', async (req, res) => {
  await rpc(req.db, 'transition_parking_session', { p_plate: null, p_session_id: requireId(req.params.id) });
  res.json({ success: true });
});
export default router;
