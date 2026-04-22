# 📦 Panduan Instalasi Backend API - Step by Step

Panduan lengkap untuk setup backend Smart Inventory Laboratory IoT System.

## ✅ Prerequisites

Pastikan sudah terinstall:
- **Node.js** (v16 atau lebih baru) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 atau lebih baru) - [Download](https://www.postgresql.org/download/)
- **npm** atau **yarn** (sudah include dengan Node.js)

Cek versi yang terinstall:
```bash
node --version    # Harus v16+
npm --version
psql --version    # Harus v12+
```

---

## 🚀 Langkah 1: Setup Database PostgreSQL

### Windows

1. Buka pgAdmin atau Command Prompt
2. Login ke PostgreSQL:
   ```bash
   psql -U postgres
   ```
3. Masukkan password postgres Anda

### macOS/Linux

```bash
sudo -u postgres psql
```

### Buat Database Baru

Setelah masuk ke PostgreSQL shell, jalankan:

```sql
-- Buat database
CREATE DATABASE smart_inventory_lab;

-- Verifikasi database sudah dibuat
\l

-- Keluar dari psql
\q
```

**✅ Checkpoint**: Database `smart_inventory_lab` sudah dibuat

---

## 🚀 Langkah 2: Install Package Dependencies

### Masuk ke folder backend

```bash
cd backend
```

### Install semua dependencies

```bash
npm install
```

Ini akan menginstall semua package yang dibutuhkan:

**Production Dependencies:**
- ✅ `express` - Web framework
- ✅ `pg` - PostgreSQL client
- ✅ `dotenv` - Environment variables
- ✅ `cors` - Cross-Origin Resource Sharing
- ✅ `helmet` - Security headers
- ✅ `express-validator` - Input validation
- ✅ `bcryptjs` - Password hashing
- ✅ `jsonwebtoken` - JWT authentication

**Development Dependencies:**
- ✅ `typescript` - TypeScript compiler
- ✅ `ts-node` - TypeScript execution
- ✅ `nodemon` - Auto-reload server
- ✅ `@types/*` - TypeScript type definitions

**✅ Checkpoint**: Output `npm install` harus berhasil tanpa error

---

## 🚀 Langkah 3: Konfigurasi Environment Variables

### Copy template .env

```bash
cp .env.example .env
```

### Edit file .env

Buka file `.env` dengan text editor dan sesuaikan:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_inventory_lab
DB_USER=postgres
DB_PASSWORD=password_postgres_anda_disini  # ⚠️ GANTI INI!

# Connection Pool Settings
DB_MAX_POOL=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# JWT Secret (untuk autentikasi)
JWT_SECRET=ganti_dengan_random_string_yang_panjang_dan_aman  # ⚠️ GANTI INI!
JWT_EXPIRES_IN=7d

# CORS Settings (sesuaikan dengan frontend URL)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Generate JWT Secret (opsional tapi recommended)

Untuk keamanan, generate random string untuk JWT_SECRET:

```bash
# Linux/macOS
openssl rand -base64 32

# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

Copy hasilnya dan paste ke `JWT_SECRET` di file `.env`

**✅ Checkpoint**: File `.env` sudah dibuat dan kredensial sudah disesuaikan

---

## 🚀 Langkah 4: Test Koneksi Database

### Jalankan server development

```bash
npm run dev
```

### Expected Output (SUKSES)

```
🚀 Starting Smart Inventory Lab API Server...

🔍 Testing database connection...
🔌 New client connected to PostgreSQL database
✅ Database connection successful!
📅 Server time: 2026-04-22T16:45:30.123Z
🗄️  Database: smart_inventory_lab
🖥️  Host: localhost:5432
📦 PostgreSQL version: PostgreSQL 15.2

============================================================
✨ Server is running on port 5000
🌐 API URL: http://localhost:5000/api
🏥 Health Check: http://localhost:5000/api/health
🔧 Environment: development
============================================================

✅ All systems operational!
```

**✅ Checkpoint**: Semua tanda ✅ hijau muncul, no errors

---

## 🚀 Langkah 5: Test API Endpoints

### Test 1: Health Check

Buka browser atau gunakan cURL:

```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "API is running smoothly",
  "timestamp": "2026-04-22T16:45:30.123Z",
  "environment": "development"
}
```

### Test 2: API Info

```bash
curl http://localhost:5000/api
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Smart Inventory Laboratory IoT - API Server",
  "version": "1.0.0",
  "endpoints": {
    "health": "/api/health",
    "auth": "/api/auth",
    "inventory": "/api/inventory",
    "loans": "/api/loans",
    "users": "/api/users",
    "trash": "/api/trash"
  }
}
```

### Test 3: 404 Not Found

```bash
curl http://localhost:5000/api/testing
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Endpoint not found",
  "path": "/api/testing"
}
```

**✅ Checkpoint**: Semua test endpoint berhasil

---

## 🎉 Instalasi Berhasil!

Jika semua checkpoint di atas berhasil, maka backend API Anda sudah siap!

### Status Checklist

- ✅ PostgreSQL installed dan running
- ✅ Database `smart_inventory_lab` created
- ✅ Node.js dependencies installed
- ✅ `.env` file configured
- ✅ Server berjalan di `http://localhost:5000`
- ✅ Database connection successful
- ✅ All API endpoints responding

---

## 🔧 Troubleshooting

### ❌ Error: ECONNREFUSED 127.0.0.1:5432

**Masalah**: PostgreSQL service tidak berjalan

**Solusi**:

**Windows**:
- Buka "Services" → Cari "postgresql" → Klik "Start"
- Atau via cmd: `net start postgresql-x64-15`

**macOS**:
```bash
brew services start postgresql
```

**Linux**:
```bash
sudo systemctl start postgresql
sudo systemctl status postgresql
```

---

### ❌ Error: password authentication failed for user "postgres"

**Masalah**: Password di `.env` salah

**Solusi**:
1. Reset password PostgreSQL:
   ```bash
   psql -U postgres
   ALTER USER postgres PASSWORD 'new_password';
   ```
2. Update `.env` dengan password yang baru

---

### ❌ Error: database "smart_inventory_lab" does not exist

**Masalah**: Database belum dibuat

**Solusi**:
```bash
psql -U postgres
CREATE DATABASE smart_inventory_lab;
\q
```

---

### ❌ Error: Cannot find module 'typescript'

**Masalah**: Dependencies tidak terinstall lengkap

**Solusi**:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

### ❌ Error: Port 5000 already in use

**Masalah**: Port 5000 sudah digunakan aplikasi lain

**Solusi**:
1. Edit `.env`, ganti `PORT=5000` menjadi `PORT=5001`
2. Atau matikan aplikasi yang menggunakan port 5000:
   
   **Windows**:
   ```bash
   netstat -ano | findstr :5000
   taskkill /PID <PID_NUMBER> /F
   ```
   
   **macOS/Linux**:
   ```bash
   lsof -ti:5000 | xargs kill -9
   ```

---

## 📚 Next Steps

Setelah instalasi berhasil, lanjut ke:

1. **Database Migration** - Buat tables schema
2. **Seed Data** - Insert data awal
3. **Implement Routes** - CRUD endpoints
4. **Authentication** - JWT login/register
5. **Frontend Integration** - Connect dengan React dashboard

---

## 📞 Need Help?

Jika masih ada error, pastikan:
- PostgreSQL service running
- Kredensial di `.env` benar
- Port tidak bentrok
- Node.js version v16+

Untuk bantuan lebih lanjut, screenshot error message dan cek log di console.

---

**Smart Inventory Laboratory IoT System**  
Backend API - Computer Engineering 2026
