import { Router } from 'express';
import { 
  createLoan, 
  getAllLoansWithDetails, 
  returnItem 
} from '../controllers/loanController';

const router = Router();

// Endpoint Peminjaman
router.post('/', createLoan);                   // Pinjam Alat
router.get('/', getAllLoansWithDetails);        // Lihat Riwayat (Menjalankan JOIN 3 Tabel)
router.put('/return/:id', returnItem);          // Kembalikan Alat

export default router;