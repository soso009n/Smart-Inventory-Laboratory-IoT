/**
 * Database Configuration - PostgreSQL Connection Pool
 * Sistem Manajemen Inventaris Laboratorium IoT
 *
 * Menggunakan pg Pool untuk connection pooling yang efisien
 * dan reusable connections untuk performa optimal
 */

import { Pool, PoolClient, QueryResult, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Interface untuk pool configuration
interface DatabaseConfig extends PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

// Konfigurasi connection pool dengan type safety
const poolConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'smart_inventory_lab',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',

  // Pool settings untuk optimasi performa
  max: parseInt(process.env.DB_MAX_POOL || '20'), // Maksimal koneksi dalam pool
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 30 detik
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'), // 2 detik
};

// Buat instance Pool
const pool = new Pool(poolConfig);

// Event listener untuk monitoring
pool.on('connect', () => {
  console.log('🔌 New client connected to PostgreSQL database');
});

pool.on('error', (err: Error) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Function untuk test koneksi database
 * Digunakan saat aplikasi pertama kali dijalankan
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now, version() as version');

    console.log('✅ Database connection successful!');
    console.log(`📅 Server time: ${result.rows[0].now}`);
    console.log(`🗄️  Database: ${poolConfig.database}`);
    console.log(`🖥️  Host: ${poolConfig.host}:${poolConfig.port}`);
    console.log(`📦 PostgreSQL version: ${result.rows[0].version.split(',')[0]}`);

    client.release();
    return true;
  } catch (error) {
    const err = error as Error;
    console.error('❌ Database connection failed:', err.message);
    console.error('💡 Please check your .env configuration and ensure PostgreSQL is running');
    return false;
  }
};

/**
 * Function untuk query dengan type safety
 * Wrapper untuk memudahkan query dengan automatic connection management
 */
export const query = async <T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    // Log query untuk debugging (comment di production)
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
 * Memudahkan operasi yang memerlukan multiple queries
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
 * Menutup semua koneksi dengan aman saat aplikasi dihentikan
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

/**
 * Export pool untuk direct access jika diperlukan
 */
export { pool };

/**
 * Export default object untuk backward compatibility
 */
export default {
  pool,
  query,
  transaction,
  testConnection,
  closePool
};
