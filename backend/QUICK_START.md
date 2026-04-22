# ⚡ Quick Start Guide - Backend API

Panduan cepat untuk developer yang sudah familiar dengan Node.js + PostgreSQL.

## 🚀 Setup dalam 5 Menit

```bash
# 1. Buat database PostgreSQL
psql -U postgres -c "CREATE DATABASE smart_inventory_lab;"

# 2. Masuk ke folder backend
cd backend

# 3. Install dependencies
npm install

# 4. Setup environment variables
cp .env.example .env
# Edit .env: ganti DB_PASSWORD dan JWT_SECRET

# 5. Jalankan development server
npm run dev
```

✅ Done! Server running di `http://localhost:5000`

---

## 📋 Available NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development mode dengan auto-reload (ts-node) |
| `npm run dev:watch` | Development mode dengan file watching |
| `npm run build` | Compile TypeScript → JavaScript (output: `dist/`) |
| `npm start` | Production mode (jalankan compiled JS) |
| `npm test` | Run tests (belum diimplementasi) |

---

## 🔌 Default Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api` | GET | API information & available endpoints |
| `/api/health` | GET | Health check & server status |
| `/api/auth/*` | POST | Authentication (coming soon) |
| `/api/inventory/*` | ALL | Inventory CRUD (coming soon) |
| `/api/loans/*` | ALL | Loan management (coming soon) |
| `/api/users/*` | ALL | User management (coming soon) |
| `/api/trash/*` | ALL | Soft delete management (coming soon) |

---

## 🔧 Environment Variables (.env)

**Minimal configuration:**
```env
DB_PASSWORD=your_postgres_password
JWT_SECRET=random_long_secure_string
```

**Full configuration:**
```env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_inventory_lab
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## 📂 Project Structure

```
backend/
├── config/
│   └── db.ts                 # PostgreSQL connection pool
├── controllers/              # Business logic (TODO)
├── middleware/               # Auth, validation, etc (TODO)
├── models/                   # Database queries (TODO)
├── routes/                   # Express routes (TODO)
├── dist/                     # Compiled output (auto-generated)
├── index.ts                  # Main server entry point
├── package.json
├── tsconfig.json
└── .env
```

---

## 🛠️ Using the Database Connection

### Import database module

```typescript
import { query, transaction, pool } from './config/db';
```

### Simple query

```typescript
const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
console.log(result.rows);
```

### Transaction (multiple queries)

```typescript
await transaction(async (client) => {
  await client.query('INSERT INTO inventory ...');
  await client.query('UPDATE stock ...');
  // Auto-commit jika sukses, auto-rollback jika error
});
```

### Direct pool access

```typescript
const client = await pool.connect();
try {
  const result = await client.query('SELECT ...');
  // do something
} finally {
  client.release();
}
```

---

## 🔍 Testing API

### Using cURL

```bash
# Health check
curl http://localhost:5000/api/health

# API info
curl http://localhost:5000/api

# Test 404
curl http://localhost:5000/api/not-found
```

### Using Postman/Insomnia

Import this collection:
- Base URL: `http://localhost:5000`
- Headers: `Content-Type: application/json`

### Using Browser

Just open: `http://localhost:5000/api`

---

## 🐛 Common Issues

| Issue | Quick Fix |
|-------|-----------|
| Port already in use | Change `PORT` in `.env` |
| Database connection failed | Check PostgreSQL service & credentials |
| Module not found | Run `npm install` |
| TypeScript errors | Run `npm run build` to check |

---

## 📚 Next Implementation Steps

1. **Create database schema** (tables for inventory, users, loans)
2. **Implement models** (database query functions)
3. **Create routes** (RESTful API endpoints)
4. **Add authentication** (JWT login/register)
5. **Input validation** (express-validator)
6. **Connect to frontend** (React dashboard)

---

## 📦 Tech Stack Summary

- **Language**: TypeScript 5.3+
- **Runtime**: Node.js 16+
- **Framework**: Express 4.18
- **Database**: PostgreSQL 12+ (via `pg` driver)
- **Security**: Helmet, CORS, bcryptjs, JWT
- **Dev Tools**: ts-node, nodemon

---

**Ready to code!** 🚀

Untuk dokumentasi lengkap, baca `README.md` dan `INSTALLATION.md`
