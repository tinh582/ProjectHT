import express from 'express';
import { supabase } from '../../config/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    res.json({ user, role: profile?.role || 'user' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
