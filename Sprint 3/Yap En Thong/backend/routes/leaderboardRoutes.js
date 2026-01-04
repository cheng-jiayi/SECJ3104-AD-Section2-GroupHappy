const express = require('express');
const router = express.Router();
const db = require('../database');

// Get weekly leaderboard
router.get('/weekly', async (req, res) => {
    try {
        const query = `
            SELECT 
                wl.student_name as name,
                wl.studentID,
                wl.faculty,
                wl.weekly_points as weeklyPoints,
                wl.total_points as totalPoints,
                wl.total_merits as totalMerits,
                wl.weekly_rank as rank,
                CASE 
                    WHEN wl.studentID = 'A23EN0001' THEN 1 
                    ELSE 0 
                END as isCurrentUser
            FROM weekly_leaderboard wl
            ORDER BY wl.weekly_rank
            LIMIT 15
        `;
        
        const [rows] = await db.query(query);
        
        res.json({
            success: true,
            data: rows,
            resetTime: calculateResetTime(),
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Leaderboard Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching leaderboard',
            error: error.message 
        });
    }
});

// Get hall of fame
router.get('/hall-of-fame', async (req, res) => {
    try {
        const query = `
            SELECT 
                u.fullName as name,
                s.studentID,
                s.faculty,
                s.totalPoints as totalPoints,
                s.totalMerits as totalMerits,
                RANK() OVER (ORDER BY s.totalPoints DESC) as rank
            FROM Student s
            JOIN User u ON s.userID = u.userID
            WHERE u.role = 'student'
            ORDER BY s.totalPoints DESC
            LIMIT 3
        `;
        
        const [rows] = await db.query(query);
        
        // Add weekly points for top 3
        for (let student of rows) {
            const weeklyQuery = `
                SELECT IFNULL(SUM(rt.points_earned), 0) as weeklyPoints
                FROM recycling_transactions rt
                JOIN User u ON rt.user_id = u.userID
                WHERE u.utmID = (
                    SELECT utmID FROM User WHERE userID = (
                        SELECT userID FROM Student WHERE studentID = ?
                    )
                ) AND rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            `;
            
            const [weeklyResult] = await db.query(weeklyQuery, [student.studentID]);
            student.weeklyPoints = weeklyResult[0]?.weeklyPoints || 0;
        }
        
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching hall of fame',
            error: error.message 
        });
    }
});

// Get current user stats
router.get('/current-user/:utmID', async (req, res) => {
    try {
        const { utmID } = req.params;
        
        const query = `
            SELECT 
                u.fullName,
                u.utmID,
                s.totalPoints,
                s.totalMerits,
                IFNULL(SUM(
                    CASE WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
                    THEN rt.points_earned ELSE 0 END
                ), 0) as weeklyPoints
            FROM User u
            JOIN Student s ON u.userID = s.userID
            LEFT JOIN recycling_transactions rt ON u.userID = rt.user_id
            WHERE u.utmID = ?
            GROUP BY u.userID, u.fullName, u.utmID, s.totalPoints, s.totalMerits
        `;
        
        const [rows] = await db.query(query, [utmID]);
        
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Get user's rank
        const rankQuery = `
            SELECT rank FROM (
                SELECT 
                    u.utmID,
                    RANK() OVER (ORDER BY IFNULL(SUM(
                        CASE WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
                        THEN rt.points_earned ELSE 0 END
                    ), 0) DESC) as rank
                FROM User u
                JOIN Student s ON u.userID = s.userID
                LEFT JOIN recycling_transactions rt ON u.userID = rt.user_id
                WHERE u.role = 'student'
                GROUP BY u.userID, u.utmID
            ) as ranked_users
            WHERE utmID = ?
        `;
        
        const [rankRows] = await db.query(rankQuery, [utmID]);
        
        const userData = {
            ...rows[0],
            rank: rankRows[0]?.rank || 0
        };
        
        res.json({ success: true, data: userData });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching user data',
            error: error.message 
        });
    }
});

function calculateResetTime() {
    // Reset every Sunday at 23:59
    const now = new Date();
    const nextReset = new Date(now);
    
    // Find next Sunday
    nextReset.setDate(now.getDate() + (7 - now.getDay()));
    nextReset.setHours(23, 59, 0, 0);
    
    const diffMs = nextReset - now;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return {
        days,
        hours,
        minutes,
        seconds,
        timestamp: nextReset.toISOString(),
        display: `${days} days ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    };
}

module.exports = router;