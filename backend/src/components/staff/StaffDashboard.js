import express from 'express';
import { supabase } from '../../../config/supabase.js';

const router = express.Router();

// TODO: Move logic from staff/StaffDashboard.jsx here
router.get('/', (req, res) => {
    res.json({ message: "API for staff/StaffDashboard" });
});

export default router;
