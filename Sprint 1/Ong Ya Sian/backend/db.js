const mysql = require('mysql2');

const db = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'utm_remerit',
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
