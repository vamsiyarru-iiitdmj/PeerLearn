export interface AuthUser {
  id: string; // InsForge Auth user ID
  email: string;
  role?: string;
  accessToken: string;
  studentId?: string; // Resolved application student record UUID
  rollNumber?: string;
  fullName?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
  error?: {
    code: string;
    message: string;
    requestId?: string;
    details?: any;
  };
}
