const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../db');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

router.get('/', async (req, res) => {
  try {
    const sql = `SELECT 
      e.*, 
      a.adminName 
      FROM Event e 
      LEFT JOIN Administrator a ON e.createdBy = a.adminID 
      ORDER BY e.eventStartDate DESC, e.createdAt DESC`;
    
    const [results] = await db.promise().query(sql);
    console.log(`✅ Fetched ${results.length} events`);
    res.json(results);
  } catch (err) {
    console.error('❌ Error fetching events:', err);
    res.status(500).json({ 
      message: 'Failed to fetch events', 
      error: err.message 
    });
  }
});

// GET single event by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `SELECT 
      e.*, 
      a.adminName 
      FROM Event e 
      LEFT JOIN Administrator a ON e.createdBy = a.adminID 
      WHERE e.eventID = ?`;
    
    const [results] = await db.promise().query(sql, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.json(results[0]);
  } catch (err) {
    console.error('❌ Error fetching event:', err);
    res.status(500).json({ 
      message: 'Failed to fetch event', 
      error: err.message 
    });
  }
});

router.post('/create', async (req, res) => {
  try {
    console.log('📝 Received event creation request body:', req.body);
    
    const { 
      eventTitle, 
      eventDescription, 
      eventCategory, 
      eventStartDate, 
      eventEndDate, 
      rewardPoints, 
      UTMMeritPoints,
      createdBy,
      eventImageBase64,
      imageType 
    } = req.body;

    // Validation
    if (!eventTitle || !eventStartDate || !createdBy) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        message: 'Required fields missing: Title, Start Date, and CreatedBy are required' 
      });
    }

    let eventImageURL = null;

    // Handle base64 image
    if (eventImageBase64) {
      console.log('📷 Processing base64 image, size:', eventImageBase64.length);
      
      try {
        // Convert base64 to buffer and save as file
        const imageBuffer = Buffer.from(eventImageBase64, 'base64');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `event-${uniqueSuffix}.jpg`;
        const filePath = path.join(__dirname, '../uploads', filename);
        
        // Save the file
        fs.writeFileSync(filePath, imageBuffer);
        console.log('✅ Image saved to:', filePath);
        
        eventImageURL = `/uploads/${filename}`;
      } catch (fileError) {
        console.error('❌ Error saving image file:', fileError);
        // Continue without image if file save fails
      }
    }

    const sql = `INSERT INTO Event 
      (eventTitle, eventDescription, eventCategory, eventStartDate, eventEndDate, rewardPoints, UTMMeritPoints, eventImageURL, createdBy, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Upcoming')`;

    const values = [
      eventTitle, 
      eventDescription || '', 
      eventCategory || 'General', 
      eventStartDate, 
      eventEndDate || eventStartDate,
      parseInt(rewardPoints) || 0, 
      parseInt(UTMMeritPoints) || 0, 
      eventImageURL,
      createdBy
    ];
    
    console.log('🔄 Executing SQL with values:', values);

    const [result] = await db.promise().query(sql, values);
    console.log('✅ Event created successfully, ID:', result.insertId);
    
    // Fetch the created event
    const selectSql = `SELECT 
      e.*, 
      a.adminName 
      FROM Event e 
      LEFT JOIN Administrator a ON e.createdBy = a.adminID 
      WHERE e.eventID = ?`;
      
    const [selectResults] = await db.promise().query(selectSql, [result.insertId]);
    
    res.json({ 
      message: 'Event created successfully', 
      event: selectResults[0] 
    });
    
  } catch (err) {
    console.error('❌ MySQL Error creating event:', err);
    console.error('❌ Error code:', err.code);
    console.error('❌ Error message:', err.message);
    
    res.status(500).json({ 
      message: 'Database error', 
      error: err.sqlMessage || err.message,
      code: err.code
    });
  }
});

router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      eventTitle, 
      eventDescription, 
      eventCategory, 
      eventStartDate, 
      eventEndDate, 
      rewardPoints, 
      UTMMeritPoints,
      status,
      eventImageBase64,
      imageType 
    } = req.body;

    console.log(`🔄 Updating event ${id}:`, req.body);

    // Check if event exists
    const checkSql = `SELECT * FROM Event WHERE eventID = ?`;
    const [checkResults] = await db.promise().query(checkSql, [id]);
    
    if (checkResults.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const currentEvent = checkResults[0];
    
    let eventImageURL = currentEvent.eventImageURL;
    if (eventImageBase64) {
      console.log('📷 Processing base64 image for update, size:', eventImageBase64.length);
      
      try {
        // Convert base64 to buffer and save as file
        const imageBuffer = Buffer.from(eventImageBase64, 'base64');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = `event-${uniqueSuffix}.jpg`;
        const filePath = path.join(__dirname, '../uploads', filename);
        
        fs.writeFileSync(filePath, imageBuffer);
        console.log('✅ Image saved to:', filePath);
        
        eventImageURL = `/uploads/${filename}`;
      } catch (fileError) {
        console.error('❌ Error saving image file:', fileError);
        // Continue with existing image if file save fails
      }
    }

    const sql = `UPDATE Event SET 
      eventTitle = ?, 
      eventDescription = ?, 
      eventCategory = ?, 
      eventStartDate = ?, 
      eventEndDate = ?, 
      rewardPoints = ?, 
      UTMMeritPoints = ?, 
      eventImageURL = ?,
      status = ?,
      updatedAt = CURRENT_TIMESTAMP 
      WHERE eventID = ?`;

    const values = [
      eventTitle || currentEvent.eventTitle,
      eventDescription !== undefined ? eventDescription : currentEvent.eventDescription,
      eventCategory || currentEvent.eventCategory,
      eventStartDate || currentEvent.eventStartDate,
      eventEndDate !== undefined ? eventEndDate : currentEvent.eventEndDate,
      rewardPoints !== undefined ? rewardPoints : currentEvent.rewardPoints,
      UTMMeritPoints !== undefined ? UTMMeritPoints : currentEvent.UTMMeritPoints,
      eventImageURL,
      status || currentEvent.status,
      id
    ];

    const [result] = await db.promise().query(sql, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    console.log('✅ Event updated successfully');
    
    res.json({ 
      message: 'Event updated successfully'
    });
    
  } catch (err) {
    console.error('❌ Error updating event:', err);
    res.status(500).json({ 
      message: 'Failed to update event', 
      error: err.message 
    });
  }
});

// DELETE Event
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting event ${id}`);

    // Check if event exists
    const checkSql = `SELECT * FROM Event WHERE eventID = ?`;
    const [checkResults] = await db.promise().query(checkSql, [id]);
    
    if (checkResults.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const sql = `DELETE FROM Event WHERE eventID = ?`;
    const [result] = await db.promise().query(sql, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    console.log('✅ Event deleted successfully');
    res.json({ 
      message: 'Event deleted successfully',
      deletedEventID: id 
    });
    
  } catch (err) {
    console.error('❌ Error deleting event:', err);
    res.status(500).json({ 
      message: 'Failed to delete event', 
      error: err.message 
    });
  }
});


module.exports = router;
