import express from 'express';
import { supabase } from '../../../config/supabase.js';

const router = express.Router();

// TODO: Move logic from admin/AdminDashboard.jsx here
router.get('/', (req, res) => {
    res.json({ message: "API for admin/AdminDashboard" });
});

export default router;
