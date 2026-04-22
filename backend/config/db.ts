/**
 * Database Configuration - PostgreSQL Connection Pool (NEON SERVERLESS)
 * Sistem Manajemen Inventaris Laboratorium IoT
 */

import { Pool, PoolClient, QueryResult, PoolConfig, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Konfigurasi connection pool khusus untuk Neon (menggunakan connectionString & SSL)
const poolConfig: PoolConfig = {
  // Mengambil URL Neon dari file .env
  connectionString: process.env.DATABASE_URL,
  
  // WAJIB UNTUK NEON CLOUD: Mengaktifkan mode SSL
  ssl: {
    rejectUnauthorized: false
  },

  // Pool settings untuk optimasi performa
  max: parseInt(process.env.DB_MAX_POOL || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
};

// Buat instance Pool
const pool = new Pool(poolConfig);

// Event listener untuk monitoring
pool.on('connect', () => {
  console.log('🔌 New client connected to Neon Serverless Postgres');
});

pool.on('error', (err: Error) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Function untuk test koneksi database
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now, version() as version');

    console.log('✅ Database connection successful!');
    console.log(`📅 Server time: ${result.rows[0].now}`);
    console.log(`🖥️  Host: Neon Serverless Database`);
    console.log(`📦 PostgreSQL version: ${result.rows[0].version.split(',')[0]}`);

    client.release();
    return true;
  } catch (error) {
    const err = error as Error;
    console.error('❌ Database connection failed:', err.message);
    console.error('💡 Pastikan DATABASE_URL di file .env sudah diisi dengan link dari Neon');
    return false;
  }
};

/**
 * Function untuk query dengan type safety
 * (Sudah diperbaiki dengan QueryResultRow agar lolos strict mode TypeScript)
 */
export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Executed query', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
    }

    return result;
  } catch (error) {
    const err = error as Error;
    console.error('❌ Query error:', err.message);
    console.error('📝 Query:', text);
    throw error;
  }
};

/**
 * Type untuk transaction callback
 */
type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * Function untuk transaction dengan rollback otomatis
 */
export const transaction = async <T = any>(
  callback: TransactionCallback<T>
): Promise<T> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');

    console.log('✅ Transaction committed successfully');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    const err = error as Error;
    console.error('❌ Transaction rolled back:', err.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Graceful shutdown function
 */
export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('👋 Database pool has been closed');
  } catch (error) {
    const err = error as Error;
    console.error('❌ Error closing database pool:', err.message);
  }
};

export { pool };

export default {
  pool,
  query,
  transaction,
  testConnection,
  closePool
};