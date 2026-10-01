import express from 'express';
import { supabase } from '../../../config/supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        let todayTraffic = 0;
        let activeSessions = 0;
        let availableSpots = 0;
        let occupancyRate = 0;
        
        const { data: sessions, error: sessionErr } = await supabase.from('parking_sessions').select('*');
        if (sessionErr) throw sessionErr;
        
        if (sessions) {
            const todaySessions = sessions.filter(s => (s.entry_time && s.entry_time.startsWith(today)) || (s.exit_time && s.exit_time.startsWith(today)));
            todayTraffic = todaySessions.length;
            
            const active = sessions.filter(s => s.status === 'active');
            activeSessions = active.length;
        }
        
        const { data: zones, error: zonesErr } = await supabase.from('parking_zones').select('*');
        if (zonesErr) throw zonesErr;
        if (zones) {
            let totalCap = 0;
            let currOcc = 0;
            zones.forEach(z => {
                totalCap += z.total_capacity;
                currOcc += z.current_occupancy;
            });
            availableSpots = Math.max(0, totalCap - currOcc);
            occupancyRate = totalCap > 0 ? Math.round((currOcc / totalCap) * 100) : 0;
        }

        const { data: transactions, error: txErr } = await supabase.from('transactions').select('*').eq('status', 'completed');
        if (txErr) throw txErr;

        let todayRevenue = 0;
        let reportData = [];

        if (transactions) {
            const last7Days = [...Array(7)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            reportData = last7Days.map(date => {
                const dayTotal = transactions
                    .filter(t => t.created_at.startsWith(date))
                    .reduce((sum, t) => sum + Number(t.amount), 0);
                
                if (date === today) {
                    todayRevenue = dayTotal;
                }
                
                const parts = date.split('-');
                return {
                    name: `${parts[2]}/${parts[1]}`,
                    revenue: dayTotal
                };
            });
        }

        res.json({
            todayTraffic,
            activeSessions,
            availableSpots,
            occupancyRate,
            todayRevenue,
            reportData
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
