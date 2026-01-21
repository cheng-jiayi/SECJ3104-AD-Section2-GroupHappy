const mysql = require('mysql2/promise'); // IMPORTANT: Use promise version

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

// Export promise-based methods
module.exports = {
  pool,
  
  async query(sql, params) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },
  
  async execute(sql, params) {
    const [result] = await pool.execute(sql, params);
    return result;
  },
  
  async executeProcedure(procedureName, params = []) {
    const placeholders = params.map(() => '?').join(',');
    const sql = `CALL ${procedureName}(${placeholders})`;
    const [results] = await pool.execute(sql, params);
    return results;
  },
  
  getConnection() {
    return pool.getConnection();
  }
};