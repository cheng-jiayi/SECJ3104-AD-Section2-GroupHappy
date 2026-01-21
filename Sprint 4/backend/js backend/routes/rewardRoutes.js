const express = require('express');
const router = express.Router();

router.get('/user/:studentID', async (req, res) => {
  try {
    const { studentID } = req.params;
    console.log(`💰 Fetching reward data for: ${studentID}`);
    
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
        s.totalPoints as totalRewardPoints,
        s.totalMerits as utmMeritPoints,
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
    console.log(`✅ User found: ${user.fullName}`);
    
    const ongoingEventsQuery = `
      SELECT 
        e.eventID as id,
        e.eventTitle as name,
        e.rewardPoints as target,
        COALESCE(p.rewardPointsEarned, 0) as earned,
        e.status,
        e.eventStartDate,
        e.eventEndDate
      FROM Event e
      LEFT JOIN Participation p ON e.eventID = p.eventID 
        AND p.studentID = ?
        AND p.participationStatus IN ('Registered', 'Attended')
      WHERE e.status IN ('Ongoing', 'Upcoming')
      ORDER BY e.eventStartDate DESC
      LIMIT 5
    `;
    
    const [ongoingEvents] = await db.query(ongoingEventsQuery, [studentID]);
    console.log(`✅ Found ${ongoingEvents.length} ongoing/upcoming events`);
    
    const ongoingWithProgress = ongoingEvents.map(event => ({
      id: event.id,
      name: event.name,
      target: parseInt(event.target) || 0,
      earned: parseInt(event.earned) || 0,
      progress: event.target > 0 ? (parseInt(event.earned) || 0) / (parseInt(event.target) || 1) : 0,
      status: event.status,
      startDate: event.eventStartDate,
      endDate: event.eventEndDate
    }));
    
    const completedEventsQuery = `
      SELECT 
        e.eventID as id,
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
    
    const [completedEvents] = await db.query(completedEventsQuery, [studentID]);
    console.log(`✅ Found ${completedEvents.length} completed events`);
    
    const completedEventsFormatted = completedEvents.map(event => ({
      id: event.id,
      name: event.name,
      points: parseInt(event.points) || 0,
      date: event.date
    }));
    
    const conversionHistoryQuery = `
      SELECT 
        ch.id,
        ch.reward_points as rewardPoints,
        ch.merit_points as meritPoints,
        ch.status,
        DATE_FORMAT(ch.request_date, '%Y-%m-%d') as date,
        ch.rejection_reason as reason,
        ch.conversion_rate
      FROM conversion_history ch
      WHERE ch.student_id = ?
        AND ch.status IN ('Approved', 'Rejected')
      ORDER BY ch.request_date DESC
      LIMIT 10
    `;
    
    const [conversionHistory] = await db.query(conversionHistoryQuery, [studentID]);
    console.log(`✅ Found ${conversionHistory.length} conversion history records`);
    
    const conversionHistoryFormatted = conversionHistory.map(conversion => ({
      id: conversion.id,
      rewardPoints: parseInt(conversion.rewardPoints) || 0,
      meritPoints: parseFloat(conversion.meritPoints) || 0,
      status: conversion.status,
      date: conversion.date,
      reason: conversion.reason || null,
      conversionRate: parseInt(conversion.conversion_rate) || 100
    }));
    
    const pendingQuery = `
      SELECT 
        ch.id,
        ch.reward_points as rewardPoints,
        ch.merit_points as meritPoints,
        ch.status,
        DATE_FORMAT(ch.request_date, '%Y-%m-%d %H:%i') as submittedDate,
        ch.conversion_rate
      FROM conversion_history ch
      WHERE ch.student_id = ?
        AND ch.status = 'Pending'
      ORDER BY ch.request_date DESC
    `;
    
    const [pendingConversions] = await db.query(pendingQuery, [studentID]);
    console.log(`✅ Found ${pendingConversions.length} pending conversions`);
    
    const pendingConversionsFormatted = pendingConversions.map(conversion => ({
      id: conversion.id,
      rewardPoints: parseInt(conversion.rewardPoints) || 0,
      meritPoints: parseFloat(conversion.meritPoints) || 0,
      status: conversion.status,
      submittedDate: conversion.submittedDate,
      conversionRate: parseInt(conversion.conversion_rate) || 100
    }));
    
    const settingsQuery = `
      SELECT 
        MAX(CASE WHEN setting_key = 'conversion_rate' THEN value END) as conversion_rate,
        MAX(CASE WHEN setting_key = 'min_conversion' THEN value END) as min_conversion
      FROM system_settings
    `;
    
    const [settingsRows] = await db.query(settingsQuery);
    const conversionRate = parseInt(settingsRows[0]?.conversion_rate) || 100;
    const minConversion = parseInt(settingsRows[0]?.min_conversion) || 100;
    
    const responseData = {
      userPoints: {
        totalRewardPoints: parseInt(user.totalRewardPoints) || 0,
        utmMeritPoints: parseFloat(user.utmMeritPoints) || 0,
        totalItemsRecycled: parseInt(user.totalItemsRecycled) || 0,
        totalWeightRecycled: parseFloat(user.totalWeightRecycled) || 0
      },
      ongoingEvents: ongoingWithProgress,
      completedEvents: completedEventsFormatted,
      conversionHistory: conversionHistoryFormatted,
      pendingConversions: pendingConversionsFormatted,
      conversionRate: conversionRate,
      minConversion: minConversion,
      userInfo: {
        name: user.fullName,
        studentID: user.studentID,
        faculty: user.faculty,
        yearOfStudy: user.yearOfStudy
      }
    };
    
    console.log(`✅ Reward data prepared for ${user.fullName}`);
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('❌ Rewards API Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching reward data',
      error: error.message
    });
  }
});

router.post('/convert', async (req, res) => {
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
    
    const { studentID, rewardPoints } = req.body;
    
    console.log(`🔄 Conversion request from ${studentID}: ${rewardPoints} points`);
    
    if (!studentID || !rewardPoints) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    const rewardPointsInt = parseInt(rewardPoints);
    
    if (isNaN(rewardPointsInt) || rewardPointsInt <= 0) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid reward points amount' 
      });
    }
    
    try {
      await connection.execute(
        'CALL RequestConversion(?, ?)',
        [studentID, rewardPointsInt]
      );
      
      await connection.commit();
      
      console.log(`✅ Conversion request submitted.`);
      
      res.json({
        success: true,
        message: 'Conversion request submitted for admin approval',
        data: {
          rewardPoints: rewardPointsInt,
          meritPoints: (rewardPointsInt / 100).toFixed(2),
          conversionRate: 100,
          estimatedApproval: '24-48 hours'
        }
      });
      
    } catch (procedureError) {
      console.log('⚠️ Procedure failed, using manual method:', procedureError.message);
      
      await connection.rollback();
      await connection.beginTransaction();
      
      const [rateRows] = await connection.execute(
        'SELECT value FROM system_settings WHERE setting_key = "conversion_rate"'
      );
      const conversionRate = rateRows[0]?.value || 100;
      
      const [userRows] = await connection.execute(
        'SELECT totalPoints FROM Student WHERE studentID = ?',
        [studentID]
      );
      
      if (userRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false, 
          message: 'Student not found' 
        });
      }
      
      const userPoints = userRows[0].totalPoints;
      
      if (userPoints < rewardPointsInt) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient reward points. You have ${userPoints} points available.` 
        });
      }
      
      const meritPoints = rewardPointsInt / conversionRate;
      
      const [insertResult] = await connection.execute(
        `INSERT INTO conversion_history (
          student_id, 
          reward_points, 
          merit_points, 
          status, 
          request_date,
          conversion_rate
        ) VALUES (?, ?, ?, 'Pending', NOW(), ?)`,
        [studentID, rewardPointsInt, meritPoints, conversionRate]
      );
      
      await connection.execute(
        'UPDATE Student SET totalPoints = totalPoints - ? WHERE studentID = ?',
        [rewardPointsInt, studentID]
      );
      
      await connection.commit();
      
      console.log(`✅ Manual conversion request submitted. ID: ${insertResult.insertId}`);
      
      res.json({
        success: true,
        message: 'Conversion request submitted for admin approval',
        data: {
          conversionId: insertResult.insertId,
          rewardPoints: rewardPointsInt,
          meritPoints: parseFloat(meritPoints.toFixed(2)),
          conversionRate: parseInt(conversionRate),
          estimatedApproval: '24-48 hours'
        }
      });
    }
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Submit conversion error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error submitting conversion',
      error: error.message 
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.get('/conversions/:studentID', async (req, res) => {
  try {
    const { studentID } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    console.log(`📋 Fetching conversions for: ${studentID}`);
    
    const db = req.app.get('db') || req.db;
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    const query = `CALL GetStudentConversionHistory(?, ?, ?)`;
    const [results] = await db.query(query, [studentID, parseInt(limit), parseInt(offset)]);
    
    const [conversions, summary] = results;
    
    res.json({
      success: true,
      data: {
        conversions: conversions || [],
        summary: summary?.[0] || {}
      }
    });
    
  } catch (error) {
    console.error('❌ Get conversions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching conversion history',
      error: error.message 
    });
  }
});

module.exports = router;