export interface UserInfo {
  id: number;
  fullName: string;
  role: 'SuperAdmin' | 'BranchManager' | 'Teacher' | 'Parent' | 'Student';
  branchId: number | null;
  preferredLanguage: string;
  phoneNumber: string;
  email: string | null;
  avatarUrl: string | null;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: UserInfo;
}

export interface StudentSummary {
  id: number;
  fullName: string;
  dob?: string | null;
  gender?: string | null;
  parentId?: number | null;
  parentName?: string | null;
  parentPhone?: string | null;
  branchId?: number | null;
  branchName?: string | null;
  school?: string | null;
  grade?: string | null;
  avatarUrl?: string | null;
  status?: string;
}
