export interface AuthResponse {
  id: string;
  role: string;
}

export interface LoginCredentials {
  loginId: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  email: string;
  confirmPassword: string;
} 