const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT || 5432,
});

// Simple connection test
const testConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('PostgreSQL connected:', result.rows[0].now);
        return true;
    } catch (err) {
        console.error('PostgreSQL connection error:', err);
        return false;
    }
};

// Export both the pool and the test function
module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
    testConnection
};