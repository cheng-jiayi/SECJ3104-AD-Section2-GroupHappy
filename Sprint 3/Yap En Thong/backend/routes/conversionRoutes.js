const express = require('express');
const router = express.Router();
const db = require('../database');

// Get pending conversions (admin)
router.get('/pending', async (req, res) => {
    try {
        const query = `
            SELECT 
                ch.id,
                u.fullName as studentName,
                s.studentID as studentId,
                ch.reward_points as rewardPoints,
                ch.merit_points as meritPoints,
                ch.status,
                DATE_FORMAT(ch.request_date, '%Y-%m-%d') as requestDate,
                ch.conversion_rate as conversionRate
            FROM conversion_history ch
            JOIN Student s ON ch.student_id = s.studentID
            JOIN User u ON s.userID = u.userID
            WHERE ch.status = 'Pending'
            ORDER BY ch.request_date ASC
        `;
        
        const [rows] = await db.query(query);
        
        // Add selected property for frontend
        const rowsWithSelection = rows.map(row => ({
            ...row,
            selected: false
        }));
        
        res.json({
            success: true,
            data: rowsWithSelection,
            total: rows.length,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Pending conversions error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching pending conversions',
            error: error.message 
        });
    }
});

// Get conversion history (admin)
router.get('/history', async (req, res) => {
    try {
        const query = `
            SELECT 
                ch.id,
                u.fullName as studentName,
                s.studentID as studentId,
                ch.reward_points as rewardPoints,
                ch.merit_points as meritPoints,
                ch.status,
                DATE_FORMAT(ch.request_date, '%Y-%m-%d') as date,
                ch.processed_date,
                ch.rejection_reason as reason,
                ch.processed_by as adminName
            FROM conversion_history ch
            JOIN Student s ON ch.student_id = s.studentID
            JOIN User u ON s.userID = u.userID
            WHERE ch.status IN ('Approved', 'Rejected')
            ORDER BY ch.request_date DESC
            LIMIT 50
        `;
        
        const [rows] = await db.query(query);
        
        res.json({
            success: true,
            data: rows,
            total: rows.length
        });
    } catch (error) {
        console.error('Conversion history error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching conversion history',
            error: error.message 
        });
    }
});

// Approve conversion requests
router.post('/approve', async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        const { conversionIds } = req.body;
        
        if (!conversionIds || !Array.isArray(conversionIds) || conversionIds.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No conversion IDs provided' 
            });
        }
        
        // Get conversion details
        const getQuery = `
            SELECT 
                ch.id,
                ch.student_id,
                ch.reward_points,
                ch.merit_points
            FROM conversion_history ch
            WHERE ch.id IN (?)
                AND ch.status = 'Pending'
        `;
        
        const [conversions] = await connection.query(getQuery, [conversionIds]);
        
        if (conversions.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No pending conversions found' 
            });
        }
        
        // Update each conversion
        for (const conversion of conversions) {
            // Update conversion status
            await connection.query(
                'UPDATE conversion_history SET status = "Approved", processed_date = NOW() WHERE id = ?',
                [conversion.id]
            );
            
            // Update student points
            await connection.query(`
                UPDATE Student 
                SET 
                    totalPoints = totalPoints - ?,
                    totalMerits = totalMerits + ?
                WHERE studentID = ?
            `, [conversion.reward_points, conversion.merit_points, conversion.student_id]);
            
            // Record transaction
            await connection.query(`
                INSERT INTO merit_transactions (
                    student_id,
                    transaction_type,
                    reward_points,
                    merit_points,
                    transaction_date
                ) VALUES (?, 'Conversion Approval', ?, ?, NOW())
            `, [conversion.student_id, conversion.reward_points, conversion.merit_points]);
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: `Successfully approved ${conversions.length} conversion(s)`,
            data: {
                count: conversions.length,
                totalRewardPoints: conversions.reduce((sum, c) => sum + c.reward_points, 0),
                totalMeritPoints: conversions.reduce((sum, c) => sum + c.merit_points, 0)
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Approve conversion error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error approving conversions',
            error: error.message 
        });
    } finally {
        connection.release();
    }
});

// Reject conversion requests
router.post('/reject', async (req, res) => {
    try {
        const { conversionIds, reason } = req.body;
        
        if (!conversionIds || !Array.isArray(conversionIds) || conversionIds.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No conversion IDs provided' 
            });
        }
        
        const query = `
            UPDATE conversion_history 
            SET 
                status = 'Rejected',
                processed_date = NOW(),
                rejection_reason = ?
            WHERE id IN (?)
                AND status = 'Pending'
        `;
        
        const [result] = await db.query(query, [reason || 'No reason provided', conversionIds]);
        
        res.json({
            success: true,
            message: `Successfully rejected ${result.affectedRows} conversion(s)`,
            data: {
                count: result.affectedRows,
                reason: reason || 'No reason provided'
            }
        });
    } catch (error) {
        console.error('Reject conversion error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error rejecting conversions',
            error: error.message 
        });
    }
});

// Get system settings
router.get('/settings', async (req, res) => {
    try {
        const query = 'SELECT * FROM system_settings';
        const [rows] = await db.query(query);
        
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.value;
        });
        
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching settings',
            error: error.message 
        });
    }
});

// Update conversion rate
router.put('/settings/conversion-rate', async (req, res) => {
    try {
        const { rate } = req.body;
        
        if (!rate || isNaN(rate) || rate < 1) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid conversion rate' 
            });
        }
        
        const query = `
            INSERT INTO system_settings (setting_key, value, updated_at)
            VALUES ('conversion_rate', ?, NOW())
            ON DUPLICATE KEY UPDATE 
                value = VALUES(value),
                updated_at = NOW()
        `;
        
        await db.query(query, [rate]);
        
        res.json({
            success: true,
            message: 'Conversion rate updated',
            data: { conversionRate: rate }
        });
    } catch (error) {
        console.error('Update conversion rate error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating conversion rate',
            error: error.message 
        });
    }
});

module.exports = router;