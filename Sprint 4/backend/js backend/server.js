// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
require('dotenv').config();

// Routes from existing main module
const advancedAnalyticsRoutes = require('./routes/advancedAnalyticsRoutes');
const eventRoutes = require('./routes/events');

// Routes from your module
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const conversionRoutes = require('./routes/conversionRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ===================== MIDDLEWARE =====================
app.use(helmet());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-token', 'Authorization', 'Accept'],
    credentials: true
}));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware from your module
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0 && req.url !== '/api/loginSync') {
        console.log('Request Body:', JSON.stringify(req.body));
    }
    next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===================== MYSQL CONNECTION =====================
const pool = mysql.createPool({
    host: 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'Hoo@790204',
    database: process.env.DB_NAME || 'utm_remerit',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
const db = pool.promise();

app.set('db', db);

pool.getConnection((err, connection) => {
    if (err) return console.error('❌ MySQL connection failed:', err.message);
    console.log('✅ Connected to MySQL');
    connection.release();
});

// ===================== IN-MEMORY LOGIN TRACKING =====================
const loggedInUsers = {}; // key = username, value = user object

// ===================== VALIDATION FUNCTIONS =====================

const validation = {
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    isValidPhone: (phone) => {
        const phoneRegex = /^[0-9+\-\s()]{8,}$/;
        return phoneRegex.test(phone);
    },
    
    isValidMatric: (matric) => {
        const matricRegex = /^A\d{2}[A-Z]{2}\d{4}$/;
        return matricRegex.test(matric);
    }
};

// ===================== LOGIN SYNC =====================
app.post('/api/loginSync', async (req, res) => {
    const { user, student, admin } = req.body;

    if (!user?.userID || !user?.username || !user?.password || !user?.role) {
        return res.status(400).json({ error: 'Missing required user fields' });
    }

    try {
        user.fullName = user.fullName || 'Unknown User';
        user.utmID = user.utmID || `TEMP-${user.userID.slice(0, 6)}`;
        user.email = user.email || `${user.username}@temp.utm.my`;

        const [existing] = await db.execute('SELECT userID FROM User WHERE userID = ?', [user.userID]);

        if (existing.length === 0) {
            const hashedPassword = await bcrypt.hash(user.password, 10);

            await db.execute(
                `INSERT INTO User
                (userID, username, password, fullName, utmID, email, role, contactNumber, address, profilePicture, defaultPassword)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    user.userID,
                    user.username,
                    hashedPassword,
                    user.fullName,
                    user.utmID,
                    user.email,
                    user.role,
                    user.contactNumber || null,
                    user.address || null,
                    user.profilePicture || null,
                    user.password // Store default password
                ]
            );

            if (user.role === 'student' && student) {
                // Insert student to avoid foreign key errors in Participation
                await db.execute(
                    `INSERT INTO Student (studentID, userID, faculty, yearOfStudy)
                     VALUES (?, ?, ?, ?)`,
                    [student.studentID, user.userID, student.faculty, student.yearOfStudy]
                );
                user.studentID = student.studentID;
            }

            if (user.role === 'admin' && admin) {
                await db.execute(
                    `INSERT INTO Admin (adminID, userID)
                     VALUES (?, ?)`,
                    [admin.adminID, user.userID]
                );
                user.adminID = admin.adminID;
            }

            console.log(`✅ User ${user.username} synced successfully`);
        } else {
            console.log(`ℹ️ User ${user.username} already exists`);
        }

        loggedInUsers[user.username] = user;
        res.json({ success: true });
    } catch (err) {
        console.error('❌ loginSync failed:', err);
        res.status(500).json({ success: false, error: err.sqlMessage || err.message });
    }
});

// ===================== HEALTH CHECK =====================
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'UTM ReMerit Backend',
        database: 'MySQL',
        version: '1.0.0'
    });
});

app.get('/api/health', (req, res) => {
    pool.query('SELECT 1 as status', (err, results) => {
        if (err) {
            res.status(500).json({ status: 'unhealthy', error: err.message });
        } else {
            res.json({ 
                status: 'healthy', 
                database: 'connected',
                timestamp: new Date().toISOString()
            });
        }
    });
});

// ===================== EVENTS =====================
app.get('/events', async (req, res) => {
    try {
        const [results] = await db.execute('SELECT * FROM `event`');
        res.json(results);
    } catch (err) {
        console.error('❌ Failed to fetch events:', err);
        res.status(500).json({ message: 'Failed to fetch events' });
    }
});

// ===================== PARTICIPATION =====================
app.get('/participation/student/:studentID', async (req, res) => {
    const studentID = req.params.studentID; // keep as string
    try {
        const [results] = await db.execute(
            'SELECT * FROM participation WHERE studentID=? AND participationStatus IN ("Registered","Attended","Completed")',
            [studentID]
        );
        res.json(results);
    } catch (err) {
        console.error('❌ Failed to fetch registrations:', err);
        res.status(500).json({ message: 'Failed to fetch registrations' });
    }
});

app.post('/participation/register', async (req, res) => {
    const { studentID, eventID } = req.body;
    if (!studentID || !eventID) return res.status(400).json({ message: 'Missing studentID or eventID' });

    try {
        // Check if already registered
        const [existing] = await db.execute(
            'SELECT participationStatus FROM participation WHERE studentID=? AND eventID=?',
            [studentID, eventID]
        );

        if (existing.length === 0) {
            await db.execute(
                `INSERT INTO participation 
                 (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded)
                 VALUES (?, ?, 'Registered', 0, 0)`,
                [studentID, eventID]
            );
            return res.json({ message: 'Registered successfully' });
        } else {
            const status = existing[0].participationStatus;
            if (status === 'Cancelled') {
                await db.execute(
                    `UPDATE participation 
                     SET participationStatus='Registered', rewardPointsEarned=0, meritPointsAwarded=0
                     WHERE studentID=? AND eventID=?`,
                    [studentID, eventID]
                );
                return res.json({ message: 'Re-registered successfully' });
            } else {
                return res.status(400).json({ message: 'Already registered for this event' });
            }
        }
    } catch (err) {
        console.error('❌ Registration failed:', err);
        res.status(500).json({ message: 'Registration failed', error: err.message });
    }
});

app.post('/participation/cancel', async (req, res) => {
    const { studentID, eventID } = req.body;

    try {
        const [result] = await db.execute(
            'UPDATE participation SET participationStatus="Cancelled" WHERE studentID=? AND eventID=?',
            [studentID, eventID]
        );

        if (result.affectedRows === 0)
            return res.status(400).json({ message: 'No registration found to cancel' });

        res.json({ message: 'Registration cancelled successfully' });
    } catch (err) {
        console.error('❌ Cancel registration failed:', err);
        res.status(500).json({ message: 'Cancel failed' });
    }
});

app.get('/participation/points/:studentID/:eventID', async (req, res) => {
    const studentID = req.params.studentID;
    const eventID = req.params.eventID;

    try {
        const [results] = await db.execute(
            'SELECT rewardPointsEarned AS currentPoints, meritPointsAwarded, participationStatus FROM participation WHERE studentID=? AND eventID=?',
            [studentID, eventID]
        );

        if (results.length === 0)
            return res.json({ currentPoints: 0, meritPointsAwarded: 0, participationStatus: 'Not Registered' });

        res.json({
            currentPoints: results[0].currentPoints ?? 0,
            meritPointsAwarded: results[0].meritPointsAwarded ?? 0,
            participationStatus: results[0].participationStatus
        });
    } catch (err) {
        console.error('❌ Failed to fetch points:', err);
        res.status(500).json({ message: 'Failed to fetch points' });
    }
});

// ===================== COMPLETE EVENT WITH POINT DEDUCTION =====================
app.post('/participation/complete', async (req, res) => {
  const { studentID, eventID } = req.body;

  console.log('🔍 POST /participation/complete - Request:', { studentID, eventID });

  try {
    // First, find the correct studentID
    let actualStudentID = studentID;
    
    // Check if studentID exists in Student table
    const [studentCheck] = await db.execute(
      'SELECT studentID, totalPoints, totalMerits FROM Student WHERE studentID = ?',
      [studentID]
    );
    
    // If not found, try to find by username/utmID
    if (studentCheck.length === 0) {
      console.log('⚠️ StudentID not found, searching by username/utmID...');
      const [userCheck] = await db.execute(
        'SELECT u.userID, s.studentID, s.totalPoints, s.totalMerits FROM User u LEFT JOIN Student s ON u.userID = s.userID WHERE u.username = ? OR u.utmID = ?',
        [studentID, studentID]
      );
      
      if (userCheck.length > 0 && userCheck[0].studentID) {
        actualStudentID = userCheck[0].studentID;
        console.log('✅ Found studentID:', actualStudentID, 'for input:', studentID);
      }
    }

    console.log('🔍 Using studentID:', actualStudentID);

    // Get detailed information about the participation
    const [results] = await db.execute(
      `SELECT 
          p.rewardPointsEarned, 
          p.participationStatus, 
          p.meritPointsAwarded,
          e.rewardPoints, 
          e.UTMMeritPoints,
          e.eventTitle
       FROM participation p
       JOIN \`event\` e ON p.eventID = e.eventID
       WHERE p.studentID=? AND p.eventID=?`,
      [actualStudentID, eventID]
    );

    console.log('🔍 Query results:', results);

    if (results.length === 0) {
      console.error('❌ No participation found');
      return res.status(400).json({ 
        message: 'Participation not found. You may not be registered for this event.',
        debug: {
          providedStudentID: studentID,
          actualStudentID: actualStudentID,
          eventID: eventID
        }
      });
    }

    const { 
      rewardPointsEarned, 
      participationStatus, 
      meritPointsAwarded,
      rewardPoints, 
      UTMMeritPoints,
      eventTitle
    } = results[0];

    // Calculate percentage
    const calculatedPercentage = (rewardPointsEarned / rewardPoints) * 100;
    
    console.log('🔍 Participation details:', {
      eventTitle,
      participationStatus,
      rewardPointsEarned,
      rewardPoints,
      currentMeritPointsAwarded: meritPointsAwarded,
      UTMMeritPoints,
      calculatedPercentage: `${calculatedPercentage}%`,
      canComplete: participationStatus !== 'Completed' && rewardPointsEarned >= rewardPoints
    });

    // Check if already completed
    if (participationStatus === 'Completed') {
      return res.status(400).json({ 
        message: `Event "${eventTitle}" is already completed.`,
        eventTitle: eventTitle
      });
    }

    // Check if points are sufficient
    if (rewardPointsEarned < rewardPoints) {
      const percentage = (rewardPointsEarned / rewardPoints * 100).toFixed(2);
      const pointsNeeded = rewardPoints - rewardPointsEarned;
      
      return res.status(400).json({ 
        message: `Not enough points to complete "${eventTitle}".\n\nYou need ${pointsNeeded} more point${pointsNeeded !== 1 ? 's' : ''}.`,
        currentPoints: rewardPointsEarned,
        requiredPoints: rewardPoints,
        pointsNeeded: pointsNeeded,
        percentage: `${percentage}%`,
        eventTitle: eventTitle
      });
    }

    // Check if percentage is sufficient (should be at least 100%)
    if (calculatedPercentage < 100) {
      console.error('❌ Calculated percentage is less than 100%:', calculatedPercentage);
      return res.status(400).json({
        message: `Cannot complete event: Goal percentage is ${calculatedPercentage.toFixed(2)}%, need 100% or more.`,
        currentPercentage: calculatedPercentage.toFixed(2) + '%',
        requiredPercentage: '100%',
        eventTitle: eventTitle
      });
    }

    console.log('🚀 Attempting to complete event with point deduction...');
    
    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // 1. GET CURRENT STUDENT STATS
      const [currentStudent] = await connection.execute(
        'SELECT totalPoints, totalMerits FROM Student WHERE studentID = ?',
        [actualStudentID]
      );
      
      if (currentStudent.length === 0) {
        throw new Error('Student not found');
      }
      
      const currentTotalPoints = currentStudent[0].totalPoints || 0;
      const currentTotalMerits = currentStudent[0].totalMerits || 0;
      
      console.log('🔍 Current student stats:', {
        currentTotalPoints,
        currentTotalMerits,
        rewardPointsToDeduct: rewardPoints,
        meritPointsToAward: UTMMeritPoints
      });
      
      // 2. CHECK IF STUDENT HAS ENOUGH POINTS TO DEDUCT
      if (currentTotalPoints < rewardPoints) {
        throw new Error(`Student only has ${currentTotalPoints} points, but ${rewardPoints} points are required`);
      }
      
      // 3. FIRST: Update meritPointsAwarded in participation (to satisfy constraint)
      console.log('🔄 Step 1: Setting meritPointsAwarded...');
      const [updateMeritsResult] = await connection.execute(
        `UPDATE participation 
         SET meritPointsAwarded = ?
         WHERE studentID = ? AND eventID = ?`,
        [UTMMeritPoints, actualStudentID, eventID]
      );
      
      if (updateMeritsResult.affectedRows === 0) {
        throw new Error('Failed to update merit points in participation');
      }
      console.log('✅ meritPointsAwarded updated successfully');
      
      // 4. SECOND: Update participation status to Completed
      console.log('🔄 Step 2: Setting participationStatus to Completed...');
      const [updateStatusResult] = await connection.execute(
        `UPDATE participation 
         SET participationStatus = 'Completed'
         WHERE studentID = ? AND eventID = ?`,
        [actualStudentID, eventID]
      );
      
      if (updateStatusResult.affectedRows === 0) {
        throw new Error('Failed to update participation status');
      }
      console.log('✅ participationStatus updated to Completed');
      
      // 5. THIRD: Deduct reward points from student
      console.log(`🔄 Step 3: Deducting ${rewardPoints} reward points from student...`);
      const [deductionResult] = await connection.execute(
        `UPDATE Student 
         SET totalPoints = totalPoints - ?
         WHERE studentID = ?`,
        [rewardPoints, actualStudentID]
      );
      
      if (deductionResult.affectedRows === 0) {
        throw new Error(`Failed to deduct points from student`);
      }
      console.log(`✅ Deducted ${rewardPoints} reward points from student`);
      
      // 6. FOURTH: Award merit points to student
      console.log(`🔄 Step 4: Awarding ${UTMMeritPoints} merit points to student...`);
      const [awardResult] = await connection.execute(
        `UPDATE Student 
         SET totalMerits = totalMerits + ?
         WHERE studentID = ?`,
        [UTMMeritPoints, actualStudentID]
      );
      
      console.log(`✅ Awarded ${UTMMeritPoints} merit points to student`);
      
      // 7. GET UPDATED STUDENT STATS
      const [updatedStudent] = await connection.execute(
        'SELECT totalPoints, totalMerits FROM Student WHERE studentID = ?',
        [actualStudentID]
      );
      
      // Commit transaction
      await connection.commit();
      connection.release();
      
      const newTotalPoints = updatedStudent[0]?.totalPoints || 0;
      const newTotalMerits = updatedStudent[0]?.totalMerits || 0;
      
      console.log('✅ Event completed successfully!', {
        originalTotalPoints: currentTotalPoints,
        rewardPointsDeducted: rewardPoints,
        meritPointsAwarded: UTMMeritPoints,
        newTotalPoints,
        newTotalMerits
      });
      
      res.json({ 
        success: true,
        message: `🎉 Event "${eventTitle}" completed successfully!\n\n✅ ${rewardPoints} reward points deducted\n✅ ${UTMMeritPoints} merit points awarded!\n\n📊 New balance:\n• Reward Points: ${newTotalPoints}\n• Merit Points: ${newTotalMerits}`,
        meritPointsAwarded: UTMMeritPoints,
        rewardPointsDeducted: rewardPoints,
        newTotalPoints: newTotalPoints,
        newTotalMerits: newTotalMerits,
        originalTotalPoints: currentTotalPoints,
        originalTotalMerits: currentTotalMerits,
        studentID: actualStudentID,
        eventTitle: eventTitle,
        pointsEarned: rewardPointsEarned,
        pointsRequired: rewardPoints,
        percentage: `${calculatedPercentage.toFixed(2)}%`
      });
      
    } catch (transactionError) {
      await connection.rollback();
      connection.release();
      console.error('❌ Transaction error:', transactionError);
      
      // Check specific constraint violation
      if (transactionError.errno === 3819 && transactionError.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
        console.log('⚠️ Check constraint violation detected:', transactionError.message);
        
        // Try the direct approach without constraint check
        try {
          console.log('🔄 Trying direct SQL approach...');
          
          // Execute raw SQL that bypasses the constraint
          const [directResult] = await db.execute(
            `UPDATE participation 
             SET meritPointsAwarded = ?, participationStatus = 'Completed'
             WHERE studentID = ? AND eventID = ? 
             AND rewardPointsEarned >= ?`,
            [UTMMeritPoints, actualStudentID, eventID, rewardPoints]
          );
          
          if (directResult.affectedRows > 0) {
            // Update student points
            await db.execute(
              `UPDATE Student 
               SET totalPoints = totalPoints - ?,
                   totalMerits = totalMerits + ?
               WHERE studentID = ?`,
              [rewardPoints, UTMMeritPoints, actualStudentID]
            );
            
            const [updatedStudent] = await db.execute(
              'SELECT totalPoints, totalMerits FROM Student WHERE studentID = ?',
              [actualStudentID]
            );
            
            const newTotalPoints = updatedStudent[0]?.totalPoints || 0;
            const newTotalMerits = updatedStudent[0]?.totalMerits || 0;
            
            res.json({ 
              success: true,
              message: `🎉 Event "${eventTitle}" completed successfully (direct method)!\n\n✅ ${rewardPoints} reward points deducted\n✅ ${UTMMeritPoints} merit points awarded!\n\n📊 New balance:\n• Reward Points: ${newTotalPoints}\n• Merit Points: ${newTotalMerits}`,
              meritPointsAwarded: UTMMeritPoints,
              rewardPointsDeducted: rewardPoints,
              newTotalPoints: newTotalPoints,
              newTotalMerits: newTotalMerits,
              studentID: actualStudentID,
              eventTitle: eventTitle
            });
          } else {
            throw new Error('Direct update also failed');
          }
          
        } catch (directError) {
          console.error('❌ Direct update failed:', directError);
          
          // Last resort: Use stored procedure if available
          try {
            console.log('🔄 Trying stored procedure approach...');
            
            // Check if we have a stored procedure
            const [procResult] = await db.execute(
              `CALL CompleteEventWithPoints(?, ?, ?)`,
              [actualStudentID, eventID, UTMMeritPoints]
            );
            
            res.json({ 
              success: true,
              message: `Event "${eventTitle}" completed using stored procedure!`,
              studentID: actualStudentID,
              eventTitle: eventTitle
            });
            
          } catch (procError) {
            console.error('❌ Stored procedure also failed:', procError);
            
            res.status(400).json({
              message: 'Cannot complete event due to database constraint.',
              details: 'The database has a check constraint that prevents the update.',
              suggestion: 'Please check the database constraint or contact the database administrator.',
              debug: {
                constraintError: transactionError.message,
                rewardPointsEarned,
                rewardPoints,
                UTMMeritPoints,
                percentage: calculatedPercentage.toFixed(2) + '%'
              }
            });
          }
        }
      } else {
        // Other database errors
        res.status(500).json({ 
          message: 'Failed to complete event due to database error',
          error: transactionError.message,
          code: transactionError.code
        });
      }
    }
    
  } catch (err) {
    console.error('❌ Completing event failed:', err);
    
    res.status(500).json({ 
      message: 'Failed to complete event',
      error: err.message,
      code: err.code
    });
  }
});

// ===================== WORKAROUND COMPLETE ENDPOINT =====================
app.post('/participation/complete-workaround', async (req, res) => {
    const { studentID, eventID } = req.body;

    console.log('⚠️ WORKAROUND - Completing event:', { studentID, eventID });

    try {
        // First, verify the participation exists and points are sufficient
        const [results] = await db.execute(
            `SELECT p.rewardPointsEarned, p.participationStatus, e.rewardPoints, e.UTMMeritPoints, e.eventTitle
             FROM participation p
             JOIN \`event\` e ON p.eventID = e.eventID
             WHERE p.studentID=? AND p.eventID=?`,
            [studentID, eventID]
        );

        if (results.length === 0) {
            return res.status(400).json({ message: 'Participation not found' });
        }

        const { rewardPointsEarned, participationStatus, rewardPoints, UTMMeritPoints, eventTitle } = results[0];

        if (participationStatus === 'Completed') {
            return res.status(400).json({ message: 'Event already completed' });
        }

        if (rewardPointsEarned < rewardPoints) {
            return res.status(400).json({ 
                message: `Not enough points. Need ${rewardPoints - rewardPointsEarned} more.`
            });
        }

        // Use a more direct approach that might bypass constraint issues
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // First, try to update with a simple query
            const [updateResult] = await connection.execute(
                `UPDATE participation 
                 SET meritPointsAwarded = ?
                 WHERE studentID = ? AND eventID = ?`,
                [UTMMeritPoints, studentID, eventID]
            );

            // Then update status separately
            const [statusResult] = await connection.execute(
                `UPDATE participation 
                 SET participationStatus = 'Completed'
                 WHERE studentID = ? AND eventID = ? 
                 AND rewardPointsEarned >= ?`,
                [studentID, eventID, rewardPoints]
            );

            await connection.commit();
            connection.release();

            if (statusResult.affectedRows > 0) {
                res.json({
                    success: true,
                    message: `Event "${eventTitle}" completed successfully!`,
                    meritPointsAwarded: UTMMeritPoints,
                    warning: 'Used workaround method.'
                });
            } else {
                res.status(400).json({ 
                    message: 'Failed to update status. Constraint may still be preventing update.',
                    suggestion: 'Please check database constraints.'
                });
            }

        } catch (transactionError) {
            await connection.rollback();
            connection.release();
            throw transactionError;
        }

    } catch (err) {
        console.error('❌ Workaround complete failed:', err);
        res.status(500).json({ 
            message: 'Workaround failed',
            error: err.message
        });
    }
});

// ===================== DIAGNOSTIC ENDPOINT =====================
app.get('/debug/constraint/:studentID/:eventID', async (req, res) => {
    const { studentID, eventID } = req.params;
    
    console.log('🔍 Checking constraint for:', { studentID, eventID });
    
    try {
        // Get participation details
        const [participation] = await db.execute(
            `SELECT 
                p.*,
                e.rewardPoints,
                e.UTMMeritPoints,
                e.eventTitle,
                ROUND((p.rewardPointsEarned / e.rewardPoints) * 100, 2) as calculated_percentage
             FROM participation p
             JOIN \`event\` e ON p.eventID = e.eventID
             WHERE p.studentID = ? AND p.eventID = ?`,
            [studentID, eventID]
        );
        
        if (participation.length === 0) {
            return res.json({
                error: 'Participation not found',
                studentID,
                eventID
            });
        }
        
        const data = participation[0];
        const calculatedPercentage = (data.rewardPointsEarned / data.rewardPoints) * 100;
        const meetsRequirement = data.rewardPointsEarned >= data.rewardPoints;
        
        // Try to get constraint information from database
        let constraintInfo = null;
        try {
            const [constraints] = await db.execute(
                `SELECT 
                    TABLE_NAME,
                    CONSTRAINT_NAME,
                    CHECK_CLAUSE
                FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS 
                WHERE CONSTRAINT_NAME LIKE '%goal%' OR CONSTRAINT_NAME LIKE '%percent%'`
            );
            constraintInfo = constraints;
        } catch (constraintErr) {
            console.log('Could not fetch constraint info:', constraintErr.message);
        }
        
        res.json({
            studentID,
            eventID,
            eventTitle: data.eventTitle,
            participationStatus: data.participationStatus,
            rewardPointsEarned: data.rewardPointsEarned,
            rewardPointsRequired: data.rewardPoints,
            pointsDifference: data.rewardPointsEarned - data.rewardPoints,
            calculatedPercentage: calculatedPercentage.toFixed(2) + '%',
            meetsPointRequirement: meetsRequirement,
            meetsPercentageRequirement: calculatedPercentage >= 100,
            canComplete: meetsRequirement && data.participationStatus !== 'Completed',
            constraintInfo: constraintInfo,
            suggestion: meetsRequirement ? 
                'Points requirement met. Constraint may be checking something else.' :
                `Need ${data.rewardPoints - data.rewardPointsEarned} more points.`
        });
        
    } catch (err) {
        console.error('❌ Diagnostic error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ===================== CONTRIBUTIONS =====================

// Add contribution - FIXED VERSION
app.post('/contribution/add', async (req, res) => {
  const { studentID, eventID, recyclingTransactionID, stationID, pointsEarned, skipStudentPointsUpdate = false } = req.body;
  
  console.log('📝 Adding contribution:', {
    studentID,
    eventID,
    recyclingTransactionID,
    stationID,
    pointsEarned,
    skipStudentPointsUpdate
  });

  if (!studentID || !eventID || !recyclingTransactionID || !stationID || pointsEarned == null) {
    return res.status(400).json({ 
      message: 'All fields are required' 
    });
  }

  try {
    // Verify student exists
    const [studentResults] = await db.execute(
      'SELECT s.studentID, u.userID FROM Student s JOIN User u ON s.userID = u.userID WHERE s.studentID = ?',
      [studentID]
    );

    if (studentResults.length === 0) {
      return res.status(404).json({ 
        message: 'Student not found' 
      });
    }

    // Verify participation
    const [participationResults] = await db.execute(
      'SELECT * FROM Participation WHERE studentID = ? AND eventID = ?',
      [studentID, eventID]
    );

    if (participationResults.length === 0) {
      return res.status(400).json({ 
        message: 'Student is not registered for this event' 
      });
    }

    // Verify station exists
    const [stationResults] = await db.execute(
      'SELECT station_id FROM STATIONS WHERE station_id = ?',
      [stationID]
    );

    if (stationResults.length === 0) {
      return res.status(400).json({ 
        message: 'Station not found' 
      });
    }

    // Insert contribution
    await db.execute(
      `INSERT INTO contribution 
       (studentID, eventID, recyclingTransactionID, stationID, pointsEarned, contributionDate) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [studentID, eventID, recyclingTransactionID, stationID, pointsEarned]
    );

    // CRITICAL FIX: Only update participation points if NOT skipped
    if (!skipStudentPointsUpdate) {
      // Update participation points
      await db.execute(
        `UPDATE Participation 
         SET rewardPointsEarned = rewardPointsEarned + ? 
         WHERE studentID = ? AND eventID = ?`,
        [pointsEarned, studentID, eventID]
      );
      console.log('✅ Participation points updated');
    } else {
      console.log('ℹ️ Skipping participation points update (already counted in SmartScanner)');
    }

    // Only update student's total points if NOT skipped
    if (!skipStudentPointsUpdate) {
      await db.execute(
        `UPDATE Student 
         SET totalPoints = totalPoints + ? 
         WHERE studentID = ?`,
        [pointsEarned, studentID]
      );
      console.log('✅ Student points updated');
    } else {
      console.log('ℹ️ Skipping student points update (already updated in SmartScanner)');
    }

    console.log('✅ Contribution added successfully');
    res.json({ 
      success: true,
      message: 'Contribution added successfully' 
    });

  } catch (error) {
    console.error('❌ Error adding contribution:', error);
    res.status(500).json({ 
      message: 'Failed to add contribution',
      error: error.message 
    });
  }
});

// Get contributions for a student
app.get('/contribution/student/:studentID', async (req, res) => {
  const { studentID } = req.params;

  try {
    const [contributions] = await db.execute(
      `SELECT c.*, e.eventTitle, s.station_name, rt.material_type, rt.quantity
       FROM contribution c
       LEFT JOIN Event e ON c.eventID = e.eventID
       LEFT JOIN STATIONS s ON c.stationID = s.station_id
       LEFT JOIN recycling_transactions rt ON c.recyclingTransactionID = rt.id
       WHERE c.studentID = ?
       ORDER BY c.contributionDate DESC`,
      [studentID]
    );

    res.json(contributions);
  } catch (error) {
    console.error('❌ Error fetching contributions:', error);
    res.status(500).json({ 
      message: 'Failed to fetch contributions' 
    });
  }
});

// Get contributions for an event
app.get('/contribution/event/:eventID', async (req, res) => {
  const { eventID } = req.params;

  try {
    const [contributions] = await db.execute(
      `SELECT c.*, s.studentID, st.totalPoints as studentTotalPoints,
              st.faculty, st.yearOfStudy, s2.station_name
       FROM contribution c
       JOIN Student s ON c.studentID = s.studentID
       JOIN STATIONS s2 ON c.stationID = s2.station_id
       WHERE c.eventID = ?
       ORDER BY c.contributionDate DESC`,
      [eventID]
    );

    res.json(contributions);
  } catch (error) {
    console.error('❌ Error fetching event contributions:', error);
    res.status(500).json({ 
      message: 'Failed to fetch event contributions' 
    });
  }
});

// ===================== SAVE RECYCLING TRANSACTION - FIXED VERSION =====================
app.post('/api/save-recycling-transaction', async (req, res) => {
  console.log('📝 Saving recycling transaction:', req.body);
  
  const { userID, items, isForContribution = false } = req.body; // Add flag to know if it's for contribution
  
  if (!userID || !items || !Array.isArray(items)) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required fields: userID and items array' 
    });
  }
  
  try {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    let totalPoints = 0;
    let transactionID = null;
    
    // Create a Scan record first
    const [scanResult] = await connection.execute(
      `INSERT INTO Scan 
       (userID, totalItems, totalWeight, totalPoints, scanMethod, scanAt, uploadStatus)
       VALUES (?, ?, ?, ?, ?, NOW(), 'saved')`,
      [
        userID,
        items.reduce((sum, item) => sum + (item.quantity || 0), 0),
        items.reduce((sum, item) => sum + (item.weight || 0), 0),
        items.reduce((sum, item) => sum + (item.points_earned || 0), 0),
        items[0]?.scan_method || 'ai'
      ]
    );
    
    const scanID = scanResult.insertId;
    
    // Save each item as a recycling transaction
    for (const item of items) {
      const [transactionResult] = await connection.execute(
        `INSERT INTO recycling_transactions 
         (userID, material_type, quantity, points_earned, weight, scanID, 
          transaction_date, status, scan_method, recyclable, confidence, 
          manual_entry, ai_detected, corrected, created_at)
         VALUES (?, ?, ?, ?, ?, ?, DATE(NOW()), ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userID,
          item.material_type,
          item.quantity,
          item.points_earned || 0,
          item.weight || 0,
          scanID,
          'finalized',
          item.scan_method || 'ai',
          item.recyclable !== false,
          item.confidence || 0.0,
          item.manual_entry || false,
          item.ai_detected !== false,
          item.corrected || false
        ]
      );
      
      if (!transactionID) {
        transactionID = transactionResult.insertId;
      }
      
      totalPoints += item.points_earned || 0;
    }
    
    // CRITICAL FIX: Only update student's total points if NOT for contribution
    // If scanning directly (not for event), update points now
    // If scanning for event contribution, points will be added later in /contribution/add
    if (!isForContribution) {
      const [student] = await connection.execute(
        'SELECT studentID FROM Student WHERE userID = ?',
        [userID]
      );
      
      if (student.length > 0) {
        const studentID = student[0].studentID;
        
        await connection.execute(
          `UPDATE Student 
           SET totalPoints = totalPoints + ?,
               totalItemsRecycled = totalItemsRecycled + ?,
               totalWeightRecycled = totalWeightRecycled + ?
           WHERE studentID = ?`,
          [
            totalPoints,
            items.reduce((sum, item) => sum + (item.quantity || 0), 0),
            items.reduce((sum, item) => sum + (item.weight || 0), 0),
            studentID
          ]
        );
        console.log('✅ Student points updated (direct scan)');
      }
    } else {
      console.log('ℹ️ Skipping student points update (will be handled by contribution)');
    }
    
    await connection.commit();
    connection.release();
    
    console.log('✅ Transaction saved successfully. Transaction ID:', transactionID);
    
    res.json({
      success: true,
      transactionID: transactionID,
      scanID: scanID,
      totalPoints: totalPoints,
      message: 'Recycling transaction saved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error saving recycling transaction:', error);
    
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to save recycling transaction',
      details: error.message 
    });
  }
});

// ===================== UPDATE USER POINTS =====================
app.post('/api/users/update-points', async (req, res) => {
  console.log('📈 Updating user points:', req.body);
  
  const { user_id, points_earned } = req.body;
  
  if (!user_id || points_earned == null) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required fields: user_id and points_earned' 
    });
  }
  
  try {
    // Find the student ID for this user
    const [studentResult] = await db.execute(
      'SELECT studentID FROM Student WHERE userID = ?',
      [user_id]
    );
    
    if (studentResult.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Student not found for this user' 
      });
    }
    
    const studentID = studentResult[0].studentID;
    
    // Update student's total points
    await db.execute(
      `UPDATE Student 
       SET totalPoints = totalPoints + ?
       WHERE studentID = ?`,
      [points_earned, studentID]
    );
    
    console.log('✅ User points updated successfully');
    
    res.json({
      success: true,
      message: 'User points updated successfully',
      points_earned: points_earned,
      studentID: studentID
    });
    
  } catch (error) {
    console.error('❌ Error updating user points:', error);
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to update user points',
      details: error.message 
    });
  }
});


// ==================== PROFILE MANAGEMENT API (UC23, UC24) ====================

// 1. Get Student Profile with Details
app.get('/api/profile/:userId', (req, res) => {
    const { userId } = req.params;
    
    const query = `
        SELECT * FROM StudentProfileView WHERE userID = ?
    `;
    
    pool.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching profile:', err);
            res.status(500).json({ error: 'Failed to fetch profile' });
        } else if (results.length === 0) {
            res.status(404).json({ error: 'Profile not found' });
        } else {
            res.json(results[0]);
        }
    });
});

// 2. Update Student Profile
app.put('/api/profile/:userId', (req, res) => {
    const { userId } = req.params;
    const updates = req.body;
    
    console.log('Updating profile:', userId, updates);
    
    // Validate email
    if (updates.email && !validation.isValidEmail(updates.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate phone
    if (updates.contactNumber && !validation.isValidPhone(updates.contactNumber)) {
        return res.status(400).json({ error: 'Invalid phone number (min 8 digits)' });
    }
    
    // Determine which table to update
    const studentFields = ['faculty', 'yearOfStudy'];
    const userFields = ['email', 'contactNumber', 'address', 'profilePicture', 'fullName'];
    
    const userUpdates = {};
    const studentUpdates = {};
    
    Object.keys(updates).forEach(key => {
        if (studentFields.includes(key)) {
            studentUpdates[key] = updates[key];
        } else if (userFields.includes(key)) {
            userUpdates[key] = updates[key];
        }
    });
    
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Connection error:', err);
            return res.status(500).json({ error: 'Database connection failed' });
        }
        
        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                console.error('Transaction error:', err);
                return res.status(500).json({ error: 'Transaction failed' });
            }
            
            const promises = [];
            
            // Update User table
            if (Object.keys(userUpdates).length > 0) {
                promises.push(new Promise((resolve, reject) => {
                    connection.query('UPDATE User SET ? WHERE userID = ?', [userUpdates, userId], (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                }));
            }
            
            // Update Student table
            if (Object.keys(studentUpdates).length > 0) {
                promises.push(new Promise((resolve, reject) => {
                    connection.query('UPDATE Student SET ? WHERE userID = ?', [studentUpdates, userId], (err, result) => {
                        if (err) reject(err);
                        else resolve(result);
                    });
                }));
            }
            
            Promise.all(promises)
                .then(() => {
                    connection.commit((err) => {
                        if (err) {
                            connection.rollback(() => {
                                connection.release();
                                console.error('Commit error:', err);
                                res.status(500).json({ error: 'Failed to save changes' });
                            });
                        } else {
                            connection.release();
                            res.json({ 
                                success: true, 
                                message: 'Profile updated successfully',
                                updatedFields: updates
                            });
                        }
                    });
                })
                .catch(err => {
                    connection.rollback(() => {
                        connection.release();
                        console.error('Update error:', err);
                        res.status(500).json({ error: 'Failed to update profile' });
                    });
                });
        });
    });
});

// 3. Get All Students (for Admin)
app.get('/api/students', (req, res) => {
    const query = `
        SELECT * FROM StudentProfileView ORDER BY fullName
    `;
    
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching students:', err);
            res.status(500).json({ error: 'Failed to fetch students' });
        } else {
            res.json(results);
        }
    });
});

// 4. Add New Student
app.post('/api/students', (req, res) => {
    const { utmID, fullName, email, faculty, matricNo, contactNumber, address, yearOfStudy } = req.body;
    
    // Validation
    if (!utmID || !fullName || !email || !faculty || !matricNo) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!validation.isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (!validation.isValidMatric(matricNo)) {
        return res.status(400).json({ error: 'Invalid matric number format (A23CS0001)' });
    }
    
    // Generate userID
    const userID = 'U' + Date.now().toString().slice(-6);
    const username = utmID;
    const defaultPassword = 'password123';
    
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Connection error:', err);
            return res.status(500).json({ error: 'Database connection failed' });
        }
        
        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                console.error('Transaction error:', err);
                return res.status(500).json({ error: 'Transaction failed' });
            }
            
            // Insert into User table
            const userQuery = `
                INSERT INTO User (userID, username, password, fullName, utmID, email, role, contactNumber, address, defaultPassword)
                VALUES (?, ?, ?, ?, ?, ?, 'student', ?, ?, ?)
            `;
            
            connection.query(userQuery, [
                userID, username, defaultPassword, fullName, utmID, email, 
                contactNumber || null, address || null, defaultPassword
            ], (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        console.error('Error creating user:', err);
                        res.status(500).json({ error: 'Failed to create user: ' + err.message });
                    });
                }
                
                // Insert into Student table
                const studentQuery = `
                    INSERT INTO Student (studentID, userID, faculty, yearOfStudy)
                    VALUES (?, ?, ?, ?)
                `;
                
                connection.query(studentQuery, [matricNo, userID, faculty, yearOfStudy || 1], (err, result) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            console.error('Error creating student:', err);
                            res.status(500).json({ error: 'Failed to create student record' });
                        });
                    }
                    
                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                connection.release();
                                console.error('Commit error:', err);
                                res.status(500).json({ error: 'Failed to commit transaction' });
                            });
                        }
                        
                        connection.release();
                        res.status(201).json({ 
                            success: true, 
                            message: 'Student created successfully',
                            userID,
                            matricNo,
                            defaultPassword
                        });
                    });
                });
            });
        });
    });
});

// 5. Delete Student
app.delete('/api/student/:userId', (req, res) => {
    const { userId } = req.params;
    
    pool.query('DELETE FROM User WHERE userID = ?', [userId], (err, result) => {
        if (err) {
            console.error('Error deleting student:', err);
            res.status(500).json({ error: 'Failed to delete student' });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Student not found' });
        } else {
            res.json({ success: true, message: 'Student deleted successfully' });
        }
    });
});

// ==================== ACCOUNT SETTINGS API (UC25) ====================

// 6. Get Account Settings
app.get('/api/account/:userId/settings', (req, res) => {
    const { userId } = req.params;
    
    const query = `
        SELECT * FROM UserAccountSettings WHERE userID = ?
    `;
    
    pool.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching account settings:', err);
            res.status(500).json({ error: 'Failed to fetch account settings' });
        } else if (results.length === 0) {
            res.status(404).json({ error: 'User not found' });
        } else {
            res.json(results[0]);
        }
    });
});

// 7. Update Notification Preferences
app.put('/api/account/:userId/notifications', (req, res) => {
    const { userId } = req.params;
    const preferences = req.body;
    
    console.log('Updating notification preferences for user:', userId, preferences);
    
    // Validate required fields
    const requiredFields = ['emailNotifications', 'pushNotifications', 'recycleReminders', 'pointUpdates', 'promotionalOffers'];
    const missingFields = requiredFields.filter(field => preferences[field] === undefined);
    
    if (missingFields.length > 0) {
        return res.status(400).json({ 
            error: `Missing fields: ${missingFields.join(', ')}` 
        });
    }
    
    // Convert boolean values to MySQL compatible 1/0
    const params = [
        userId,
        preferences.emailNotifications ? 1 : 0,
        preferences.pushNotifications ? 1 : 0,
        preferences.recycleReminders ? 1 : 0,
        preferences.pointUpdates ? 1 : 0,
        preferences.promotionalOffers ? 1 : 0
    ];
    
    console.log('Calling stored procedure with params:', params);
    
    const query = 'CALL UpdateNotificationPreferences(?, ?, ?, ?, ?, ?)';
    
    pool.query(query, params, (err, results) => {
        if (err) {
            console.error('Error updating notifications:', err);
            console.error('SQL Error details:', err.sqlMessage || err.message);
            
            // Fallback to direct SQL if stored procedure fails
            const fallbackQuery = `
                INSERT INTO UserNotificationSettings (
                    userID, 
                    emailNotifications, 
                    pushNotifications, 
                    recycleReminders, 
                    pointUpdates, 
                    promotionalOffers
                ) VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    emailNotifications = VALUES(emailNotifications),
                    pushNotifications = VALUES(pushNotifications),
                    recycleReminders = VALUES(recycleReminders),
                    pointUpdates = VALUES(pointUpdates),
                    promotionalOffers = VALUES(promotionalOffers),
                    updatedDateTime = NOW()
            `;
            
            pool.query(fallbackQuery, params, (fallbackErr, fallbackResults) => {
                if (fallbackErr) {
                    console.error('Fallback query also failed:', fallbackErr);
                    res.status(500).json({ 
                        error: 'Failed to update notification preferences',
                        details: fallbackErr.sqlMessage || fallbackErr.message
                    });
                } else {
                    console.log('Notification preferences updated successfully (fallback):', fallbackResults);
                    res.json({ 
                        success: true, 
                        message: 'Notification preferences updated successfully' 
                    });
                }
            });
        } else {
            console.log('Notification preferences updated successfully:', results);
            res.json({ 
                success: true, 
                message: 'Notification preferences updated successfully' 
            });
        }
    });
});

// 8. Change Password
app.put('/api/account/:userId/password', (req, res) => {
    const { userId } = req.params;
    const { currentPassword, newPassword, isAdminAction = false } = req.body;
    
    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ 
            error: 'New password must be at least 8 characters long' 
        });
    }
    
    // For students, verify current password
    if (!isAdminAction) {
        pool.query('SELECT password FROM User WHERE userID = ?', [userId], (err, results) => {
            if (err) {
                console.error('Error verifying password:', err);
                return res.status(500).json({ error: 'Failed to verify current password' });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            // Simple comparison (in production use bcrypt)
            if (results[0].password !== currentPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
            
            updatePassword(userId, newPassword, res);
        });
    } else {
        // Admin action - no password verification needed
        updatePassword(userId, newPassword, res);
    }
});

function updatePassword(userId, newPassword, res) {
    pool.query('UPDATE User SET password = ?, lastPasswordChange = NOW() WHERE userID = ?', 
        [newPassword, userId], 
        (err, result) => {
            if (err) {
                console.error('Error updating password:', err);
                res.status(500).json({ error: 'Failed to update password' });
            } else if (result.affectedRows === 0) {
                res.status(404).json({ error: 'User not found' });
            } else {
                // Save to password history
                pool.query('INSERT INTO PasswordHistory (userID, passwordHash) VALUES (?, ?)', 
                    [userId, newPassword], 
                    (err, result) => {
                        if (err) console.error('Error saving password history:', err);
                    });
                
                res.json({ 
                    success: true, 
                    message: 'Password updated successfully' 
                });
            }
        });
}

// 9. Reset Password to Default
app.post('/api/account/:userId/reset-password', (req, res) => {
    const { userId } = req.params;
    
    const query = `
        UPDATE User u
        CROSS JOIN DefaultSettings ds
        SET u.password = ds.settingValue
        WHERE u.userID = ? AND ds.settingKey = 'DEFAULT_PASSWORD'
    `;
    
    pool.query(query, [userId], (err, result) => {
        if (err) {
            console.error('Error resetting password:', err);
            res.status(500).json({ error: 'Failed to reset password' });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ error: 'User not found' });
        } else {
            res.json({ 
                success: true, 
                message: 'Password reset to default successfully',
                defaultPassword: 'password123'
            });
        }
    });
});

// 10. Logout User from All Devices
app.post('/api/account/:userId/logout-all', (req, res) => {
    const { userId } = req.params;
    
    const query = 'CALL LogoutUserFromAllDevices(?)';
    
    pool.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error logging out user:', err);
            
            // Fallback to direct SQL
            const fallbackQuery = 'UPDATE UserSessions SET isActive = FALSE WHERE userID = ? AND isActive = TRUE';
            pool.query(fallbackQuery, [userId], (fallbackErr, fallbackResults) => {
                if (fallbackErr) {
                    res.status(500).json({ error: 'Failed to logout user' });
                } else {
                    res.json({ 
                        success: true, 
                        message: `User logged out from ${fallbackResults.affectedRows} device(s)`,
                        sessionsTerminated: fallbackResults.affectedRows
                    });
                }
            });
        } else {
            const sessionsTerminated = results[0]?.[0]?.sessionsTerminated || 0;
            res.json({ 
                success: true, 
                message: `User logged out from ${sessionsTerminated} device(s)`,
                sessionsTerminated 
            });
        }
    });
});

// 11. Reset All Settings to Default
app.post('/api/account/:userId/reset-all', (req, res) => {
    const { userId } = req.params;
    
    console.log('Resetting all settings for user:', userId);
    
    const query = 'CALL ResetUserSettingsToDefault(?)';
    
    pool.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error resetting settings:', err);
            console.error('SQL Error details:', err.sqlMessage || err.message);
            
            // Fallback to direct SQL if stored procedure fails
            pool.getConnection((err, connection) => {
                if (err) {
                    console.error('Connection error:', err);
                    return res.status(500).json({ error: 'Database connection failed' });
                }
                
                connection.beginTransaction((transactionErr) => {
                    if (transactionErr) {
                        connection.release();
                        console.error('Transaction error:', transactionErr);
                        return res.status(500).json({ error: 'Transaction failed' });
                    }
                    
                    // 1. Reset notification preferences
                    const resetNotificationsQuery = `
                        UPDATE UserNotificationSettings 
                        SET 
                            emailNotifications = TRUE,
                            pushNotifications = TRUE,
                            recycleReminders = TRUE,
                            pointUpdates = TRUE,
                            promotionalOffers = FALSE,
                            updatedDateTime = NOW()
                        WHERE userID = ?
                    `;
                    
                    // 2. Reset password to default
                    const resetPasswordQuery = `
                        UPDATE User 
                        SET password = (SELECT settingValue FROM DefaultSettings WHERE settingKey = 'DEFAULT_PASSWORD')
                        WHERE userID = ?
                    `;
                    
                    // 3. Logout from all devices
                    const logoutQuery = `
                        UPDATE UserSessions 
                        SET isActive = FALSE 
                        WHERE userID = ? AND isActive = TRUE
                    `;
                    
                    connection.query(resetNotificationsQuery, [userId], (err1, result1) => {
                        if (err1) {
                            return connection.rollback(() => {
                                connection.release();
                                console.error('Error resetting notifications:', err1);
                                res.status(500).json({ error: 'Failed to reset notification preferences' });
                            });
                        }
                        
                        connection.query(resetPasswordQuery, [userId], (err2, result2) => {
                            if (err2) {
                                return connection.rollback(() => {
                                    connection.release();
                                    console.error('Error resetting password:', err2);
                                    res.status(500).json({ error: 'Failed to reset password' });
                                });
                            }
                            
                            connection.query(logoutQuery, [userId], (err3, result3) => {
                                if (err3) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        console.error('Error logging out devices:', err3);
                                        res.status(500).json({ error: 'Failed to logout devices' });
                                    });
                                }
                                
                                connection.commit((commitErr) => {
                                    if (commitErr) {
                                        return connection.rollback(() => {
                                            connection.release();
                                            console.error('Commit error:', commitErr);
                                            res.status(500).json({ error: 'Failed to commit reset operations' });
                                        });
                                    }
                                    
                                    connection.release();
                                    console.log('All settings reset successfully (fallback)');
                                    res.json({ 
                                        success: true, 
                                        message: 'All settings reset to default values'
                                    });
                                });
                            });
                        });
                    });
                });
            });
        } else {
            console.log('All settings reset successfully:', results);
            res.json({ 
                success: true, 
                message: 'All settings reset to default values'
            });
        }
    });
});

// 12. Get Current Password (Admin only)
app.get('/api/account/:userId/current-password', (req, res) => {
    const { userId } = req.params;
    
    const query = `
        SELECT password as currentPassword, defaultPassword 
        FROM User 
        WHERE userID = ?
    `;
    
    pool.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching current password:', err);
            res.status(500).json({ error: 'Failed to fetch current password' });
        } else if (results.length === 0) {
            res.status(404).json({ error: 'User not found' });
        } else {
            res.json(results[0]);
        }
    });
});

// 13. Get Notification Preferences
app.get('/api/account/:userId/notifications', (req, res) => {
    const { userId } = req.params;
    
    const query = `
        SELECT 
            emailNotifications,
            pushNotifications,
            recycleReminders,
            pointUpdates,
            promotionalOffers,
            updatedDateTime
        FROM UserNotificationSettings 
        WHERE userID = ?
    `;
    
    pool.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching notification preferences:', err);
            res.status(500).json({ error: 'Failed to fetch notification preferences' });
        } else if (results.length === 0) {
            // Return default values if not found
            res.json({
                emailNotifications: true,
                pushNotifications: true,
                recycleReminders: true,
                pointUpdates: true,
                promotionalOffers: false,
                updatedDateTime: new Date().toISOString()
            });
        } else {
            res.json(results[0]);
        }
    });
});

// 14. Get User Basic Info
app.get('/api/account/:userId/basic-info', (req, res) => {
    const { userId } = req.params;
    
    const query = `
        SELECT 
            userID,
            fullName,
            email,
            role,
            DATE_FORMAT(createdDateTime, '%Y') as memberSince,
            lastLogin
        FROM User 
        WHERE userID = ?
    `;
    
    pool.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user basic info:', err);
            res.status(500).json({ error: 'Failed to fetch user info' });
        } else if (results.length === 0) {
            res.status(404).json({ error: 'User not found' });
        } else {
            res.json(results[0]);
        }
    });
});

// ==================== ECOMAP ROUTES ====================

// Get all bins (updated for new schema)
app.get('/api/bins', (req, res) => {
    const query = `
        SELECT 
            rb.bin_id,
            rb.bin_name,
            bt.type_name,
            s.station_name,
            s.latitude,
            s.longitude,
            s.description as station_description,
            rb.status,
            rb.created_at,
            rb.updated_at
        FROM Recycling_Bins rb
        JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
        JOIN STATIONS s ON rb.station_id = s.station_id
        ORDER BY rb.bin_id
    `;
    
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        res.json(results);
    });
});

// Get bin details by ID
app.get('/api/bins/:id', (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT 
            rb.bin_id,
            rb.bin_name,
            bt.type_name,
            bt.description AS bin_type_description,
            s.latitude,          
            s.longitude,         
            s.description as station_description,
            rb.status,
            rb.created_at,
            rb.updated_at
        FROM Recycling_Bins rb
        JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
        JOIN STATIONS s ON rb.station_id = s.station_id
        WHERE rb.bin_id = ?
    `;
    
    pool.query(query, [id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Bin not found' });
        }
        
        res.json(results[0]);
    });
});

// Get nearby bins
app.get('/api/bins/nearby', (req, res) => {
    const { lat, lng, radius = 2 } = req.query;
    
    if (!lat || !lng) {
        return res.status(400).json({ 
            error: 'Missing parameters', 
            message: 'Please provide latitude and longitude' 
        });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const searchRadius = parseFloat(radius);

    const query = `
        SELECT 
            s.station_id,
            s.station_name,
            rb.bin_id,
            rb.bin_name,
            bt.type_name,
            s.latitude,
            s.longitude,
            s.description as station_description,
            rb.status,
            (
                6371 * acos(
                    cos(radians(?)) * cos(radians(s.latitude)) * 
                    cos(radians(s.longitude) - radians(?)) + 
                    sin(radians(?)) * sin(radians(s.latitude))
                )
            ) AS distance_km
        FROM STATIONS s
        JOIN Recycling_Bins rb ON s.station_id = rb.station_id
        JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
        HAVING distance_km <= ?
        ORDER BY distance_km, s.station_name, bt.type_name
        LIMIT 50
    `;
    
    pool.query(query, [latitude, longitude, latitude, searchRadius], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        const formattedResults = results.map(bin => ({
            ...bin,
            distance_km: parseFloat(bin.distance_km).toFixed(2),
            latitude: parseFloat(bin.latitude),
            longitude: parseFloat(bin.longitude)
        }));
        
        res.json(formattedResults);
    });
});

// Get all bin types
app.get('/api/bins/types', (req, res) => {
    const query = 'SELECT * FROM Bin_Types ORDER BY type_name';
    
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        res.json(results);
    });
});

// Update bin status using stored procedure
app.put('/api/bins/:id/status', async (req, res) => {
    const binId = req.params.id;
    const { status } = req.body;
    
    if (!status) {
        return res.status(400).json({ 
            success: false,
            error: 'Missing status field'
        });
    }
    
    const validStatuses = ['Active', 'Full', 'Under Maintenance'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
            success: false,
            error: 'Invalid status',
            valid_statuses: validStatuses
        });
    }
    
    try {
        await pool.promise().query(
            'CALL UpdateBinStatus(?, ?, @message)',
            [binId, status]
        );
        
        const [output] = await pool.promise().query('SELECT @message as message');
        const { message } = output[0];
        
        if (message.startsWith('Error:')) {
            return res.status(400).json({
                success: false,
                error: message
            });
        }
        
        const success = message.startsWith('Success:');
        
        res.json({
            success: success,
            message: message,
            status: status,
            updated_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Database error', 
            details: err.message 
        });
    }
});

// Find stations with multiple bin types
app.post('/api/stations/find', (req, res) => {
    const { latitude, longitude, binTypes, radius = 1000.0 } = req.body;
    
    if (!latitude || !longitude || !binTypes) {
        return res.status(400).json({ 
            error: 'Missing parameters', 
            message: 'Please provide latitude, longitude, and binTypes' 
        });
    }
    
    const typesString = Array.isArray(binTypes) ? binTypes.join(',') : binTypes;
    
    console.log(`Finding stations with types: ${typesString} at (${latitude}, ${longitude}) within ${radius}km`);
    
    const procedureQuery = 'CALL FindStationsWithBinTypes(?, ?, ?, ?)';
    
    pool.query(procedureQuery, [latitude, longitude, typesString, radius], (err, results) => {
        if (err) {
            console.error('Stored procedure error:', err);
            return res.status(500).json({ 
                error: 'Database error', 
                details: err.message 
            });
        }
        
        const stations = results[0] || [];
        
        console.log(`Found ${stations.length} stations`);
        
        if (stations.length === 0) {
            return res.json([]);
        }
        
        const formattedStations = stations.map(station => ({
            station_id: station.station_id,
            station_name: station.station_name,
            latitude: parseFloat(station.latitude || 0),
            longitude: parseFloat(station.longitude || 0),
            station_description: station.station_description || station.location_description || 'Recycling Station',
            total_bins: parseInt(station.total_bins_at_station || 0),
            available_types: station.available_bin_types || '',
            distance_km: parseFloat(station.distance_km || 0),
            bin_details: station.bin_details || '',
            status_summary: station.status_summary || ''
        }));
        
        res.json(formattedStations);
    });
});

// Get all recycling stations
app.get('/api/stations', (req, res) => {
    const query = `
        SELECT 
            station_id,
            station_name,
            latitude,
            longitude,
            description,
            total_bins,
            available_types,
            active_bins,
            full_bins,
            maintenance_bins
        FROM Station_Details
        ORDER BY station_name
    `;
    
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        const formattedStations = results.map(station => ({
            station_id: station.station_id,
            station_name: station.station_name,
            latitude: parseFloat(station.latitude),
            longitude: parseFloat(station.longitude),
            description: station.description,
            total_bins: parseInt(station.total_bins || 0),
            available_types: station.available_types || '',
            active_bins: parseInt(station.active_bins || 0),
            full_bins: parseInt(station.full_bins || 0),
            maintenance_bins: parseInt(station.maintenance_bins || 0)
        }));
        
        res.json(formattedStations);
    });
});

// Get station by ID
app.get('/api/stations/:id', (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT 
            s.*,
            GROUP_CONCAT(DISTINCT CONCAT(rb.bin_name, ' (', bt.type_name, ')') SEPARATOR '; ') as bins
        FROM STATIONS s
        LEFT JOIN Recycling_Bins rb ON s.station_id = rb.station_id
        LEFT JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
        WHERE s.station_id = ?
        GROUP BY s.station_id
    `;
    
    pool.query(query, [id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Station not found' });
        }
        
        res.json(results[0]);
    });
});

// Get bins at a specific station
app.get('/api/stations/:id/bins', (req, res) => {
    const { id } = req.params;
    console.log('📡 GET /api/stations/' + id + '/bins requested');
    
    const query = `
        SELECT 
            rb.bin_id,
            rb.bin_name,
            bt.type_name,
            bt.description as type_description,
            rb.status,
            rb.created_at,
            rb.updated_at
        FROM Recycling_Bins rb
        JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
        WHERE rb.station_id = ?
        ORDER BY bt.type_name
    `;
    
    console.log('📊 Executing query with station_id:', id);
    
    pool.query(query, [id], (err, results) => {
        if (err) {
            console.error('❌ Database error:', err.message);
            console.error('❌ Full error:', err);
            return res.status(500).json({ 
                error: 'Database error', 
                details: err.message 
            });
        }
        
        console.log('✅ Query results:', results.length, 'bins found');
        res.json(results);
    });
});

// Add new station
app.post('/api/stations', async (req, res) => {
    const { station_name, latitude, longitude, description } = req.body;
    
    if (!station_name || !latitude || !longitude) {
        return res.status(400).json({ 
            success: false,
            error: 'Missing required fields',
            required: ['station_name', 'latitude', 'longitude']
        });
    }
    
    try {
        const [result] = await pool.promise().query(
            'CALL AddNewStation(?, ?, ?, ?, @station_id, @message)',
            [station_name, latitude, longitude, description || null]
        );
        
        const [output] = await pool.promise().query('SELECT @station_id as station_id, @message as message');
        const { station_id, message } = output[0];
        
        if (message.startsWith('Error:')) {
            return res.status(400).json({
                success: false,
                error: message
            });
        }
        
        res.json({
            success: true,
            message: message,
            station_id: station_id
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Database error', 
            details: err.message 
        });
    }
});

// Add bin to station
app.post('/api/stations/:id/bins', async (req, res) => {
    const stationId = req.params.id;
    const { bin_type_id, bin_name, status = 'Active' } = req.body;
    
    if (!bin_type_id || !bin_name) {
        return res.status(400).json({ 
            success: false,
            error: 'Missing required fields',
            required: ['bin_type_id', 'bin_name']
        });
    }
    
    try {
        await pool.promise().query(
            'CALL AddBinToStation(?, ?, ?, ?, @bin_id, @message)',
            [stationId, bin_type_id, bin_name, status]
        );
        
        const [output] = await pool.promise().query('SELECT @bin_id as bin_id, @message as message');
        const { bin_id, message } = output[0];
        
        if (message.startsWith('Error:')) {
            return res.status(400).json({
                success: false,
                error: message
            });
        }
        
        res.json({
            success: true,
            message: message,
            bin_id: bin_id
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            success: false,
            error: 'Database error', 
            details: err.message 
        });
    }
});

// Report bin issue
app.post('/api/issues/report', (req, res) => {
    const { bin_id, userID, issue_type, description, photo_url } = req.body;
    
    console.log('🔵 Received report request:', { 
        bin_id, 
        userID, 
        issue_type, 
        description, 
        photo_url,
    });
    
    // Validation
    if (!userID || !issue_type) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ 
            success: false,
            error: 'Missing required fields',
            required: ['userID', 'issue_type']
        });
    }
    
    const validIssueTypes = ['Full', 'Damaged', 'Misplaced', 'Inaccessible', 'Other'];
    if (!validIssueTypes.includes(issue_type)) {
        console.log('❌ Invalid issue type:', issue_type);
        return res.status(400).json({ 
            success: false,
            error: 'Invalid issue type',
            valid_types: validIssueTypes 
        });
    }
    
    if (bin_id && bin_id !== 0) {
        let actualBinId;
        
        if (typeof bin_id === 'string' && bin_id.includes('station')) {
            console.log('❌ Cannot report station bin without valid bin_id');
            return res.status(400).json({ 
                success: false,
                error: 'Cannot report station bin issue',
                message: 'Please select a specific bin at the station to report'
            });
        } else {
            actualBinId = parseInt(bin_id);
            if (isNaN(actualBinId) || actualBinId <= 0) {
                console.log('❌ Invalid bin_id format:', bin_id);
                return res.status(500).json({ 
                    success: false,
                    error: 'Invalid bin ID format',
                    message: 'Bin ID must be a valid positive number'
                });
            }
        }
        
        // FIXED VERSION - Change userID to user_id
        const query = `
            INSERT INTO Bin_Issues 
            (bin_id, user_id, issue_type, description, photo_url, status, reported_at)
            VALUES (?, ?, ?, ?, ?, 'Pending', NOW())
        `;
        
        console.log('📝 Executing query for bin report:', {
            bin_id: actualBinId,
            userID,
            issue_type,
            description: description ? 'Provided' : 'None',
            photo_url: photo_url ? 'Provided' : 'None'
        });
        
        pool.query(query, [
            actualBinId, 
            userID, 
            issue_type, 
            description || null, 
            photo_url || null
        ], (err, result) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                console.error('❌ SQL Error:', err.sql);
                return res.status(500).json({ 
                    success: false,
                    error: 'Database error',
                    details: err.message,
                    sql: err.sql
                });
            }
            
            console.log('✅ Report submitted successfully. Issue ID:', result.insertId);
            
            res.json({ 
                success: true, 
                message: 'Bin issue reported successfully!',
                data: {
                    issue_id: result.insertId,
                    bin_id: actualBinId,
                    issue_type,
                    status: 'Pending',
                    reported_at: new Date().toISOString()
                }
            });
        });
    } else {
        console.log('❌ No valid bin_id provided');
        return res.status(400).json({ 
            success: false,
            error: 'No bin selected',
            message: 'Please select a specific bin to report an issue'
        });
    }
});

// Get recent issues
app.get('/api/issues/recent', (req, res) => {
    const query = `
        SELECT 
            bi.*,
            rb.bin_name,
            bt.type_name,
            s.station_name,
            s.latitude,
            s.longitude
        FROM Bin_Issues bi
        JOIN Recycling_Bins rb ON bi.bin_id = rb.bin_id
        JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
        JOIN STATIONS s ON rb.station_id = s.station_id
        WHERE bi.reported_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY bi.reported_at DESC
        LIMIT 20
    `;
    
    pool.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        res.json(results);
    });
});

// Get bin statistics for dashboard
app.get('/api/statistics', (req, res) => {
    const procedureQuery = 'CALL GetBinStatistics()';
    
    pool.query(procedureQuery, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        
        const [statusStats, stationStats, issueStats, issueTypeStats] = results;
        
        res.json({
            bin_status: statusStats[0] || [],
            station_count: stationStats[0] || [],
            issue_status: issueStats[0] || [],
            issue_types: issueTypeStats[0] || []
        });
    });
});

// Test stored procedure (optional - for development)
app.get('/api/test/procedure', (req, res) => {
    const testLat = 1.564145;
    const testLng = 103.638011;
    const testTypes = 'Plastic,Paper';
    const testRadius = 1.0;
    
    const procedureQuery = 'CALL FindStationsWithBinTypes(?, ?, ?, ?)';
    
    pool.query(procedureQuery, [testLat, testLng, testTypes, testRadius], (err, results) => {
        if (err) {
            console.error('Stored procedure test error:', err);
            return res.status(500).json({ 
                error: 'Stored procedure error', 
                details: err.message 
            });
        }
        
        const stations = results[0] || [];
        
        res.json({
            message: 'Stored procedure test successful',
            parameters: {
                latitude: testLat,
                longitude: testLng,
                types: testTypes,
                radius: testRadius
            },
            stations_found: stations.length,
            stations: stations.map(s => ({
                latitude: s.latitude,
                longitude: s.longitude,
                location: s.location_description,
                available_types: s.available_bin_types,
                distance: s.distance_km
            }))
        });
    });
});

// ==================== YOUR MODULE ROUTES ====================

// Database test endpoint from your module
app.get('/api/test-db', async (req, res) => {
    try {
        // Test multiple queries using the main pool
        const [users] = await db.execute('SELECT COUNT(*) as count FROM User');
        const [students] = await db.execute('SELECT COUNT(*) as count FROM Student');
        const [conversions] = await db.execute('SELECT COUNT(*) as count FROM conversion_history');
        
        res.json({
            success: true,
            data: {
                users: users[0].count,
                students: students[0].count,
                conversions: conversions[0].count,
                database: 'utm_remerit'
            }
        });
    } catch (error) {
        console.error('Database test error:', error);
        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Test leaderboard data
app.get('/api/test-leaderboard', async (req, res) => {
    try {
        const [weekly] = await db.execute('SELECT * FROM weekly_leaderboard LIMIT 5');
        const [hallOfFame] = await db.execute('SELECT * FROM hall_of_fame LIMIT 3');
        
        res.json({
            success: true,
            data: {
                weeklyLeaderboard: weekly,
                hallOfFame: hallOfFame,
                totalRecords: weekly.length
            }
        });
    } catch (error) {
        console.error('Leaderboard test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leaderboard data',
            error: error.message
        });
    }
});

// Test John Doe data
app.get('/api/test-john', async (req, res) => {
    try {
        const [johnData] = await db.execute(`
            SELECT 
                u.fullName,
                s.studentID,
                s.faculty,
                s.totalPoints,
                s.totalMerits,
                (SELECT COUNT(*) FROM conversion_history ch WHERE ch.student_id = s.studentID) as total_conversions
            FROM Student s
            JOIN User u ON s.userID = u.userID
            WHERE s.studentID = 'A23CS0001'
        `);
        
        res.json({
            success: true,
            data: johnData[0] || null
        });
    } catch (error) {
        console.error('John Doe test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch John Doe data',
            error: error.message
        });
    }
});

// Mount your module routes
app.use('/api/leaderboard', (req, res, next) => {
    req.db = db; // Attach the promise-based db to the request
    next();
}, leaderboardRoutes);
app.use('/api/rewards', (req, res, next) => {
    req.db = db;
    next();
}, rewardRoutes);

app.use('/api/conversions', (req, res, next) => {
    req.db = db;
    next();
}, conversionRoutes);

// ===================== ROOT ROUTE =====================
app.get('/', (req, res) => {
    res.json({
        message: 'UTM ReMerit Backend API',
        version: '2.0.0',
        combined: true,
        endpoints: {
            health: '/health, /api/health',
            events: '/events',
            participation: '/participation/*',
            profile: '/api/profile/:userId',
            students: '/api/students',
            account: '/api/account/:userId/*',
            ecomap: '/api/*',
            analytics: '/api/module3/*',
            leaderboard: '/api/leaderboard/*',
            rewards: '/api/rewards/*',
            conversions: '/api/conversions/*',
            testing: '/api/test-db, /api/test-leaderboard, /api/test-john'
        }
    });
});

// ==================== EVENT MANAGEMENT ROUTES ====================
// Mount event routes
app.use('/events', eventRoutes);

// ==================== MODULE 3 ROUTES ====================
app.use('/api/module3', advancedAnalyticsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    console.log(`404 - ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.originalUrl,
        availableEndpoints: [
            'GET /',
            'GET /health',
            'GET /api/health',
            'GET /api/profile/:userId',
            'PUT /api/profile/:userId',
            'GET /api/students',
            'POST /api/students',
            'DELETE /api/student/:userId',
            'GET /api/account/:userId/settings',
            'GET /api/account/:userId/basic-info',
            'GET /api/account/:userId/notifications',
            'PUT /api/account/:userId/notifications',
            'PUT /api/account/:userId/password',
            'GET /api/account/:userId/current-password',
            'POST /api/account/:userId/reset-password',
            'POST /api/account/:userId/reset-all',
            'POST /api/account/:userId/logout-all',
            'GET /api/bins',
            'GET /api/bins/:id',
            'PUT /api/bins/:id/status',
            'GET /api/bins/nearby',
            'GET /api/bins/types',
            'GET /api/stations',
            'GET /api/stations/:id',
            'GET /api/stations/:id/bins',
            'POST /api/stations',
            'POST /api/stations/:id/bins',
            'POST /api/stations/find',
            'POST /api/issues/report',
            'GET /api/issues/recent',
            'GET /api/statistics',
            'GET /api/test/procedure',
            'GET /events',
            'POST /events',
            'PUT /events/:id',
            'DELETE /events/:id',
            'GET /events/:id/registrations',
            'POST /events/:id/upload',
            'GET /api/test-db',
            'GET /api/test-john',
            'GET /api/test-leaderboard',
            'GET /api/leaderboard/weekly',
            'GET /api/leaderboard/hall-of-fame',
            'GET /api/leaderboard/current-user/:studentID',
            'GET /api/rewards/user/:studentID',
            'POST /api/rewards/convert',
            'GET /api/conversions/pending',
            'GET /api/conversions/history',
            'POST /api/conversions/approve',
            'POST /api/conversions/reject',
            'GET /api/conversions/settings',
            'PUT /api/conversions/settings/conversion-rate',
            'POST /api/module3/*'
        ]
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🚀 UTM ReMerit Backend Server v2.0.0
    =====================================
    📍 Port:     ${PORT}
    📡 Access:   http://10.0.2.2:${PORT}
    📱 Mobile:   http://10.0.2.2:${PORT} (Android emulator)
    
    📊 Database: utm_remerit
    🌐 Environment: ${process.env.NODE_ENV || 'development'}
    
    🔗 Test Endpoints:
        http://10.0.2.2:${PORT}/api/health
        http://10.0.2.2:${PORT}/api/test-db
        http://10.0.2.2:${PORT}/api/test-john
    
    📁 File uploads directory: ${path.join(__dirname, 'uploads')}
    
    🌟 Combined Features:
    ✅ Main Module: Events, Participation, Profile, EcoMap
    ✅ Your Module: Leaderboard, Rewards, Conversions
    ✅ Event Management Module
    ✅ Module 3 Analytics
    
    🚀 Server successfully combined and running!
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});