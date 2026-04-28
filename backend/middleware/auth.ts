import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';

export type UserRole = 'admin' | 'student';

export type AuthUser = {
  id: number;
  email: string;
  role: UserRole;
};

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_sementara';

const buildError = (status: number, message: string) => {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
};

export const requireAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw buildError(401, 'Authorization header missing');
    }

    const token = header.replace('Bearer ', '').trim();
    if (!token) {
      throw buildError(401, 'Invalid authorization token');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & {
      id?: number | string;
      role?: UserRole;
    };

    const userId = Number(decoded?.id);
    if (!userId || Number.isNaN(userId)) {
      throw buildError(401, 'Invalid token payload');
    }

    const userResult = await query<{
      id: number;
      email: string;
      role: UserRole;
      is_active: boolean | null;
      deleted_at: string | null;
    }>(
      'SELECT id, email, role, is_active, deleted_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw buildError(401, 'User not found');
    }

    const user = userResult.rows[0];
    if (user.deleted_at) {
      throw buildError(401, 'User account deleted');
    }
    if (user.is_active === false) {
      throw buildError(403, 'User account inactive');
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error: any) {
    if (error?.status) {
      next(error);
      return;
    }
    next(buildError(401, 'Invalid token'));
  }
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(buildError(401, 'Unauthorized'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(buildError(403, 'Forbidden'));
      return;
    }

    next();
  };
