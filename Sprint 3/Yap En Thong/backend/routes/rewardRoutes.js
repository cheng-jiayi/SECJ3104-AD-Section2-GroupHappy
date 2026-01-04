const express = require('express');
const router = express.Router();
const db = require('../database');

// Get user reward points and events
router.get('/user/:utmID', async (req, res) => {
    try {
        const { utmID } = req.params;
        
        // Get user basic info and points
        const userQuery = `
            SELECT 
                u.fullName,
                u.utmID,
                s.studentID,
                s.totalPoints as totalRewardPoints,
                s.totalMerits as utmMeritPoints,
                s.faculty
            FROM User u
            JOIN Student s ON u.userID = s.userID
            WHERE u.utmID = ?
        `;
        
        const [userRows] = await db.query(userQuery, [utmID]);
        
        if (userRows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        const user = userRows[0];
        
        // Get ongoing events
        const ongoingEventsQuery = `
            SELECT 
                e.eventID,
                e.eventTitle as name,
                e.rewardPoints as target,
                COALESCE(p.rewardPointsEarned, 0) as earned,
                e.status
            FROM Event e
            LEFT JOIN Participation p ON e.eventID = p.eventID 
                AND p.studentID = ?
                AND p.participationStatus IN ('Registered', 'Attended')
            WHERE e.status = 'Ongoing'
            ORDER BY e.eventStartDate DESC
        `;
        
        const [ongoingEvents] = await db.query(ongoingEventsQuery, [user.studentID]);
        
        // Calculate progress
        const ongoingWithProgress = ongoingEvents.map(event => ({
            id: event.eventID,
            name: event.name,
            target: event.target,
            earned: event.earned,
            progress: event.target > 0 ? event.earned / event.target : 0
        }));
        
        // Get completed events
        const completedEventsQuery = `
            SELECT 
                e.eventTitle as name,
                p.rewardPointsEarned as points,
                DATE(p.registrationDate) as date
            FROM Participation p
            JOIN Event e ON p.eventID = e.eventID
            WHERE p.studentID = ?
                AND p.participationStatus = 'Completed'
            ORDER BY p.registrationDate DESC
            LIMIT 5
        `;
        
        const [completedEvents] = await db.query(completedEventsQuery, [user.studentID]);
        
        // Get conversion history
        const conversionHistoryQuery = `
            SELECT 
                ch.id,
                ch.reward_points as rewardPoints,
                ch.merit_points as meritPoints,
                ch.status,
                DATE_FORMAT(ch.request_date, '%Y-%m-%d') as date,
                ch.rejection_reason as reason
            FROM conversion_history ch
            WHERE ch.student_id = ?
                AND ch.status IN ('Approved', 'Rejected')
            ORDER BY ch.request_date DESC
        `;
        
        const [conversionHistory] = await db.query(conversionHistoryQuery, [user.studentID]);
        
        // Get pending conversions
        const pendingQuery = `
            SELECT 
                ch.id,
                ch.reward_points as rewardPoints,
                ch.merit_points as meritPoints,
                ch.status,
                DATE_FORMAT(ch.request_date, '%Y-%m-%d') as submittedDate
            FROM conversion_history ch
            WHERE ch.student_id = ?
                AND ch.status = 'Pending'
            ORDER BY ch.request_date DESC
        `;
        
        const [pendingConversions] = await db.query(pendingQuery, [user.studentID]);
        
        // Get system settings
        const settingsQuery = 'SELECT value FROM system_settings WHERE setting_key = "conversion_rate"';
        const [settingsRows] = await db.query(settingsQuery);
        const conversionRate = settingsRows[0]?.value || 100;
        
        res.json({
            success: true,
            data: {
                userPoints: {
                    totalRewardPoints: user.totalRewardPoints,
                    utmMeritPoints: user.utmMeritPoints
                },
                ongoingEvents: ongoingWithProgress,
                completedEvents,
                conversionHistory,
                pendingConversions,
                conversionRate: parseInt(conversionRate),
                minConversion: 100
            }
        });
    } catch (error) {
        console.error('Rewards API Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching reward data',
            error: error.message 
        });
    }
});

// Submit conversion request
router.post('/convert', async (req, res) => {
    try {
        const { utmID, rewardPoints } = req.body;
        
        if (!utmID || !rewardPoints) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        // Get current conversion rate from system settings
        const rateQuery = 'SELECT value FROM system_settings WHERE setting_key = "conversion_rate"';
        const [rateRows] = await db.query(rateQuery);
        const conversionRate = rateRows[0]?.value || 100;
        
        // Calculate merit points
        const meritPoints = rewardPoints / conversionRate;
        
        // Check if user has enough points
        const userQuery = `
            SELECT totalPoints 
            FROM Student s
            JOIN User u ON s.userID = u.userID
            WHERE u.utmID = ?
        `;
        
        const [userRows] = await db.query(userQuery, [utmID]);
        
        if (userRows.length === 0 || userRows[0].totalPoints < rewardPoints) {
            return res.status(400).json({ 
                success: false, 
                message: 'Insufficient reward points' 
            });
        }
        
        // Create conversion request
        const insertQuery = `
            INSERT INTO conversion_history (
                student_id, 
                reward_points, 
                merit_points, 
                status, 
                request_date,
                conversion_rate
            ) VALUES (
                (SELECT studentID FROM Student WHERE userID = (SELECT userID FROM User WHERE utmID = ?)),
                ?, ?, 'Pending', NOW(), ?
            )
        `;
        
        await db.query(insertQuery, [utmID, rewardPoints, meritPoints, conversionRate]);
        
        res.json({
            success: true,
            message: 'Conversion request submitted',
            data: {
                rewardPoints,
                meritPoints,
                conversionRate
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error submitting conversion',
            error: error.message 
        });
    }
});

module.exports = router;