import express from 'express';
import { rpc } from '../../http.js';
const router = express.Router();

router.get('/', async (req, res) => {
  res.json(await rpc(req.db, 'parking_report', { p_time_zone: process.env.REPORT_TIME_ZONE || 'Asia/Ho_Chi_Minh' }));
});
export default router;
