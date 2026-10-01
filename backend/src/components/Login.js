import express from 'express';
import { supabase } from '../../config/supabase.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ session: data.session, user: data.user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
