import express from 'express';
import { supabase } from '../../../config/supabase.js';

const router = express.Router();

router.get('/zones', async (req, res) => {
    try {
        const { data, error } = await supabase.from('parking_zones').select('*').order('created_at', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/slots', async (req, res) => {
    try {
        const { data, error } = await supabase.from('parking_slots').select('*, vehicles(plate)');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/zones', async (req, res) => {
    try {
        const { zone_name, vehicle_type, total_capacity } = req.body;
        const capacity = parseInt(total_capacity);

        const { data: newZone, error } = await supabase.from('parking_zones').insert([{ 
            zone_name, 
            vehicle_type,
            total_capacity: capacity
        }]).select();

        if (error) throw error;

        if (newZone && newZone.length > 0) {
            const zoneId = newZone[0].id;
            const prefix = zone_name.split(' ')[0] || 'A';
            const slotsToInsert = [];
            for (let i = 1; i <= capacity; i++) {
                slotsToInsert.push({ zone_id: zoneId, slot_name: `${prefix}-${i}` });
            }
            await supabase.from('parking_slots').insert(slotsToInsert);
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/zones/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('parking_zones').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/zones/:id/slots', async (req, res) => {
    try {
        const { zone_name, total_capacity } = req.body;
        const prefix = zone_name.split(' ')[0] || 'Z';
        const slotsToInsert = [];
        for (let i = 1; i <= total_capacity; i++) {
            slotsToInsert.push({ zone_id: req.params.id, slot_name: `${prefix}-${i}` });
        }
        const { error } = await supabase.from('parking_slots').insert(slotsToInsert);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
