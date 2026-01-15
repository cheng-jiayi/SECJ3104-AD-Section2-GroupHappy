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
