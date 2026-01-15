const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // body-parser deprecated

// ------------------- MySQL Connection -------------------
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password123',
    database: 'UTM_ReMerit'
});

db.connect(err => {
    if (err) {
        console.error('MySQL connection error:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL');
});

// ------------------- USER LOGIN / REGISTER -------------------
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query(
        'SELECT * FROM users WHERE username=? AND password=?',
        [username, password],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            if (results.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

            const user = { ...results[0] };
            delete user.password; // don't send password to client
            res.json(user);
        }
    );
});

app.post('/register', (req, res) => {
    const { name, username, password, role } = req.body;
    if (!name || !username || !password || !role)
        return res.status(400).json({ message: 'All fields required' });

    db.query(
        'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)',
        [name, username, password, role],
        (err, result) => {
            if (err && err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Username already exists' });
            if (err) return res.status(500).json({ message: 'Database error' });
            res.json({ message: 'Registration successful' });
        }
    );
});

// ------------------- EVENTS -------------------
app.get('/events', (req, res) => {
    db.query('SELECT * FROM `event`', (err, results) => {
        if (err) return res.status(500).json({ message: 'Failed to fetch events' });
        res.json(results);
    });
});

// ------------------- PARTICIPATION -------------------
app.get('/participation/student/:studentID', (req, res) => {
    const studentID = Number(req.params.studentID);
    db.query(
        `SELECT * FROM participation WHERE studentID=? AND participationStatus IN ('Registered','Attended','Completed')`,
        [studentID],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Failed to fetch registrations' });
            res.json(results);
        }
    );
});

app.post('/participation/register', (req, res) => {
    const { studentID, eventID } = req.body;

    db.query(
        'SELECT participationStatus FROM participation WHERE studentID=? AND eventID=?',
        [studentID, eventID],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error' });

            if (results.length === 0) {
                db.query(
                    `INSERT INTO participation 
                     (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded)
                     VALUES (?, ?, 'Registered', 0, 0)`,
                    [studentID, eventID],
                    (err2) => {
                        if (err2) return res.status(500).json({ message: 'Registration failed' });
                        return res.json({ message: 'Registered successfully' });
                    }
                );
            } else {
                const status = results[0].participationStatus;
                if (status === 'Cancelled') {
                    db.query(
                        `UPDATE participation 
                         SET participationStatus='Registered', rewardPointsEarned=0, meritPointsAwarded=0
                         WHERE studentID=? AND eventID=?`,
                        [studentID, eventID],
                        (err3) => {
                            if (err3) return res.status(500).json({ message: 'Re-registration failed' });
                            return res.json({ message: 'Re-registered successfully' });
                        }
                    );
                } else {
                    return res.status(400).json({ message: 'Already registered for this event' });
                }
            }
        }
    );
});

app.post('/participation/cancel', (req, res) => {
    const { studentID, eventID } = req.body;

    // soft delete for consistency
    db.query(
        'UPDATE participation SET participationStatus="Cancelled" WHERE studentID=? AND eventID=?',
        [studentID, eventID],
        (err, result) => {
            if (err) return res.status(500).json({ message: 'Cancel failed' });
            if (result.affectedRows === 0) return res.status(400).json({ message: 'No registration found to cancel' });
            res.json({ message: 'Registration cancelled successfully' });
        }
    );
});

app.get('/participation/points/:studentID/:eventID', (req, res) => {
    const studentID = Number(req.params.studentID);
    const eventID = Number(req.params.eventID);

    db.query(
        'SELECT rewardPointsEarned AS currentPoints, meritPointsAwarded, participationStatus FROM participation WHERE studentID=? AND eventID=?',
        [studentID, eventID],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Failed to fetch points' });
            if (results.length === 0) return res.json({ currentPoints: 0, meritPointsAwarded: 0, participationStatus: 'Not Registered' });

            res.json({
                currentPoints: results[0].currentPoints ?? 0,
                meritPointsAwarded: results[0].meritPointsAwarded ?? 0,
                participationStatus: results[0].participationStatus
            });
        }
    );
});

app.post('/participation/complete', (req, res) => {
    const { studentID, eventID } = req.body;

    db.query(
        `SELECT p.rewardPointsEarned, p.participationStatus, e.rewardPoints, e.UTMMeritPoints
         FROM participation p
         JOIN \`event\` e ON p.eventID = e.eventID
         WHERE p.studentID=? AND p.eventID=?`,
        [studentID, eventID],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            if (results.length === 0) return res.status(400).json({ message: 'Participation not found' });

            const { rewardPointsEarned, participationStatus, rewardPoints, UTMMeritPoints } = results[0];

            if (participationStatus === 'Completed')
                return res.status(400).json({ message: 'Event already completed' });

            if (rewardPointsEarned < rewardPoints)
                return res.status(400).json({ message: `Not enough points to complete. You need ${rewardPoints - rewardPointsEarned} more.` });

            db.query(
                `UPDATE participation SET participationStatus='Completed', meritPointsAwarded=? WHERE studentID=? AND eventID=?`,
                [UTMMeritPoints, studentID, eventID],
                (err2) => {
                    if (err2) return res.status(500).json({ message: 'Failed to mark participation completed' });
                    res.json({ message: 'Event completed!', meritPointsAwarded: UTMMeritPoints });
                }
            );
        }
    );
});
