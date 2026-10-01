import express from 'express';
import { supabase } from '../../config/supabase.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password, full_name, phone } = req.body;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, phone }
      }
    });
    if (error) return res.status(400).json({ error: error.message });
    
    if (data.user) {
      await supabase
        .from('profiles')
        .insert([{ id: data.user.id, name: full_name, email: email }]);
    }
    
    res.json({ session: data.session, user: data.user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
