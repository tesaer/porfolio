const fs = require('fs');
const path = require('path');

let Pool;
let loadPgError = null;
try {
  Pool = require('pg').Pool;
} catch (err) {
  loadPgError = err.message;
  console.error('Failed to require pg:', err);
}

let pool = null;

function getConnectionString() {
  const env = process.env;
  return (
    env.NETLIFY_DATABASE_URL ||
    env.DATABASE_URL ||
    env.POSTGRES_URL ||
    env.NETLIFY_DB_URL ||
    env.POSTGRES_PRISMA_URL ||
    env.POSTGRES_URL_NON_POOLING ||
    env.NETLIFY_POSTGRES_URL ||
    env.NEON_DATABASE_URL ||
    (env.PGHOST && `postgres://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT || 5432}/${env.PGDATABASE}`)
  );
}

function getPool() {
  if (!Pool) {
    throw new Error(`Модуль драйвера базы данных (pg) не загружен: ${loadPgError || 'require failed'}. Убедитесь, что 'npm install' выполнен при сборке.`);
  }

  if (!pool) {
    const connectionString = getConnectionString();
    if (!connectionString) {
      const envKeys = Object.keys(process.env).filter(k => /DATA|POSTGRES|NETLIFY|PG/i.test(k)).join(', ');
      throw new Error(`Отсутствует строка подключения к БД (DATABASE_URL / NETLIFY_DATABASE_URL). Найденные переменные: [${envKeys || 'нет'}].`);
    }

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 5000
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // GET /api/content
    if (event.httpMethod === 'GET') {
      const result = await client.query(
        'SELECT data FROM portfolio_content WHERE id = $1',
        ['main']
      );

      const row = result.rows[0];
      if (row && row.data && Object.keys(row.data).length > 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(row.data)
        };
      }

      // If empty, serve default content
      const defaultData = getDefaultContent() || {};
      if (row) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(defaultData)
        };
      }

      await client.query(
        `INSERT INTO portfolio_content (id, data, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (id) DO NOTHING`,
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
         VALUES ($1, $2::jsonb, NOW())
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
        error: error.message || 'Database error',
        hint: 'Проверьте логи в Netlify: Logs -> Functions -> content'
      })
    };
  }
};
