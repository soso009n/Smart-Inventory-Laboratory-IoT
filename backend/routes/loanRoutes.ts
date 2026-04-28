import { Router } from 'express';
import {
  createLoan,
  getAllLoansWithDetails,
  getLoanById,
  updateLoan,
  returnItem,
  deleteLoan
} from '../controllers/loanController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// Endpoint Peminjaman
router.post('/', requireRole('admin', 'student'), createLoan); // Pinjam Alat
router.get('/', requireRole('admin', 'student'), getAllLoansWithDetails); // Lihat Riwayat
router.get('/:id', requireRole('admin', 'student'), getLoanById); // Detail Loan
router.patch('/:id', requireRole('admin'), updateLoan); // Update Loan (admin)
router.patch('/:id/return', requireRole('admin', 'student'), returnItem); // Kembalikan Alat
router.put('/return/:id', requireRole('admin', 'student'), returnItem); // Alias legacy
router.delete('/:id', requireRole('admin'), deleteLoan); // Soft Delete Loan

export default router;
