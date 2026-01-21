const express = require('express');
const router = express.Router();

const connectedClients = new Set();

const broadcastToClients = (event, data) => {
    console.log(`📢 Broadcasting ${event} to clients`);
    connectedClients.forEach(client => {
        try {
            if (client.send) {
                client.send(JSON.stringify({ event, data, timestamp: new Date().toISOString() }));
            }
        } catch (error) {
            console.error('Error broadcasting to client:', error);
        }
    });
};

router.get('/updates', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const clientId = Date.now();
    const client = {
        id: clientId,
        send: (data) => {
            res.write(`data: ${data}\n\n`);
        }
    };
    
    connectedClients.add(client);
    
    console.log(`📡 New client connected: ${clientId}`);
    
    client.send(JSON.stringify({ 
        event: 'connected', 
        message: 'Connected to conversion updates',
        clientId 
    }));
    
    req.on('close', () => {
        console.log(`📡 Client disconnected: ${clientId}`);
        connectedClients.delete(client);
        res.end();
    });
});

router.get('/pending', async (req, res) => {
  try {
    console.log('📋 Fetching pending conversions...');
    
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    const query = `
      SELECT 
        ch.id,
        u.fullName as studentName,
        ch.student_id as studentId,
        ch.reward_points as rewardPoints,
        ch.merit_points as meritPoints,
        ch.status,
        DATE_FORMAT(ch.request_date, '%Y-%m-%d %H:%i') as requestDate,
        s.faculty,
        s.yearOfStudy,
        ch.conversion_rate as conversionRate,
        TIMESTAMPDIFF(HOUR, ch.request_date, NOW()) as hoursPending,
        s.totalPoints as studentTotalPoints,
        s.totalMerits as studentTotalMerits
      FROM conversion_history ch
      JOIN Student s ON ch.student_id = s.studentID
      JOIN User u ON s.userID = u.userID
      WHERE ch.status = 'Pending'
      ORDER BY ch.request_date ASC
    `;
    
    const [rows] = await db.query(query);
    
    console.log(`📋 Found ${rows.length} pending conversions`);
    
    const formattedRows = rows.map(row => ({
      ...row,
      selected: false,
      rewardPoints: parseInt(row.rewardPoints) || 0,
      meritPoints: parseFloat(row.meritPoints) || 0,
      conversionRate: parseInt(row.conversionRate) || 100,
      hoursPending: parseInt(row.hoursPending) || 0,
      studentTotalPoints: parseInt(row.studentTotalPoints) || 0,
      studentTotalMerits: parseFloat(row.studentTotalMerits) || 0
    }));
    
    res.json({
      success: true,
      data: formattedRows,
      total: rows.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Pending conversions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching pending conversions',
      error: error.message
    });
  }
});

router.get('/history', async (req, res) => {
  try {
    console.log('📜 Fetching conversion history...');
    
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    const query = `
      SELECT 
        ch.id,
        u.fullName as studentName,
        ch.student_id as studentId,
        ch.reward_points as rewardPoints,
        ch.merit_points as meritPoints,
        ch.status,
        DATE_FORMAT(ch.request_date, '%Y-%m-%d') as date,
        DATE_FORMAT(ch.processed_date, '%Y-%m-%d %H:%i') as processedDate,
        ch.rejection_reason as reason,
        COALESCE(u2.fullName, 'System') as adminName,
        s.faculty,
        TIMESTAMPDIFF(DAY, ch.request_date, ch.processed_date) as daysToProcess,
        ch.conversion_rate as conversionRate
      FROM conversion_history ch
      JOIN Student s ON ch.student_id = s.studentID
      JOIN User u ON s.userID = u.userID
      LEFT JOIN Admin a ON ch.processed_by = a.adminID
      LEFT JOIN User u2 ON a.userID = u2.userID
      WHERE ch.status IN ('Approved', 'Rejected')
      ORDER BY ch.processed_date DESC
      LIMIT 50
    `;
    
    const [rows] = await db.query(query);
    
    console.log(`📜 Found ${rows.length} conversion history records`);
    
    const formattedRows = rows.map(row => ({
      ...row,
      rewardPoints: parseInt(row.rewardPoints) || 0,
      meritPoints: parseFloat(row.meritPoints) || 0,
      daysToProcess: parseInt(row.daysToProcess) || 0,
      conversionRate: parseInt(row.conversionRate) || 100
    }));
    
    res.json({
      success: true,
      data: formattedRows,
      total: rows.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Conversion history error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching conversion history',
      error: error.message
    });
  }
});

router.get('/settings', async (req, res) => {
  try {
    console.log('⚙️ Fetching system settings...');
    
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    const query = 'SELECT * FROM system_settings ORDER BY setting_key';
    const [rows] = await db.query(query);
    
    console.log(`⚙️ Found ${rows.length} system settings`);
    
    const settings = {};
    rows.forEach(row => {
      settings[row.setting_key] = {
        value: row.value,
        description: row.description,
        updatedAt: row.updated_at
      };
    });
    
    if (!settings.conversion_rate) {
      settings.conversion_rate = { value: '100', description: 'Reward Points needed for 1 Merit Point' };
    }
    if (!settings.min_conversion) {
      settings.min_conversion = { value: '100', description: 'Minimum Reward Points for conversion' };
    }
    
    res.json({
      success: true,
      data: settings,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Get settings error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching settings',
      error: error.message
    });
  }
});

router.post('/approve', async (req, res) => {
  let connection;
  
  try {
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    const { conversionIds, adminId = 'ADM001' } = req.body;
    
    console.log('✅ Approving conversions:', conversionIds);
    
    if (!conversionIds || !Array.isArray(conversionIds) || conversionIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No conversion IDs provided' 
      });
    }
    
    const idsString = conversionIds.join(',');
    
    const [conversions] = await connection.query(
      `SELECT 
        ch.id,
        ch.student_id,
        ch.reward_points,
        ch.merit_points
      FROM conversion_history ch
      WHERE ch.id IN (${idsString})
        AND ch.status = 'Pending'`
    );
    
    if (conversions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'No pending conversions found with the provided IDs' 
      });
    }
    
    console.log(`✅ Found ${conversions.length} conversions to approve`);
    
    let approvedCount = 0;
    let totalRewardPoints = 0;
    let totalMeritPoints = 0;
    const processedStudents = new Set();
    
    for (const conversion of conversions) {
      console.log(`🔄 Processing conversion ${conversion.id}: ${conversion.reward_points} RP → ${conversion.merit_points} MP for student ${conversion.student_id}`);
      
      await connection.execute(
        `UPDATE conversion_history 
         SET status = "Approved", 
             processed_date = NOW(),
             processed_by = ?
         WHERE id = ?`,
        [adminId, conversion.id]
      );
      
      const [updateResult] = await connection.execute(
        `UPDATE Student 
         SET totalMerits = totalMerits + ?
         WHERE studentID = ?`,
        [conversion.merit_points, conversion.student_id]
      );
      
      console.log(`✅ Added ${conversion.merit_points} MP to student ${conversion.student_id}. Rows affected: ${updateResult.affectedRows}`);
      
      await connection.execute(
        `INSERT INTO merit_transactions (
          student_id,
          transaction_type,
          reward_points,
          merit_points,
          transaction_date
        ) VALUES (?, 'Conversion Approval', ?, ?, NOW())`,
        [conversion.student_id, conversion.reward_points, conversion.merit_points]
      );
      
      const [studentCheck] = await connection.execute(
        `SELECT totalPoints, totalMerits FROM Student WHERE studentID = ?`,
        [conversion.student_id]
      );
      
      if (studentCheck.length > 0) {
        console.log(`📊 Student ${conversion.student_id} now has: ${studentCheck[0].totalMerits} MP, ${studentCheck[0].totalPoints} RP`);
      }
      
      approvedCount++;
      totalRewardPoints += conversion.reward_points;
      totalMeritPoints += parseFloat(conversion.merit_points);
      processedStudents.add(conversion.student_id);
    }
    
    await connection.commit();
    
    console.log(`✅ Approved ${approvedCount} conversion(s). Total: ${totalRewardPoints} RP → ${totalMeritPoints.toFixed(2)} MP`);
    
    broadcastToClients('conversion_approved', {
      count: approvedCount,
      totalRewardPoints,
      totalMeritPoints,
      studentIds: Array.from(processedStudents),
      conversionIds: conversions.map(c => c.id),
      timestamp: new Date().toISOString(),
      message: `Approved ${approvedCount} conversion(s)`
    });
    
    res.json({
      success: true,
      message: `Successfully approved ${approvedCount} conversion(s)`,
      data: {
        count: approvedCount,
        totalRewardPoints: totalRewardPoints,
        totalMeritPoints: parseFloat(totalMeritPoints.toFixed(2)),
        affectedStudents: processedStudents.size,
        conversionIds: conversions.map(c => c.id),
        studentIds: Array.from(processedStudents),
        timestamp: new Date().toISOString(),
        broadcast: true
      }
    });
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Approve conversion error:', error);
    
    res.status(500).json({ 
      success: false, 
      message: 'Error approving conversions',
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.post('/approve-simple', async (req, res) => {
  let connection;
  
  try {
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    const { conversionIds, adminId = 'ADM001' } = req.body;
    
    console.log('✅ Simple approving conversions:', conversionIds);
    
    if (!conversionIds || !Array.isArray(conversionIds) || conversionIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No conversion IDs provided' 
      });
    }
    
    const idsString = conversionIds.join(',');
    
    const [conversions] = await connection.query(
      `SELECT student_id FROM conversion_history 
       WHERE id IN (${idsString}) AND status = 'Pending'`
    );
    
    const studentIds = conversions.map(c => c.student_id);
    
    const [result] = await connection.execute(
      `UPDATE conversion_history 
       SET status = "Approved", 
           processed_date = NOW(),
           processed_by = ?
       WHERE id IN (${idsString}) AND status = 'Pending'`,
      [adminId]
    );
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'No conversions updated' 
      });
    }
    
    for (const studentId of studentIds) {
      const [studentConversions] = await connection.execute(
        `SELECT SUM(merit_points) as total_merits 
         FROM conversion_history 
         WHERE student_id = ? 
           AND id IN (${idsString}) 
           AND status = 'Approved'`,
        [studentId]
      );
      
      const totalMerits = studentConversions[0]?.total_merits || 0;
      if (totalMerits > 0) {
        await connection.execute(
          `UPDATE Student 
           SET totalMerits = totalMerits + ?
           WHERE studentID = ?`,
          [totalMerits, studentId]
        );
      }
    }
    
    await connection.commit();
    
    console.log(`✅ Simple approved ${result.affectedRows} conversion(s)`);
    
    broadcastToClients('conversion_approved_simple', {
      count: result.affectedRows,
      studentIds,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: `Successfully approved ${result.affectedRows} conversion(s)`,
      data: {
        count: result.affectedRows,
        studentIds,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Simple approve error:', error);
    
    res.status(500).json({ 
      success: false, 
      message: 'Error approving conversions',
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.post('/reject', async (req, res) => {
  let connection;
  
  try {
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    const { conversionIds, reason, adminId = 'ADM001' } = req.body;
    
    console.log('❌ Rejecting conversions:', { conversionIds, reason });
    
    if (!conversionIds || !Array.isArray(conversionIds) || conversionIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No conversion IDs provided' 
      });
    }
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Rejection reason is required' 
      });
    }
    
    const idsString = conversionIds.join(',');
    
    const [conversions] = await connection.query(
      `SELECT 
        ch.id,
        ch.student_id,
        ch.reward_points
      FROM conversion_history ch
      WHERE ch.id IN (${idsString})
        AND ch.status = 'Pending'`
    );
    
    if (conversions.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        message: 'No pending conversions found with the provided IDs' 
      });
    }
    
    let returnedPoints = 0;
    const processedStudents = new Set();
    
    for (const conversion of conversions) {
      console.log(`🔄 Returning ${conversion.reward_points} RP to student ${conversion.student_id} for rejected conversion ${conversion.id}`);
      
      const [updateResult] = await connection.execute(
        `UPDATE Student 
         SET totalPoints = totalPoints + ?
         WHERE studentID = ?`,
        [conversion.reward_points, conversion.student_id]
      );
      
      console.log(`✅ Returned ${conversion.reward_points} RP to student ${conversion.student_id}. Rows affected: ${updateResult.affectedRows}`);
      
      const [studentCheck] = await connection.execute(
        `SELECT totalPoints, totalMerits FROM Student WHERE studentID = ?`,
        [conversion.student_id]
      );
      
      if (studentCheck.length > 0) {
        console.log(`📊 Student ${conversion.student_id} now has: ${studentCheck[0].totalMerits} MP, ${studentCheck[0].totalPoints} RP`);
      }
      
      await connection.execute(
        `UPDATE conversion_history 
         SET 
           status = 'Rejected',
           processed_date = NOW(),
           processed_by = ?,
           rejection_reason = ?
         WHERE id = ?`,
        [adminId, reason, conversion.id]
      );
      
      returnedPoints += conversion.reward_points;
      processedStudents.add(conversion.student_id);
    }
    
    await connection.commit();
    
    console.log(`❌ Rejected ${conversions.length} conversion(s), returned ${returnedPoints} points`);
    
    broadcastToClients('conversion_rejected', {
      count: conversions.length,
      returnedPoints,
      studentIds: Array.from(processedStudents),
      reason: reason,
      timestamp: new Date().toISOString(),
      message: `Rejected ${conversions.length} conversion(s)`
    });
    
    res.json({
      success: true,
      message: `Successfully rejected ${conversions.length} conversion(s)`,
      data: {
        count: conversions.length,
        returnedPoints: returnedPoints,
        affectedStudents: processedStudents.size,
        reason: reason,
        studentIds: Array.from(processedStudents),
        timestamp: new Date().toISOString(),
        broadcast: true
      }
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Reject conversion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error rejecting conversions',
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.put('/settings/conversion-rate', async (req, res) => {
  let connection;
  
  try {
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    const { rate, adminId = 'ADM001' } = req.body;
    
    console.log(`⚙️ Updating conversion rate to: ${rate} by admin ${adminId}`);
    
    if (!rate || isNaN(rate) || rate < 1) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid conversion rate. Must be a number greater than 0.' 
      });
    }
    
    const rateInt = parseInt(rate);
    
    const [currentRate] = await connection.execute(
      'SELECT value FROM system_settings WHERE setting_key = "conversion_rate"'
    );
    
    const oldRate = currentRate[0]?.value || 'unknown';
    
    await connection.execute(
      `UPDATE system_settings 
       SET value = ?, updated_at = NOW()
       WHERE setting_key = 'conversion_rate'`,
      [rateInt]
    );
    
    await connection.execute(
      `UPDATE system_settings 
       SET value = ?, updated_at = NOW()
       WHERE setting_key = 'min_conversion'`,
      [rateInt]
    );
    
    await connection.execute(
      `INSERT INTO conversion_history (
        student_id, 
        reward_points, 
        merit_points, 
        status, 
        request_date, 
        processed_by, 
        rejection_reason,
        conversion_rate
      ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        null, 
        0, 
        0, 
        'Approved', 
        adminId, 
        `System: Conversion rate changed from ${oldRate} to ${rateInt}`,
        rateInt
      ]
    );
    
    await connection.commit();
    
    console.log(`✅ Conversion rate updated from ${oldRate} to ${rateInt}`);
    
    broadcastToClients('conversion_rate_updated', {
      oldRate,
      newRate: rateInt,
      updatedBy: adminId,
      timestamp: new Date().toISOString(),
      message: `Conversion rate changed from ${oldRate} to ${rateInt}`
    });
    
    res.json({
      success: true,
      message: 'Conversion rate updated successfully',
      data: { 
        conversionRate: rateInt,
        minConversion: rateInt,
        oldRate: oldRate,
        updatedAt: new Date().toISOString(),
        updatedBy: adminId,
        broadcast: true
      }
    });
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Update conversion rate error:', error);
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      console.log('⚠️ Foreign key constraint error. Trying alternative approach...');
      
    
      try {
        await connection.beginTransaction();
        
        await connection.execute(
          `UPDATE system_settings 
           SET value = ?, updated_at = NOW()
           WHERE setting_key IN ('conversion_rate', 'min_conversion')`,
          [rateInt]
        );
        
        await connection.commit();
        
        console.log(`✅ Conversion rate updated to ${rateInt} (without logging)`);
        
        res.json({
          success: true,
          message: 'Conversion rate updated successfully',
          data: { 
            conversionRate: rateInt,
            minConversion: rateInt,
            updatedAt: new Date().toISOString(),
            updatedBy: adminId
          }
        });
        
      } catch (retryError) {
        if (connection) {
          await connection.rollback();
        }
        console.error('❌ Retry error:', retryError);
        res.status(500).json({ 
          success: false, 
          message: 'Error updating conversion rate',
          error: retryError.message
        });
      }
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Error updating conversion rate',
        error: error.message
      });
    }
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.get('/stats', async (req, res) => {
  try {
    console.log('📈 Fetching conversion statistics...');
    
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    const [pendingCount] = await db.query(
      'SELECT COUNT(*) as count FROM conversion_history WHERE status = "Pending"'
    );
    
    const [approvedCount] = await db.query(
      'SELECT COUNT(*) as count FROM conversion_history WHERE status = "Approved"'
    );
    
    const [rejectedCount] = await db.query(
      'SELECT COUNT(*) as count FROM conversion_history WHERE status = "Rejected"'
    );
    
    const [totalMerits] = await db.query(
      'SELECT SUM(merit_points) as total FROM conversion_history WHERE status = "Approved"'
    );
    
    const [totalPoints] = await db.query(
      'SELECT SUM(reward_points) as total FROM conversion_history'
    );
    
    const [recentActivity] = await db.query(`
      SELECT 
        DATE(request_date) as date,
        COUNT(*) as conversions,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending
      FROM conversion_history 
      WHERE request_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(request_date)
      ORDER BY date DESC
    `);
    
    res.json({
      success: true,
      data: {
        pending: pendingCount[0].count || 0,
        approved: approvedCount[0].count || 0,
        rejected: rejectedCount[0].count || 0,
        totalMerits: parseFloat(totalMerits[0].total) || 0,
        totalPoints: parseInt(totalPoints[0].total) || 0,
        recentActivity: recentActivity,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

router.get('/test-update-rate', async (req, res) => {
  let connection;
  
  try {
    console.log('🧪 Testing conversion rate update...');
    
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    const testRate = 150;
    const adminId = 'TEST_ADMIN';
    
    const [currentRate] = await connection.execute(
      'SELECT value FROM system_settings WHERE setting_key = "conversion_rate"'
    );
    
    const oldRate = currentRate[0]?.value || 'unknown';
    
    await connection.execute(
      `UPDATE system_settings 
       SET value = ?, updated_at = NOW()
       WHERE setting_key = 'conversion_rate'`,
      [testRate]
    );
    
    await connection.execute(
      `UPDATE system_settings 
       SET value = ?, updated_at = NOW()
       WHERE setting_key = 'min_conversion'`,
      [testRate]
    );
    
    await connection.execute(
      `INSERT INTO conversion_history (
        student_id, 
        reward_points, 
        merit_points, 
        status, 
        request_date, 
        processed_by, 
        rejection_reason,
        conversion_rate
      ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        'ADMIN_SYSTEM',
        0, 
        0, 
        'Approved', 
        adminId, 
        `Test: Conversion rate changed from ${oldRate} to ${testRate}`,
        testRate
      ]
    );
    
    await connection.commit();
    
    const [settings] = await connection.execute(
      'SELECT * FROM system_settings WHERE setting_key IN ("conversion_rate", "min_conversion")'
    );
    
    broadcastToClients('test_rate_update', {
      oldRate,
      newRate: testRate,
      message: 'Test rate update completed'
    });
    
    res.json({
      success: true,
      message: 'Test completed',
      data: {
        testRate: testRate,
        oldRate: oldRate,
        settings: settings,
        timestamp: new Date().toISOString(),
        broadcast: true
      }
    });
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Test error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});


router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Conversion Management API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    connectedClients: connectedClients.size,
    endpoints: [
      'GET /pending',
      'GET /history', 
      'GET /settings',
      'GET /stats',
      'GET /updates (SSE)',
      'POST /approve',
      'POST /approve-simple',
      'POST /reject',
      'PUT /settings/conversion-rate',
      'GET /test-update-rate'
    ]
  });
});

module.exports = router;