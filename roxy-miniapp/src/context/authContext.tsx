import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import axiosClient, { setOnUnauthorizedHandler } from '@/api/axiosClient';
import type { StudentSummary, UserInfo } from '@/types/auth';
import {
  clearAuthSession,
  loadAuthSession,
  loadStorageData,
  saveAuthSession,
  saveStorageData,
  STORAGE_KEYS,
} from '@/utils/storage';

interface AuthContextValue {
  initializing: boolean;
  isAuthenticated: boolean;
  user: UserInfo | null;
  students: StudentSummary[];
  studentsLoading: boolean;
  activeStudent: StudentSummary | null;
  selectStudent: (studentId: number) => void;
  completeLogin: (payload: {
    accessToken: string;
    expiresAt: string;
    user: UserInfo;
  }) => Promise<void>;
  refreshProfileAndStudents: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [activeStudentId, setActiveStudentId] = useState<number | null>(null);

  const fetchStudentsList = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const res = await axiosClient.get('/Students', {
        params: { page: 1, pageSize: 50 },
      });
      const data = res.data;
      const list: StudentSummary[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
      setStudents(list);

      const stored = await loadStorageData([STORAGE_KEYS.ACTIVE_STUDENT_ID]);
      const savedId = stored[STORAGE_KEYS.ACTIVE_STUDENT_ID]
        ? Number(stored[STORAGE_KEYS.ACTIVE_STUDENT_ID])
        : null;

      if (savedId && list.some((s) => s.id === savedId)) {
        setActiveStudentId(savedId);
      } else if (list.length > 0) {
        setActiveStudentId(list[0].id);
        await saveStorageData({
          [STORAGE_KEYS.ACTIVE_STUDENT_ID]: list[0].id,
        });
      } else {
        setActiveStudentId(null);
      }
    } catch {
      setStudents([]);
      setActiveStudentId(null);
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const refreshProfileAndStudents = useCallback(async () => {
    const meRes = await axiosClient.get<UserInfo>('/Auth/me');
    const verifiedUser = meRes.data;
    setUser(verifiedUser);

    const currentSession = await loadAuthSession();
    if (currentSession.accessToken && currentSession.expiresAt) {
      await saveAuthSession({
        accessToken: currentSession.accessToken,
        expiresAt: currentSession.expiresAt,
        user: verifiedUser,
      });
    }

    await fetchStudentsList();
  }, [fetchStudentsList]);

  const logout = useCallback(async () => {
    await clearAuthSession();
    setUser(null);
    setStudents([]);
    setActiveStudentId(null);
  }, []);

  useEffect(() => {
    setOnUnauthorizedHandler(() => {
      setUser(null);
      setStudents([]);
      setActiveStudentId(null);
    });
    return () => setOnUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let ignore = false;

    const bootstrap = async () => {
      setInitializing(true);
      try {
        const session = await loadAuthSession();
        const hasValidExpiry =
          session.expiresAt &&
          !Number.isNaN(new Date(session.expiresAt).getTime()) &&
          new Date(session.expiresAt) > new Date();

        if (session.accessToken && hasValidExpiry) {
          if (session.user && !ignore) {
            setUser(session.user);
          }
          try {
            const meRes = await axiosClient.get<UserInfo>('/Auth/me');
            if (!ignore) {
              setUser(meRes.data);
              await saveAuthSession({
                accessToken: session.accessToken,
                expiresAt: session.expiresAt!,
                user: meRes.data,
              });
              await fetchStudentsList();
            }
          } catch {
            if (!ignore) {
              await clearAuthSession();
              setUser(null);
              setStudents([]);
              setActiveStudentId(null);
            }
          }
        } else {
          await clearAuthSession();
          if (!ignore) {
            setUser(null);
            setStudents([]);
            setActiveStudentId(null);
          }
        }
      } finally {
        if (!ignore) {
          setInitializing(false);
        }
      }
    };

    bootstrap();

    return () => {
      ignore = true;
    };
  }, [fetchStudentsList]);

  const completeLogin = useCallback(
    async (payload: {
      accessToken: string;
      expiresAt: string;
      user: UserInfo;
    }) => {
      await saveAuthSession(payload);
      setUser(payload.user);
      try {
        const meRes = await axiosClient.get<UserInfo>('/Auth/me');
        if (meRes.data) {
          setUser(meRes.data);
          await saveAuthSession({
            accessToken: payload.accessToken,
            expiresAt: payload.expiresAt,
            user: meRes.data,
          });
        }
      } catch {
        // Keep user from login response if /Auth/me fails transiently
      }
      await fetchStudentsList();
    },
    [fetchStudentsList]
  );

  const selectStudent = useCallback((studentId: number) => {
    setActiveStudentId(studentId);
    saveStorageData({
      [STORAGE_KEYS.ACTIVE_STUDENT_ID]: studentId,
    });
  }, []);

  const activeStudent =
    students.find((s) => s.id === activeStudentId) ||
    (students.length > 0 ? students[0] : null);

  return (
    <AuthContext.Provider
      value={{
        initializing,
        isAuthenticated: Boolean(user),
        user,
        students,
        studentsLoading,
        activeStudent,
        selectStudent,
        completeLogin,
        refreshProfileAndStudents,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
