const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',         // change if needed
    password: 'password123',         // your MySQL password
    database: 'UTM_ReMerit'
});

db.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL');
});

app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});

// User login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username=? AND password=?', [username, password], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (results.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
        res.json(results[0]);
    });
});

// User registration
app.post('/register', (req, res) => {
    const { name, username, password, role } = req.body;
    if (!name || !username || !password || !role) return res.status(400).json({ message: 'All fields required' });

    db.query('INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)', 
        [name, username, password, role], 
        (err, result) => {
            if (err) return res.status(500).json({ message: 'Username already exists' });
            res.json({ message: 'Registration successful' });
        });
});

// Get events
app.get('/events', (req, res) => {
    db.query('SELECT * FROM Event WHERE status != "Completed"', (err, results) => {
        if (err) return res.status(500).json({ message: 'Failed to fetch events' });
        res.json(results);
    });
});

// Get student registrations
app.get('/participation/student/:studentID', (req, res) => {
    const { studentID } = req.params;
    db.query('SELECT * FROM Participation WHERE studentID=?', [studentID], (err, results) => {
        if (err) return res.status(500).json({ message: 'Failed to fetch registrations' });
        res.json(results);
    });
});

// Register for event
app.post('/participation/register', (req, res) => {
    const { studentID, eventID } = req.body;
    db.query('INSERT INTO Participation (studentID, eventID) VALUES (?, ?)', [studentID, eventID], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Already registered' });
            return res.status(500).json({ message: 'Registration failed' });
        }
        res.json({ message: 'Registered successfully' });
    });
});

// Cancel registration
app.post('/participation/cancel', (req, res) => {
    const { studentID, eventID } = req.body;
    db.query('DELETE FROM Participation WHERE studentID=? AND eventID=?', [studentID, eventID], (err, result) => {
        if (err) return res.status(500).json({ message: 'Cancel failed' });
        res.json({ message: 'Registration cancelled' });
    });
});