import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

// Endpoint Autentikasi
router.post('/register', register); // Mendaftar akun
router.post('/login', login);       // Masuk ke aplikasi

export default router;