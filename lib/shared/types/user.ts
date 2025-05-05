import { z } from 'zod';
import { userLoginSchema, userRegisterSchema, userPasswordResetRequestSchema, userPasswordResetConfirmSchema } from '../validation/user';

export type User = {
  id: string;
  email: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type UserLoginRequest = z.infer<typeof userLoginSchema>;
export type UserRegisterRequest = z.infer<typeof userRegisterSchema>;
export type UserPasswordResetRequestRequest = z.infer<typeof userPasswordResetRequestSchema>;
export type UserPasswordResetConfirmRequest = z.infer<typeof userPasswordResetConfirmSchema>;

export type UserProfile = {
  id: string;
  email: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}; 