const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MySQL Database Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'utm_remerit',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('✅ Connected to MySQL database: utm_remerit');
  }
});

// ==================== VALIDATION FUNCTIONS ====================

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

// ==================== PROFILE MANAGEMENT API (UC23, UC24) ====================

// 1. Get Student Profile with Details
app.get('/api/profile/:userId', (req, res) => {
  const { userId } = req.params;
  
  const query = `
    SELECT * FROM StudentProfileView WHERE userID = ?
  `;
  
  db.query(query, [userId], (err, results) => {
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
  const studentFields = ['faculty'];
  const userFields = ['email', 'contactNumber', 'address', 'profilePicture'];
  
  const userUpdates = {};
  const studentUpdates = {};
  
  Object.keys(updates).forEach(key => {
    if (studentFields.includes(key)) {
      studentUpdates[key] = updates[key];
    } else if (userFields.includes(key)) {
      userUpdates[key] = updates[key];
    }
  });
  
  db.beginTransaction((err) => {
    if (err) {
      console.error('Transaction error:', err);
      return res.status(500).json({ error: 'Transaction failed' });
    }
    
    const promises = [];
    
    // Update User table
    if (Object.keys(userUpdates).length > 0) {
      promises.push(new Promise((resolve, reject) => {
        db.query('UPDATE User SET ? WHERE userID = ?', [userUpdates, userId], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      }));
    }
    
    // Update Student table
    if (Object.keys(studentUpdates).length > 0) {
      promises.push(new Promise((resolve, reject) => {
        db.query('UPDATE Student SET ? WHERE userID = ?', [studentUpdates, userId], (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      }));
    }
    
    Promise.all(promises)
      .then(() => {
        db.commit((err) => {
          if (err) {
            db.rollback(() => {
              console.error('Commit error:', err);
              res.status(500).json({ error: 'Failed to save changes' });
            });
          } else {
            res.json({ 
              success: true, 
              message: 'Profile updated successfully',
              updatedFields: updates
            });
          }
        });
      })
      .catch(err => {
        db.rollback(() => {
          console.error('Update error:', err);
          res.status(500).json({ error: 'Failed to update profile' });
        });
      });
  });
});

// 3. Get All Students (for Admin)
app.get('/api/students', (req, res) => {
  const query = `
    SELECT * FROM StudentProfileView ORDER BY fullName
  `;
  
  db.query(query, (err, results) => {
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
  const { utmID, fullName, email, faculty, matricNo, contactNumber, address } = req.body;
  
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
  
  db.beginTransaction((err) => {
    if (err) {
      console.error('Transaction error:', err);
      return res.status(500).json({ error: 'Transaction failed' });
    }
    
    // Insert into User table
    const userQuery = `
      INSERT INTO User (userID, username, password, fullName, utmID, email, role, contactNumber, address, defaultPassword)
      VALUES (?, ?, ?, ?, ?, ?, 'student', ?, ?, ?)
    `;
    
    db.query(userQuery, [
      userID, username, defaultPassword, fullName, utmID, email, 
      contactNumber || null, address || null, defaultPassword
    ], (err, result) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error creating user:', err);
          res.status(500).json({ error: 'Failed to create user: ' + err.message });
        });
      }
      
      // Insert into Student table
      const studentQuery = `
        INSERT INTO Student (studentID, userID, faculty)
        VALUES (?, ?, ?)
      `;
      
      db.query(studentQuery, [matricNo, userID, faculty], (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error creating student:', err);
            res.status(500).json({ error: 'Failed to create student record' });
          });
        }
        
        db.commit((err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Commit error:', err);
              res.status(500).json({ error: 'Failed to commit transaction' });
            });
          }
          
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

// 5. Delete Student
app.delete('/api/student/:userId', (req, res) => {
  const { userId } = req.params;
  
  db.query('DELETE FROM User WHERE userID = ?', [userId], (err, result) => {
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
  
  db.query(query, [userId], (err, results) => {
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
  
  db.query(query, params, (err, results) => {
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
      
      db.query(fallbackQuery, params, (fallbackErr, fallbackResults) => {
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
    db.query('SELECT password FROM User WHERE userID = ?', [userId], (err, results) => {
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
  db.query('UPDATE User SET password = ?, lastPasswordChange = NOW() WHERE userID = ?', 
    [newPassword, userId], 
    (err, result) => {
      if (err) {
        console.error('Error updating password:', err);
        res.status(500).json({ error: 'Failed to update password' });
      } else if (result.affectedRows === 0) {
        res.status(404).json({ error: 'User not found' });
      } else {
        // Save to password history
        db.query('INSERT INTO PasswordHistory (userID, passwordHash) VALUES (?, ?)', 
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
  
  db.query(query, [userId], (err, result) => {
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
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error logging out user:', err);
      
      // Fallback to direct SQL
      const fallbackQuery = 'UPDATE UserSessions SET isActive = FALSE WHERE userID = ? AND isActive = TRUE';
      db.query(fallbackQuery, [userId], (fallbackErr, fallbackResults) => {
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
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error resetting settings:', err);
      console.error('SQL Error details:', err.sqlMessage || err.message);
      
      // Fallback to direct SQL if stored procedure fails
      db.beginTransaction((transactionErr) => {
        if (transactionErr) {
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
        
        db.query(resetNotificationsQuery, [userId], (err1, result1) => {
          if (err1) {
            return db.rollback(() => {
              console.error('Error resetting notifications:', err1);
              res.status(500).json({ error: 'Failed to reset notification preferences' });
            });
          }
          
          db.query(resetPasswordQuery, [userId], (err2, result2) => {
            if (err2) {
              return db.rollback(() => {
                console.error('Error resetting password:', err2);
                res.status(500).json({ error: 'Failed to reset password' });
              });
            }
            
            db.query(logoutQuery, [userId], (err3, result3) => {
              if (err3) {
                return db.rollback(() => {
                  console.error('Error logging out devices:', err3);
                  res.status(500).json({ error: 'Failed to logout devices' });
                });
              }
              
              db.commit((commitErr) => {
                if (commitErr) {
                  return db.rollback(() => {
                    console.error('Commit error:', commitErr);
                    res.status(500).json({ error: 'Failed to commit reset operations' });
                  });
                }
                
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
  
  db.query(query, [userId], (err, results) => {
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
  
  db.query(query, [userId], (err, results) => {
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
  
  db.query(query, [userId], (err, results) => {
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

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  db.query('SELECT 1 as status', (err, results) => {
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

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`📊 API Endpoints:`);
  console.log(`   GET  /api/profile/:userId`);
  console.log(`   PUT  /api/profile/:userId`);
  console.log(`   GET  /api/students`);
  console.log(`   POST /api/students`);
  console.log(`   GET  /api/account/:userId/settings`);
  console.log(`   PUT  /api/account/:userId/notifications`);
  console.log(`   PUT  /api/account/:userId/password`);
  console.log(`   POST /api/account/:userId/reset-all`);
  console.log(`   GET  /api/account/:userId/current-password`);
  console.log(`   GET  /api/account/:userId/notifications`);
});