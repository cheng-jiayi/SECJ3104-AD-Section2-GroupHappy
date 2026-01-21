const express = require('express');
const router = express.Router();

router.get('/weekly', async (req, res) => {
  try {
    console.log('📊 Fetching weekly leaderboard...');
    
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    let weeklyData = [];
    let viewExists = true;
    
    try {
      const testQuery = `SELECT 1 FROM weekly_leaderboard LIMIT 1`;
      await db.query(testQuery);
      
      const query = `
        SELECT 
          wl.name,
          wl.studentID,
          wl.faculty,
          wl.weeklyPoints,
          wl.totalPoints,
          wl.totalMerits,
          wl.rank,
          wl.weeklyTransactions,
          wl.weeklyWeight,
          CASE 
            WHEN wl.studentID = 'A23CS0001' THEN 1
            ELSE 0
          END as isCurrentUser
        FROM weekly_leaderboard wl
        ORDER BY wl.rank
        LIMIT 15
      `;
      
      const [rows] = await db.query(query);
      weeklyData = rows;
      console.log(`📊 Found ${rows.length} leaderboard records from view`);
      
    } catch (viewError) {
      console.log('⚠️ Weekly leaderboard view not accessible, using fallback query:', viewError.message);
      viewExists = false;
      
      const fallbackQuery = `
        SELECT 
          u.fullName as name,
          s.studentID,
          s.faculty,
          COALESCE(SUM(CASE 
            WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            THEN rt.points_earned ELSE 0 
          END), 0) as weeklyPoints,
          s.totalPoints as totalPoints,
          s.totalMerits as totalMerits,
          ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(CASE 
            WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            THEN rt.points_earned ELSE 0 
          END), 0) DESC) as \`rank\`,
          COALESCE(COUNT(CASE 
            WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            THEN 1 END), 0) as weeklyTransactions,
          COALESCE(SUM(CASE 
            WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            THEN rt.quantity ELSE 0 
          END), 0) as weeklyWeight,
          CASE 
            WHEN s.studentID = 'A23CS0001' THEN 1
            ELSE 0
          END as isCurrentUser
        FROM Student s
        JOIN User u ON s.userID = u.userID
        LEFT JOIN recycling_transactions rt ON s.userID = rt.userID
        WHERE rt.status = 'finalized' OR rt.status IS NULL
        GROUP BY s.studentID, u.fullName, s.faculty, s.totalPoints, s.totalMerits
        ORDER BY weeklyPoints DESC
        LIMIT 15
      `;
      
      const [rows] = await db.query(fallbackQuery);
      weeklyData = rows;
      console.log(`📊 Found ${rows.length} leaderboard records from fallback query`);
    }
    
    const formattedRows = weeklyData.map(row => ({
      ...row,
      isCurrentUser: row.studentID === 'A23CS0001',
      weeklyPoints: parseInt(row.weeklyPoints) || 0,
      totalPoints: parseInt(row.totalPoints) || 0,
      totalMerits: parseFloat(row.totalMerits) || 0,
      weeklyTransactions: parseInt(row.weeklyTransactions) || 0,
      weeklyWeight: parseFloat(row.weeklyWeight) || 0
    }));
    
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
    nextSunday.setHours(23, 59, 0, 0);
    
    const diffMs = nextSunday - now;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    res.json({
      success: true,
      data: formattedRows,
      metadata: {
        total: weeklyData.length,
        lastUpdated: new Date().toISOString(),
        usingFallback: !viewExists,
        resetTime: {
          days,
          hours,
          minutes,
          seconds,
          timestamp: nextSunday.toISOString(),
          display: `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }
      }
    });
  } catch (error) {
    console.error('❌ Leaderboard Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching leaderboard',
      error: error.message
    });
  }
});

router.get('/hall-of-fame', async (req, res) => {
  try {
    console.log('🏆 Fetching hall of fame...');
    
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    let hallOfFameData = [];
    let viewExists = true;
    
    try {
      const testQuery = `SELECT 1 FROM hall_of_fame LIMIT 1`;
      await db.query(testQuery);
      
      const query = `
        SELECT 
          hf.name,
          hf.studentID,
          hf.faculty,
          hf.totalPoints,
          hf.totalMerits,
          hf.weeklyPoints,
          hf.rank,
          hf.yearOfStudy,
          hf.totalTransactions,
          hf.totalWeight
        FROM hall_of_fame hf
        WHERE hf.rank <= 3
        ORDER BY hf.rank
      `;
      
      const [rows] = await db.query(query);
      hallOfFameData = rows;
      console.log(`🏆 Found ${rows.length} hall of fame records from view`);
      
    } catch (viewError) {
      console.log('⚠️ Hall of fame view not accessible, using fallback query:', viewError.message);
      viewExists = false;
      
      const fallbackQuery = `
        SELECT 
          u.fullName as name,
          s.studentID,
          s.faculty,
          s.totalPoints as totalPoints,
          s.totalMerits as totalMerits,
          COALESCE(SUM(CASE 
            WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            THEN rt.points_earned ELSE 0 
          END), 0) as weeklyPoints,
          ROW_NUMBER() OVER (ORDER BY s.totalPoints DESC) as \`rank\`,
          s.yearOfStudy,
          COALESCE(COUNT(rt.id), 0) as totalTransactions,
          COALESCE(SUM(rt.quantity), 0) as totalWeight
        FROM Student s
        JOIN User u ON s.userID = u.userID
        LEFT JOIN recycling_transactions rt ON s.userID = rt.userID AND rt.status = 'finalized'
        GROUP BY s.studentID, u.fullName, s.faculty, s.totalPoints, s.totalMerits, s.yearOfStudy
        ORDER BY s.totalPoints DESC
        LIMIT 3
      `;
      
      const [rows] = await db.query(fallbackQuery);
      hallOfFameData = rows;
      console.log(`🏆 Found ${rows.length} hall of fame records from fallback query`);
    }
    
    const formattedRows = hallOfFameData.map(row => ({
      ...row,
      totalPoints: parseInt(row.totalPoints) || 0,
      totalMerits: parseFloat(row.totalMerits) || 0,
      weeklyPoints: parseInt(row.weeklyPoints) || 0,
      totalTransactions: parseInt(row.totalTransactions) || 0,
      totalWeight: parseFloat(row.totalWeight) || 0
    }));
    
    res.json({ 
      success: true, 
      data: formattedRows,
      usingFallback: !viewExists
    });
  } catch (error) {
    console.error('❌ Hall of Fame Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching hall of fame',
      error: error.message
    });
  }
});

router.get('/current-user/:studentID', async (req, res) => {
  try {
    const { studentID } = req.params;
    console.log(`👤 Fetching user data for: ${studentID}`);
    
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    const userQuery = `
      SELECT 
        u.fullName,
        u.utmID,
        s.studentID,
        s.faculty,
        s.yearOfStudy,
        s.totalPoints,
        s.totalMerits,
        s.totalItemsRecycled,
        s.totalWeightRecycled
      FROM User u
      JOIN Student s ON u.userID = s.userID
      WHERE s.studentID = ?
    `;
    
    const [userRows] = await db.query(userQuery, [studentID]);
    
    if (userRows.length === 0) {
      console.log(`❌ User not found: ${studentID}`);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const user = userRows[0];
    
    let weeklyData = {};
    let usingFallback = false;
    
    try {
      const weeklyQuery = `
        SELECT 
          weeklyPoints,
          rank,
          weeklyTransactions,
          weeklyWeight
        FROM weekly_leaderboard 
        WHERE studentID = ?
      `;
      
      const [weeklyResult] = await db.query(weeklyQuery, [studentID]);
      
      if (weeklyResult && weeklyResult.length > 0) {
        weeklyData = weeklyResult[0];
        console.log(`✅ Found weekly data for ${studentID} from view`);
      } else {
        throw new Error('No data found in view');
      }
    } catch (viewError) {
      console.log(`⚠️ Weekly leaderboard view error for ${studentID}, using fallback:`, viewError.message);
      usingFallback = true;
      
      const fallbackQuery = `
        SELECT 
          COALESCE(SUM(CASE 
            WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            THEN rt.points_earned ELSE 0 
          END), 0) as weeklyPoints,
          COALESCE(COUNT(CASE 
            WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            THEN 1 END), 0) as weeklyTransactions,
          COALESCE(SUM(CASE 
            WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            THEN rt.quantity ELSE 0 
          END), 0) as weeklyWeight
        FROM recycling_transactions rt
        JOIN User u ON rt.userID = u.userID
        JOIN Student s ON u.userID = s.userID
        WHERE s.studentID = ? AND rt.status = 'finalized'
      `;
      
      const [fallbackResult] = await db.query(fallbackQuery, [studentID]);
      weeklyData = fallbackResult[0] || {};
      
      const rankQuery = `
        SELECT COUNT(*) + 1 as \`rank\`
        FROM (
          SELECT 
            s.studentID,
            COALESCE(SUM(CASE 
              WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
              THEN rt.points_earned ELSE 0 
            END), 0) as weeklyPoints
          FROM Student s
          JOIN User u ON s.userID = u.userID
          LEFT JOIN recycling_transactions rt ON u.userID = rt.userID AND rt.status = 'finalized'
          GROUP BY s.studentID
        ) as temp
        WHERE weeklyPoints > ?
      `;
      
      const weeklyPoints = weeklyData.weeklyPoints || 0;
      const [rankResult] = await db.query(rankQuery, [weeklyPoints]);
      weeklyData.rank = rankResult[0]?.rank || 0;
      
      console.log(`✅ Calculated weekly data for ${studentID} manually`);
    }
    
    const userData = {
      ...user,
      weeklyPoints: parseInt(weeklyData.weeklyPoints) || 0,
      rank: parseInt(weeklyData.rank) || 0,
      weeklyTransactions: parseInt(weeklyData.weeklyTransactions) || 0,
      weeklyWeight: parseFloat(weeklyData.weeklyWeight) || 0,
      totalPoints: parseInt(user.totalPoints) || 0,
      totalMerits: parseFloat(user.totalMerits) || 0,
      totalItemsRecycled: parseInt(user.totalItemsRecycled) || 0,
      totalWeightRecycled: parseFloat(user.totalWeightRecycled) || 0
    };
    
    console.log(`✅ User data found: ${userData.fullName}`);
    
    res.json({ 
      success: true, 
      data: userData,
      usingFallback: usingFallback
    });
  } catch (error) {
    console.error('❌ Current User Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching user data',
      error: error.message
    });
  }
});

router.get('/faculty', async (req, res) => {
  try {
    console.log('🎓 Fetching faculty leaderboard...');
    
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    let facultyData = [];
    let usingFallback = false;
    
    try {
      const query = `CALL GetFacultyLeaderboard('weekly')`;
      const [rows] = await db.query(query);
      facultyData = rows[0] || [];
      console.log(`🎓 Found ${facultyData.length} faculty records from stored procedure`);
    } catch (procError) {
      console.log('⚠️ Stored procedure error, using fallback query:', procError.message);
      usingFallback = true;
      
      const fallbackQuery = `
        SELECT 
          s.faculty,
          COUNT(DISTINCT s.studentID) as studentCount,
          COALESCE(SUM(CASE 
            WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            THEN rt.points_earned ELSE 0 
          END), 0) as weeklyPoints,
          COALESCE(SUM(s.totalPoints), 0) as totalPoints,
          COALESCE(SUM(s.totalMerits), 0) as totalMerits,
          COALESCE(COUNT(CASE 
            WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            THEN 1 END), 0) as weeklyTransactions,
          COALESCE(SUM(CASE 
            WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            THEN rt.quantity ELSE 0 
          END), 0) as weeklyWeight,
          ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(CASE 
            WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            THEN rt.points_earned ELSE 0 
          END), 0) DESC) as \`rank\`
        FROM Student s
        JOIN User u ON s.userID = u.userID
        LEFT JOIN recycling_transactions rt ON u.userID = rt.userID AND rt.status = 'finalized'
        WHERE s.faculty IS NOT NULL AND s.faculty != ''
        GROUP BY s.faculty
        ORDER BY weeklyPoints DESC
      `;
      
      const [rows] = await db.query(fallbackQuery);
      facultyData = rows;
      console.log(`🎓 Found ${rows.length} faculty records from fallback query`);
    }
    
    const formattedData = facultyData.map(row => ({
      ...row,
      weeklyPoints: parseInt(row.weeklyPoints) || 0,
      totalPoints: parseInt(row.totalPoints) || 0,
      totalMerits: parseFloat(row.totalMerits) || 0,
      weeklyTransactions: parseInt(row.weeklyTransactions) || 0,
      weeklyWeight: parseFloat(row.weeklyWeight) || 0,
      studentCount: parseInt(row.studentCount) || 0
    }));
    
    res.json({ 
      success: true, 
      data: formattedData,
      usingFallback: usingFallback
    });
  } catch (error) {
    console.error('❌ Faculty Leaderboard Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching faculty leaderboard',
      error: error.message
    });
  }
});

router.get('/dashboard/:studentID', async (req, res) => {
  try {
    const { studentID } = req.params;
    console.log(`📊 Fetching dashboard for: ${studentID}`);
    
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    let dashboardData = {};
    let usingFallback = false;
    
    try {

      const query = `SELECT * FROM student_dashboard WHERE studentID = ?`;
      const [rows] = await db.query(query, [studentID]);
      
      if (rows.length > 0) {
        dashboardData = rows[0];
        console.log(`📊 Found dashboard data for ${studentID} from view`);
      } else {
        throw new Error('No dashboard data found');
      }
    } catch (viewError) {
      console.log(`⚠️ Student dashboard view error for ${studentID}, using fallback:`, viewError.message);
      usingFallback = true;
      
      const userQuery = `
        SELECT 
          u.fullName,
          u.utmID,
          s.studentID,
          s.faculty,
          s.yearOfStudy,
          s.totalPoints,
          s.totalMerits,
          s.totalItemsRecycled,
          s.totalWeightRecycled
        FROM User u
        JOIN Student s ON u.userID = s.userID
        WHERE s.studentID = ?
      `;
      
      const [userRows] = await db.query(userQuery, [studentID]);
      
      if (userRows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Student not found' 
        });
      }
      
      const user = userRows[0];
      
      const weeklyQuery = `
        SELECT 
          COALESCE(SUM(CASE 
            WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            THEN rt.points_earned ELSE 0 
          END), 0) as weeklyPoints,
          COALESCE(COUNT(CASE 
            WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            THEN 1 END), 0) as weeklyTransactions,
          COALESCE(SUM(CASE 
            WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            THEN rt.quantity ELSE 0 
          END), 0) as weeklyWeight
        FROM recycling_transactions rt
        JOIN User u ON rt.userID = u.userID
        JOIN Student s ON u.userID = s.userID
        WHERE s.studentID = ? AND rt.status = 'finalized'
      `;
      
      const [weeklyResult] = await db.query(weeklyQuery, [studentID]);
      const weeklyStats = weeklyResult[0] || {};
      
      const rankQuery = `
        SELECT COUNT(*) + 1 as \`rank\`
        FROM (
          SELECT 
            s.studentID,
            COALESCE(SUM(CASE 
              WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
              THEN rt.points_earned ELSE 0 
            END), 0) as weeklyPoints
          FROM Student s
          JOIN User u ON s.userID = u.userID
          LEFT JOIN recycling_transactions rt ON u.userID = rt.userID AND rt.status = 'finalized'
          GROUP BY s.studentID
        ) as temp
        WHERE weeklyPoints > ?
      `;
      
      const weeklyPoints = weeklyStats.weeklyPoints || 0;
      const [rankResult] = await db.query(rankQuery, [weeklyPoints]);
      
      const facultyRankQuery = `
        SELECT 
          COUNT(*) + 1 as \`facultyRank\`
        FROM (
          SELECT 
            s.faculty,
            COALESCE(SUM(CASE 
              WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
              THEN rt.points_earned ELSE 0 
            END), 0) as facultyPoints
          FROM Student s
          JOIN User u ON s.userID = u.userID
          LEFT JOIN recycling_transactions rt ON u.userID = rt.userID AND rt.status = 'finalized'
          WHERE s.faculty IS NOT NULL AND s.faculty != ''
          GROUP BY s.faculty
        ) as temp
        WHERE facultyPoints > ?
      `;
      
      const facultyPointsQuery = `
        SELECT COALESCE(SUM(CASE 
          WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
          THEN rt.points_earned ELSE 0 
        END), 0) as facultyPoints
        FROM Student s
        JOIN User u ON s.userID = u.userID
        LEFT JOIN recycling_transactions rt ON u.userID = rt.userID AND rt.status = 'finalized'
        WHERE s.studentID = ?
      `;
      
      const [facultyPointsResult] = await db.query(facultyPointsQuery, [studentID]);
      const facultyPoints = facultyPointsResult[0]?.facultyPoints || 0;
      const [facultyRankResult] = await db.query(facultyRankQuery, [facultyPoints]);
      
      dashboardData = {
        studentID: user.studentID,
        fullName: user.fullName,
        faculty: user.faculty,
        yearOfStudy: user.yearOfStudy,
        weeklyPoints: parseInt(weeklyStats.weeklyPoints) || 0,
        totalPoints: parseInt(user.totalPoints) || 0,
        totalMerits: parseFloat(user.totalMerits) || 0,
        rank: rankResult[0]?.rank || 0,
        facultyRank: facultyRankResult[0]?.facultyRank || 0,
        weeklyTransactions: parseInt(weeklyStats.weeklyTransactions) || 0,
        weeklyWeight: parseFloat(weeklyStats.weeklyWeight) || 0,
        totalItemsRecycled: parseInt(user.totalItemsRecycled) || 0,
        totalWeightRecycled: parseFloat(user.totalWeightRecycled) || 0
      };
      
      console.log(`📊 Built dashboard data for ${studentID} manually`);
    }
    
    res.json({ 
      success: true, 
      data: dashboardData,
      usingFallback: usingFallback
    });
  } catch (error) {
    console.error('❌ Dashboard Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard',
      error: error.message
    });
  }
});

router.get('/health', async (req, res) => {
  try {
    console.log('🩺 Checking leaderboard health...');
    
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    await db.query('SELECT 1 as test');
    
    const views = ['weekly_leaderboard', 'hall_of_fame', 'student_dashboard'];
    const viewStatus = {};
    
    for (const view of views) {
      try {
        await db.query(`SELECT 1 FROM ${view} LIMIT 1`);
        viewStatus[view] = 'available';
      } catch (error) {
        viewStatus[view] = 'unavailable';
      }
    }
    
    res.json({
      success: true,
      service: 'Leaderboard API',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      views: viewStatus,
      endpoints: [
        'GET /weekly',
        'GET /hall-of-fame',
        'GET /current-user/:studentID',
        'GET /faculty',
        'GET /dashboard/:studentID',
        'GET /health'
      ]
    });
    
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      success: false,
      service: 'Leaderboard API',
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;