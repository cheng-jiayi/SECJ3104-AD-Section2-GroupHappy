const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.SERVER_PORT || 5000;

// Middleware
app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import routes
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const conversionRoutes = require('./routes/conversionRoutes');

// Routes
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/conversions', conversionRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        service: 'UTM ReMerit Backend',
        version: '1.0.0'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Access from phone: http://10.152.40.120:${PORT}`);
    console.log(`📊 Database: ${process.env.DB_NAME}`);
});