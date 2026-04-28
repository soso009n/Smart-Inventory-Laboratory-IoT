/**
 * Database Configuration - PostgreSQL Connection Pool (NEON SERVERLESS)
 * Sistem Manajemen Inventaris Laboratorium IoT
 */

import { Pool, type PoolClient, type QueryResult, type PoolConfig, type QueryResultRow } from "pg";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

const parseEnvNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const truncateSql = (sql: string, maxLength = 140): string => {
  const normalized = sql.replace(/\s+/g, " ").trim();

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const poolConfig: PoolConfig = {
  connectionString: DATABASE_URL,

  /**
   * Required for Neon cloud connection.
   *
   * Note:
   * rejectUnauthorized: false is acceptable for local development.
   * For production, prefer a stricter SSL setup if your deployment supports it.
   */
  ssl: {
    rejectUnauthorized: false,
  },

  // Small pool is more stable for local development + Neon serverless.
  max: parseEnvNumber(process.env.DB_MAX_POOL, 5),

  // Close idle clients after 30 seconds.
  idleTimeoutMillis: parseEnvNumber(process.env.DB_IDLE_TIMEOUT, 30000),

  // Give Neon enough time for cold start / network latency.
  connectionTimeoutMillis: parseEnvNumber(process.env.DB_CONNECTION_TIMEOUT, 10000),

  keepAlive: true,
};

const pool = new Pool(poolConfig);

pool.on("connect", () => {
  if (process.env.NODE_ENV === "development") {
    console.log("🔌 New client connected to Neon Serverless Postgres");
  }
});

pool.on("error", (error: Error) => {
  console.error("❌ Unexpected error on idle database client:", error.message);
});

/**
 * Test database connection.
 */
export const testConnection = async (): Promise<boolean> => {
  let client: PoolClient | null = null;

  try {
    client = await pool.connect();

    const result = await client.query<{
      now: Date;
      version: string;
    }>("SELECT NOW() as now, version() as version");

    console.log("✅ Database connection successful!");
    console.log(`📅 Server time: ${result.rows[0].now}`);
    console.log("🖥️  Host: Neon Serverless Database");
    console.log(`📦 PostgreSQL version: ${result.rows[0].version.split(",")[0]}`);

    return true;
  } catch (error) {
    const err = error as Error;

    console.error("❌ Database connection failed:", err.message);
    console.error("💡 Pastikan DATABASE_URL di file .env sudah benar dan Neon database aktif.");

    return false;
  } finally {
    client?.release();
  }
};

/**
 * Type-safe query helper.
 */
export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === "development") {
      console.log("📊 Executed query", {
        text: truncateSql(text),
        duration: `${duration}ms`,
        rows: result.rowCount,
      });
    }

    return result;
  } catch (error) {
    const err = error as Error;

    console.error("❌ Query error:", err.message);
    console.error("📝 Query:", truncateSql(text, 500));

    throw error;
  }
};

type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * Transaction helper with automatic rollback.
 */
export const transaction = async <T = unknown>(
  callback: TransactionCallback<T>
): Promise<T> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await callback(client);

    await client.query("COMMIT");

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Transaction committed successfully");
    }

    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      const rollbackErr = rollbackError as Error;
      console.error("❌ Failed to rollback transaction:", rollbackErr.message);
    }

    const err = error as Error;
    console.error("❌ Transaction rolled back:", err.message);

    throw error;
  } finally {
    client.release();
  }
};

/**
 * Gracefully close database pool.
 */
export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    console.log("👋 Database pool has been closed");
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error closing database pool:", err.message);
  }
};

export { pool };

export default {
  pool,
  query,
  transaction,
  testConnection,
  closePool,
};