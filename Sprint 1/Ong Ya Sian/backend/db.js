const mysql = require('mysql2');

const db = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: 'Hoo@790204',
  database: 'EventApp',
  connectionLimit: 10,
});

// Test connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed: ', err);
    return;
  }
  console.log('✅ Database connected successfully to EventApp');
  connection.release();
});

module.exports = db;