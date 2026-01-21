const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
// Remove the incorrect import and create local db connection

// Configure uploads directory
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper function to get full image URL
function getFullImageURL(imageURL) {
  if (!imageURL) return null;
  if (imageURL.startsWith('http')) return imageURL;
  
  // For React Native Android emulator access
  return `http://10.0.2.2:3000${imageURL}`;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
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

// GET all events
router.get('/', async (req, res) => {
  try {
    // Use the db from server.js (attached via middleware)
    const db = req.db || getDBConnection();
    
    const sql = `SELECT 
      e.*, 
      u.fullName as adminName 
      FROM Event e 
      LEFT JOIN Admin a ON e.createdBy = a.adminID 
      LEFT JOIN User u ON a.userID = u.userID 
      ORDER BY e.eventStartDate DESC, e.createdAt DESC`;
    
    const [results] = await db.query(sql);
    console.log(`✅ Fetched ${results.length} events`);
    
    const events = results.map(event => ({
      ...event,
      adminName: event.adminName || 'Admin',
      eventImageURL: getFullImageURL(event.eventImageURL)
    }));
    
    res.json(events);
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
    const db = req.db || getDBConnection();
    const { id } = req.params;
    const sql = `SELECT 
      e.*, 
      u.fullName as adminName 
      FROM Event e 
      LEFT JOIN Admin a ON e.createdBy = a.adminID 
      LEFT JOIN User u ON a.userID = u.userID 
      WHERE e.eventID = ?`;
    
    const [results] = await db.query(sql, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const event = results[0];
    event.adminName = event.adminName || 'Admin';
    event.eventImageURL = getFullImageURL(event.eventImageURL);
    
    res.json(event);
  } catch (err) {
    console.error('❌ Error fetching event:', err);
    res.status(500).json({ 
      message: 'Failed to fetch event', 
      error: err.message 
    });
  }
});

// CREATE Event with base64 image
router.post('/create', async (req, res) => {
  try {
    console.log('📝 Creating event with data:', JSON.stringify(req.body, null, 2));
    
    const db = req.db || getDBConnection();
    const { 
      eventTitle, eventDescription, eventCategory, eventStartDate, eventEndDate,
      rewardPoints, UTMMeritPoints, createdBy, eventImageBase64, imageType
    } = req.body;

    // Validate required fields
    if (!eventTitle || !eventStartDate || !createdBy) {
      console.log('❌ Missing required fields:', { eventTitle, eventStartDate, createdBy });
      return res.status(400).json({ 
        message: 'Required fields missing: Title, Start Date, and CreatedBy are required' 
      });
    }

    console.log('🔍 Validating admin:', createdBy);
    
    // Validate admin exists
    const [adminExists] = await db.query(
      'SELECT adminID FROM Admin WHERE adminID = ?', 
      [createdBy]
    );
    
    if (adminExists.length === 0) {
      console.log(`❌ Admin ${createdBy} does not exist`);
      return res.status(400).json({ 
        message: `Admin ${createdBy} does not exist.`,
        suggestion: 'Make sure you are logged in as an admin'
      });
    }

    console.log('✅ Admin validated');
    
    // Handle image
    // Handle image
let eventImageURL = null;

if (eventImageBase64 && eventImageBase64.trim() !== '') {
  console.log('🖼️ Processing image');
  
  if (eventImageBase64.startsWith('http')) {
    eventImageURL = eventImageBase64;
    console.log('✅ Using external image URL:', eventImageURL);
  } else {
    try {
      let imageBuffer;
      let fileExtension = '.jpg'; // Default
      
      // Get file extension from imageType
      if (imageType) {
        if (imageType.includes('png')) {
          fileExtension = '.png';
        } else if (imageType.includes('jpeg') || imageType.includes('jpg')) {
          fileExtension = '.jpg';
        } else if (imageType.includes('gif')) {
          fileExtension = '.gif';
        } else if (imageType.includes('webp')) {
          fileExtension = '.webp';
        }
      }
      
      // Decode base64
      if (eventImageBase64.includes('base64,')) {
        const base64Data = eventImageBase64.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(base64Data, 'base64');
        console.log('📸 Decoded base64 image data with data URL prefix');
      } else {
        imageBuffer = Buffer.from(eventImageBase64, 'base64');
        console.log('📸 Decoded raw base64 image data');
      }
      
      // Generate filename
      const filename = `event-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
      const filePath = path.join(uploadsDir, filename);
      
      console.log(`💾 Saving image to: ${filePath}`);
      fs.writeFileSync(filePath, imageBuffer);
      
      eventImageURL = `/uploads/${filename}`;
      console.log('✅ Image saved:', eventImageURL);
      
    } catch (imageError) {
      console.error('❌ Error processing image:', imageError);
      return res.status(400).json({ 
        message: 'Invalid image data',
        error: imageError.message,
        hint: 'Make sure imageType is correct (e.g., image/jpeg, image/png)'
      });
    }
  }
} else {
  console.log('📸 No image provided');
}

    // Insert into DB
    const sql = `INSERT INTO Event 
      (eventTitle, eventDescription, eventCategory, eventStartDate, eventEndDate,
       rewardPoints, UTMMeritPoints, eventImageURL, createdBy, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Upcoming', CURRENT_TIMESTAMP)`;

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

    console.log('📊 Executing SQL:', sql);
    console.log('📊 With values:', values);

    const [result] = await db.query(sql, values);
    console.log(`✅ Event created with ID: ${result.insertId}`);

    // Fetch created event
    const selectSql = `
      SELECT e.*, u.fullName as adminName
      FROM Event e
      LEFT JOIN Admin a ON e.createdBy = a.adminID
      LEFT JOIN User u ON a.userID = u.userID
      WHERE e.eventID = ?`;
    
    const [selectResults] = await db.query(selectSql, [result.insertId]);
    
    if (selectResults.length === 0) {
      console.error('❌ Created event not found');
      return res.status(500).json({ message: 'Event created but could not be retrieved' });
    }
    
    const createdEvent = selectResults[0];
    createdEvent.adminName = createdEvent.adminName || 'Admin';
    createdEvent.eventImageURL = getFullImageURL(createdEvent.eventImageURL);

    console.log('✅ Event creation complete:', createdEvent);
    
    res.status(201).json({ 
      success: true,
      message: 'Event created successfully', 
      event: createdEvent 
    });

  } catch (err) {
    console.error('❌ Error creating event:', err);
    console.error('❌ Error message:', err.message);
    
    res.status(500).json({ 
      success: false,
      message: 'Database error', 
      error: err.message
    });
  }
});

// UPDATE Event
router.put('/update/:id', async (req, res) => {
  try {
    const db = req.db || getDBConnection();
    const { id } = req.params;
    console.log(`📝 Updating event ${id}:`, req.body);
    
    const { 
      eventTitle, eventDescription, eventCategory, eventStartDate, eventEndDate,
      rewardPoints, UTMMeritPoints, status, createdBy, eventImageBase64, imageType
    } = req.body;

    // Check if event exists
    const [checkResults] = await db.query('SELECT * FROM Event WHERE eventID = ?', [id]);
    if (checkResults.length === 0) {
      console.log(`❌ Event ${id} not found`);
      return res.status(404).json({ message: 'Event not found' });
    }

    const currentEvent = checkResults[0];
    console.log('📊 Current event:', currentEvent);

    // Validate createdBy if updated
    if (createdBy && createdBy !== currentEvent.createdBy) {
      const [adminExists] = await db.query('SELECT adminID FROM Admin WHERE adminID = ?', [createdBy]);
      if (adminExists.length === 0) {
        console.log(`❌ Admin ${createdBy} does not exist`);
        return res.status(400).json({ message: `Admin ${createdBy} does not exist.` });
      }
    }

    // Handle image update
    let eventImageURL = currentEvent.eventImageURL;
    if (eventImageBase64 && eventImageBase64.trim() !== '') {
      console.log('🖼️ Processing updated image');
      
      if (eventImageBase64.startsWith('http')) {
        eventImageURL = eventImageBase64;
      } else {
        try {
          let imageBuffer;
          if (eventImageBase64.includes('base64,')) {
            const base64Data = eventImageBase64.replace(/^data:image\/\w+;base64,/, '');
            imageBuffer = Buffer.from(base64Data, 'base64');
          } else {
            imageBuffer = Buffer.from(eventImageBase64, 'base64');
          }

          const ext = imageType || '.jpg';
          const filename = `event-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
          const filePath = path.join(uploadsDir, filename);
          fs.writeFileSync(filePath, imageBuffer);
          eventImageURL = `/uploads/${filename}`;
          
          console.log('✅ New image saved:', eventImageURL);
        } catch (imageError) {
          console.error('❌ Error processing updated image:', imageError);
          return res.status(400).json({ 
            message: 'Invalid image data',
            error: imageError.message 
          });
        }
      }
    }

    // Update DB
    const sql = `UPDATE Event SET 
      eventTitle = ?, eventDescription = ?, eventCategory = ?, 
      eventStartDate = ?, eventEndDate = ?, rewardPoints = ?, UTMMeritPoints = ?,
      eventImageURL = ?, status = ?, createdBy = ?, updatedAt = CURRENT_TIMESTAMP
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
      createdBy || currentEvent.createdBy,
      id
    ];

    console.log('📊 Executing update SQL:', sql);
    console.log('📊 With values:', values);

    await db.query(sql, values);

    // Fetch updated event
    const selectSql = `
      SELECT e.*, u.fullName as adminName
      FROM Event e
      LEFT JOIN Admin a ON e.createdBy = a.adminID
      LEFT JOIN User u ON a.userID = u.userID
      WHERE e.eventID = ?`;
    
    const [selectResults] = await db.query(selectSql, [id]);
    const updatedEvent = selectResults[0];
    updatedEvent.adminName = updatedEvent.adminName || 'Admin';
    updatedEvent.eventImageURL = getFullImageURL(updatedEvent.eventImageURL);

    console.log('✅ Event updated:', updatedEvent);
    
    res.json({ 
      success: true,
      message: 'Event updated successfully', 
      event: updatedEvent 
    });

  } catch (err) {
    console.error('❌ Error updating event:', err);
    console.error('❌ SQL Error:', err.sql);
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to update event', 
      error: err.message,
      sqlError: err.sqlMessage 
    });
  }
});

// DELETE Event
router.delete('/delete/:id', async (req, res) => {
  try {
    const db = req.db || getDBConnection();
    const { id } = req.params;
    console.log(`🗑️ Deleting event ${id}`);

    // Check if event exists
    const checkSql = `SELECT * FROM Event WHERE eventID = ?`;
    const [checkResults] = await db.query(checkSql, [id]);
    
    if (checkResults.length === 0) {
      console.log(`❌ Event ${id} not found`);
      return res.status(404).json({ message: 'Event not found' });
    }

    const sql = `DELETE FROM Event WHERE eventID = ?`;
    const [result] = await db.query(sql, [id]);
    
    if (result.affectedRows === 0) {
      console.log(`❌ No event deleted with ID ${id}`);
      return res.status(404).json({ message: 'Event not found' });
    }
    
    console.log('✅ Event deleted successfully');
    res.json({ 
      success: true,
      message: 'Event deleted successfully',
      deletedEventID: id 
    });
    
  } catch (err) {
    console.error('❌ Error deleting event:', err);
    console.error('❌ SQL Error:', err.sql);
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete event', 
      error: err.message,
      sqlError: err.sqlMessage 
    });
  }
});

// Alternative: Simple GET route without joins (for testing)
router.get('/simple/all', async (req, res) => {
  try {
    const db = req.db || getDBConnection();
    const sql = `SELECT * FROM Event ORDER BY eventStartDate DESC`;
    const [results] = await db.query(sql);
    
    console.log(`✅ Fetched ${results.length} events (simple)`);
    
    const events = results.map(event => ({
      ...event,
      adminName: 'Admin',
      eventImageURL: getFullImageURL(event.eventImageURL)
    }));
    
    res.json(events);
  } catch (err) {
    console.error('❌ Error in simple route:', err);
    res.status(500).json({ 
      message: 'Failed to fetch events', 
      error: err.message 
    });
  }
});

// Fallback function to create db connection if not provided via middleware
function getDBConnection() {
  const mysql = require('mysql2');
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
  return pool.promise();
}

module.exports = router;