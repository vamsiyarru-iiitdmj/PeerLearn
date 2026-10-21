/**
 * PeerLearn API client.
 * Calls the NestJS backend via Next.js proxy rewrites (/api/v1/*).
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });

  let data: any;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      `Request failed with status ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }

  // Unwrap NestJS TransformInterceptor: { success: true, data: T }
  if (data && typeof data === "object" && "data" in data && data.success === true) {
    return data.data as T;
  }

  return data as T;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface RegisterStartPayload {
  rollNumber: string;
  fullName: string;
  personalEmail: string;
  instituteEmail: string;
}

export interface RegisterStartResponse {
  message: string;
  instituteEmail: string;
  rollNumber: string;
  devOtpCode?: string;
}

export interface RegisterVerifyPayload {
  rollNumber: string;
  instituteEmail: string;
  otp: string;
  password: string;
}

export interface LoginPayload {
  instituteEmail: string;
  password: string;
}

export interface StudentProfile {
  id: string;
  full_name: string;
  roll_number: string;
  institute_email: string;
  personal_email: string;
  department: string;
  year_of_study: number;
  programme: string;
  current_semester?: number;
  current_cpi?: number;
  current_cgpa?: number;
  target_cgpa?: number;
  photo_url?: string;
  onboarding_completed?: boolean;
}

export interface DetailedProfileResponse {
  student: StudentProfile;
  academics?: {
    currentCgpa: number;
    currentCpi: number;
    completedSemesters: number;
    totalSemesters: number;
    remainingSemesters: number;
    targetCgpa: number;
    requiredAverageCpi?: number;
  };
  skills?: Array<{ id: string; name: string }>;
  proSkills?: Array<{ id: string; name: string }>;
  canUseTutorMode?: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  student?: StudentProfile;
  user?: { id: string; email: string };
  canUseTutorMode?: boolean;
}

export async function apiRegisterStart(payload: RegisterStartPayload) {
  return request<RegisterStartResponse>("/api/v1/auth/register/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiRegisterVerify(payload: RegisterVerifyPayload) {
  const res = await request<{
    message: string;
    student: StudentProfile;
    session: { accessToken: string; refreshToken?: string; user?: any };
  }>("/api/v1/auth/register/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    accessToken: res.session?.accessToken,
    refreshToken: res.session?.refreshToken,
    student: res.student,
    user: res.session?.user,
  } as AuthSession;
}

export async function apiLogin(payload: LoginPayload) {
  return request<AuthSession>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiLogout(token: string) {
  return request<{ message: string }>("/api/v1/auth/logout", {
    method: "POST",
  }, token);
}

// ─── Students / Profile ───────────────────────────────────────────────────

export async function apiGetProfile(token: string): Promise<StudentProfile> {
  const detailed = await request<DetailedProfileResponse>(
    "/api/v1/me/profile",
    { method: "GET" },
    token,
  );

  const student = detailed.student;
  if (detailed.academics) {
    student.current_semester = detailed.academics.completedSemesters;
    student.current_cpi = detailed.academics.currentCpi;
    student.current_cgpa = detailed.academics.currentCgpa;
  }
  return student;
}

// ─── Doubts ────────────────────────────────────────────────────────────────

export interface Doubt {
  id: string;
  title: string;
  description: string;
  expected_outcome?: string;
  status:
    | "OPEN"
    | "BOOKED"
    | "SESSION_COMPLETED_PENDING_CONFIRMATION"
    | "SOLVED"
    | "EXPIRED"
    | "WITHDRAWN"
    | "CANCELLED";
  expires_at: string;
  created_at: string;
  tutor_id?: string;
  tags?: Array<{ id: string; name: string; slug: string }>;
}

export async function apiGetMyDoubts(token: string): Promise<Doubt[]> {
  const res = await request<any>("/api/v1/doubts", { method: "GET" }, token);
  // May return array or paginated object { doubts: [...] }
  return (Array.isArray(res) ? res : res?.doubts || res?.data || []) as Doubt[];
}

export interface PostDoubtPayload {
  title: string;
  description: string;
  expectedOutcome: string;
  skillIds: string[];
  expiresInHours?: number;
}

export async function apiPostDoubt(payload: PostDoubtPayload, token: string) {
  return request<Doubt>("/api/v1/doubts", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function apiWithdrawDoubt(doubtId: string, token: string) {
  return request<{ message: string }>(`/api/v1/doubts/${doubtId}/withdraw`, {
    method: "POST",
  }, token);
}

// ─── Skills ────────────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category?: string;
}

export async function apiGetSkills() {
  return request<Skill[]>("/api/v1/skills", { method: "GET" });
}

// ─── Tasks / Planner ───────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  priority: "Low" | "Medium" | "High";
  is_tough: boolean;
  completed: boolean;
  due_date?: string;
}

export async function apiGetTasks(token: string) {
  const res = await request<any>("/api/v1/tasks", { method: "GET" }, token);
  return Array.isArray(res) ? res : res.tasks || [];
}

export async function apiCreateTask(
  payload: { title: string; priority?: string; isTough?: boolean; dueDate?: string },
  token: string,
) {
  return request<Task>("/api/v1/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function apiToggleTask(id: string, token: string) {
  return request<Task>(`/api/v1/tasks/${id}/complete`, {
    method: "POST",
  }, token);
}

export async function apiToggleTaskTough(id: string, token: string) {
  return request<Task>(`/api/v1/tasks/${id}/toggle-tough`, {
    method: "POST",
  }, token);
}

// ─── Notifications ─────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function apiGetNotifications(token: string) {
  return request<Notification[]>("/api/v1/notifications", { method: "GET" }, token);
}

// ─── Analytics ─────────────────────────────────────────────────────────────

export interface CampusStats {
  totalDoubts: number;
  solvedDoubts: number;
  solvedPercentage: number;
  activeTutors: number;
  sharedResourcesCount?: number;
}

export async function apiGetCampusStats(token?: string) {
  return request<CampusStats>("/api/v1/analytics/overview", { method: "GET" }, token);
}

// ─── Health ────────────────────────────────────────────────────────────────

export async function apiHealth() {
  return request<{ status: string }>("/api/v1/health", { method: "GET" });
}
