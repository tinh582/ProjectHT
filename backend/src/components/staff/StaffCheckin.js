import express from 'express';
import { requireText, rpc } from '../../http.js';
const router = express.Router();

router.post('/', async (req, res) => {
  const plate = requireText(req.body.plateInput, 'License plate', 30).toUpperCase();
  const result = await rpc(req.db, 'transition_parking_session', { p_plate: plate, p_session_id: null });
  res.json({ logMessage: result.message });
});
export default router;
