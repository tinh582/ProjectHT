import express from 'express';
import { supabase } from '../../../config/supabase.js';

const router = express.Router();

router.get('/pricing', async (req, res) => {
    try {
        const { data } = await supabase.from('pricing_configs').select('*').order('price', { ascending: true });
        res.json(data || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/subscription/:userId', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', req.params.userId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1);
        if (error) throw error;
        res.json(data && data.length > 0 ? data[0] : null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/pay', async (req, res) => {
    try {
        const { userId, selectedPlan } = req.body;
        
        await supabase.from('transactions').insert([{
            user_id: userId,
            amount: selectedPlan.price,
            plan_name: selectedPlan.plan_type,
            status: 'completed'
        }]);
        
        await supabase.from('notifications').insert([{
            user_id: userId,
            title: 'Thanh toán thành công',
            message: `Bạn đã mua thành công gói ${selectedPlan.plan_type} với giá ${selectedPlan.price.toLocaleString()}đ.`,
        }]);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
