const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'utm_remerit',
    port: process.env.DB_PORT || 5000,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Create promise wrapper
const promisePool = pool.promise();

// Test connection
async function testConnection() {
    try {
        const connection = await promisePool.getConnection();
        console.log('✅ Connected to MySQL database');
        connection.release();
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        console.log('Trying to connect with these settings:');
        console.log('- Host:', process.env.DB_HOST || 'localhost');
        console.log('- User:', process.env.DB_USER || 'root');
        console.log('- Database:', process.env.DB_NAME || 'utm_remerit');
        console.log('- Port:', process.env.DB_PORT || 5000);
    }
}

testConnection();

module.exports = promisePool;