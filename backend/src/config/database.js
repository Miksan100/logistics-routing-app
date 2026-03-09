const { Pool } = require('pg');
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'fleeterzen_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
  process.exit(-1);
});
const query = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();
module.exports = { query, getClient, pool };
