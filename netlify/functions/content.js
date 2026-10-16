const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('Database connection string is missing. Please set NETLIFY_DATABASE_URL or DATABASE_URL in Netlify environment variables.');
    }
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }
  return pool;
}

// Fallback initial content from local file
function getDefaultContent() {
  try {
    const filePath = path.resolve(__dirname, '../../data/content.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.warn('Could not read static content.json:', err.message);
  }
  return null;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const client = getPool();

    // Auto-create table if it does not exist yet
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_content (
        id VARCHAR(32) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // GET /api/content
    if (event.httpMethod === 'GET') {
      const result = await client.query(
        'SELECT data FROM portfolio_content WHERE id = $1',
        ['main']
      );

      if (result.rows.length > 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result.rows[0].data)
        };
      }

      // If table is newly created / empty, seed with default content
      const defaultData = getDefaultContent() || {};
      await client.query(
        'INSERT INTO portfolio_content (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING',
        ['main', JSON.stringify(defaultData)]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultData)
      };
    }

    // POST /api/content (Save from admin panel)
    if (event.httpMethod === 'POST') {
      const payload = JSON.parse(event.body || '{}');

      await client.query(
        `INSERT INTO portfolio_content (id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO UPDATE
         SET data = EXCLUDED.data, updated_at = NOW()`,
        ['main', JSON.stringify(payload)]
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Saved successfully' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  } catch (error) {
    console.error('API Error:', error);

    // If database connection fails on GET, try to return static content fallback
    if (event.httpMethod === 'GET') {
      const fallback = getDefaultContent();
      if (fallback) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(fallback)
        };
      }
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Database connection error',
        hint: 'Make sure Netlify Database is connected and NETLIFY_DATABASE_URL is set in Site Configuration -> Environment Variables'
      })
    };
  }
};
