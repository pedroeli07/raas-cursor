// Database Connection Test Script
// Tests PostgreSQL connection with the pg module
// Run with: node scripts/test-db-connection.js

import { Pool } from 'pg';
import 'dotenv/config'; // Load .env variables

console.log('Database Connection Test');
console.log('-----------------------');
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Defined' : 'Undefined'}`);

// Create a new Pool instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : undefined,
  max: 5, // Maximum number of clients
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle (30 seconds)
  connectionTimeoutMillis: 2000, // How long to wait to establish a connection (2 seconds)
});

// Register pool error handler
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Try to connect
async function testConnection() {
  let client = null;
  
  try {
    console.log('Attempting to connect to PostgreSQL...');
    
    // Get a client from the pool
    client = await pool.connect();
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('Connection successful!');
    console.log(`Server time: ${result.rows[0].current_time}`);
    
    // Test database version
    const versionResult = await client.query('SELECT version()');
    console.log(`PostgreSQL version: ${versionResult.rows[0].version}`);
    
    // Get database name
    const dbNameResult = await client.query('SELECT current_database()');
    console.log(`Database name: ${dbNameResult.rows[0].current_database}`);
    
    // Get schema tables count
    const tablesResult = await client.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`Number of tables in public schema: ${tablesResult.rows[0].table_count}`);
    
    return true;
  } catch (error) {
    console.error('Connection failed!', error);
    return false;
  } finally {
    // Release the client back to the pool
    if (client) client.release();
    
    // Close the pool
    await pool.end();
    console.log('Connection pool closed');
  }
}

// Run the test
testConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unhandled error in test:', err);
    process.exit(1);
  }); 