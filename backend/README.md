# Smart Inventory Laboratory IoT - Backend API

Backend API untuk Sistem Manajemen Inventaris Laboratorium IoT menggunakan Node.js, Express, dan PostgreSQL.

## 📋 Tech Stack

- **Runtime**: Node.js (v16+)
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Security**: Helmet, CORS
- **Validation**: Express Validator
- **Authentication**: JWT (JSON Web Token)

## 🚀 Instalasi

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Database PostgreSQL

Pastikan PostgreSQL sudah terinstall dan berjalan. Lalu buat database baru:

```sql
CREATE DATABASE smart_inventory_lab;
```

### 3. Konfigurasi Environment Variables

Copy file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Lalu edit file `.env` dan sesuaikan dengan kredensial database Anda:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_inventory_lab
DB_USER=postgres
DB_PASSWORD=your_actual_password
```

### 4. Jalankan Server

**Development mode** (dengan auto-reload dan TypeScript):
```bash
npm run dev
```

**Build untuk Production**:
```bash
npm run build
npm start
```

Server akan berjalan di `http://localhost:5000`

## ✅ Verifikasi Instalasi

### Test Database Connection

Saat server pertama kali dijalankan, akan muncul output seperti ini jika berhasil:

```
🚀 Starting Smart Inventory Lab API Server...

🔍 Testing database connection...
🔌 New client connected to PostgreSQL database
✅ Database connection successful!
📅 Server time: 2026-04-22T16:45:30.123Z
🗄️  Database: smart_inventory_lab
🖥️  Host: localhost:5432

============================================================
✨ Server is running on port 5000
🌐 API URL: http://localhost:5000/api
🏥 Health Check: http://localhost:5000/api/health
🔧 Environment: development
============================================================

✅ All systems operational!
```

### Test API Endpoints

Buka browser atau gunakan Postman/cURL untuk test:

**Health Check:**
```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "success": true,
  "message": "API is running smoothly",
  "timestamp": "2026-04-22T16:45:30.123Z",
  "environment": "development"
}
```

**API Info:**
```bash
curl http://localhost:5000/api
```

## 📁 Struktur Project

```
backend/
├── config/
│   └── db.ts              # Database connection pool (TypeScript)
├── controllers/           # Business logic
├── middleware/            # Custom middleware (auth, validation, etc)
├── models/               # Database models/queries
├── routes/               # API routes
├── dist/                 # Compiled JavaScript (generated)
├── .env                  # Environment variables (JANGAN commit!)
├── .env.example          # Template environment variables
├── .gitignore           # Git ignore file
├── index.ts             # Main server file (TypeScript)
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies
└── README.md            # Dokumentasi
```

## 🔐 Security Features

- ✅ Helmet.js untuk HTTP headers security
- ✅ CORS configuration
- ✅ Environment variables untuk kredensial
- ✅ Connection pooling untuk performa
- ✅ Graceful shutdown handling
- ✅ Error handling middleware

## 🛠️ Troubleshooting

### Error: Connection refused

**Problem**: `ECONNREFUSED 127.0.0.1:5432`

**Solution**:
1. Pastikan PostgreSQL service berjalan
2. Check apakah port 5432 digunakan
3. Verifikasi kredensial di file `.env`

### Error: Database does not exist

**Problem**: `database "smart_inventory_lab" does not exist`

**Solution**:
```sql
CREATE DATABASE smart_inventory_lab;
```

### Error: Password authentication failed

**Problem**: Kredensial salah

**Solution**:
1. Verifikasi username dan password di `.env`
2. Test login manual: `psql -U postgres -d smart_inventory_lab`

## 📝 Next Steps

Setelah instalasi berhasil, Anda bisa lanjut ke:

1. **Database Migration** - Buat schema tables
2. **Models** - Buat models untuk Inventory, Loans, Users
3. **Routes & Controllers** - Implementasi CRUD endpoints
4. **Authentication** - Setup JWT auth middleware
5. **Validation** - Input validation dengan express-validator

## 📞 Support

Untuk pertanyaan atau bantuan, silakan buat issue di repository atau hubungi pembuat project.

---

**Tugas Akhir** - Sistem Manajemen Inventaris Laboratorium IoT  
Computer Engineering - 2026
