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
  phone?: string;
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
    semesterRecords?: Array<{
      semester: number;
      spi?: number;
      cpi?: number;
      credits?: number;
      course_code?: string;
      grade?: string;
    }>;
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

export interface ForgotPasswordPayload {
  instituteEmail: string;
}

export interface ForgotPasswordResponse {
  message: string;
  instituteEmail?: string;
  otp?: string;
  code?: string;
  devOtpCode?: string;
  success?: boolean;
}

export interface ResetPasswordPayload {
  instituteEmail: string;
  otp: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
  success?: boolean;
}

export async function apiForgotPassword(payload: ForgotPasswordPayload) {
  return request<ForgotPasswordResponse>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function apiResetPassword(payload: ResetPasswordPayload) {
  return request<ResetPasswordResponse>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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
  title?: string;
  description: string;
  expectedOutcome: string;
  tagIds?: string[];
  skillIds?: string[];
  expiryHours?: number;
  expiresInHours?: number;
}

export async function apiPostDoubt(payload: PostDoubtPayload, token: string) {
  const body = {
    description: payload.description || payload.title,
    expectedOutcome: payload.expectedOutcome || "Clear conceptual doubt with peer tutor",
    tagIds: payload.tagIds || payload.skillIds || [],
    expiryHours: payload.expiryHours || payload.expiresInHours || 24,
  };
  return request<Doubt>("/api/v1/doubts", {
    method: "POST",
    body: JSON.stringify(body),
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

export interface TaskSubtask {
  id: string;
  title: string;
  is_completed: boolean;
  step_order: number;
}

export interface SuggestionRequestSummary {
  id: string;
  query: string;
  time_available?: string;
  status: string;
}

export interface Task {
  id: string;
  title: string;
  context?: string;
  priority: "Low" | "Medium" | "High" | "LOW" | "MEDIUM" | "HIGH";
  is_tough: boolean;
  completed: boolean;
  status?: string;
  due_date?: string;
  due_at?: string;
  task_subtasks?: TaskSubtask[];
  suggestion_requests?: SuggestionRequestSummary[];
}

export async function apiGetTasks(token: string): Promise<Task[]> {
  const res = await request<any>("/api/v1/tasks", { method: "GET" }, token);
  const tasks = Array.isArray(res) ? res : res.tasks || res.data || [];
  return tasks.map((t: any) => ({
    ...t,
    completed: t.status === "COMPLETED" || t.completed === true,
    due_date: t.due_at || t.due_date,
    priority: t.priority
      ? (t.priority.charAt(0).toUpperCase() + t.priority.slice(1).toLowerCase() as any)
      : "Medium",
  }));
}

export interface CreateTaskPayload {
  title: string;
  context?: string;
  dueAt?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  isTough?: boolean;
}

export async function apiCreateTask(payload: CreateTaskPayload, token: string) {
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

export async function apiDeleteTask(id: string, token: string) {
  return request<{ message: string }>(`/api/v1/tasks/${id}`, {
    method: "DELETE",
  }, token);
}

export async function apiAskSuggestion(
  taskId: string,
  payload: { query: string; timeAvailable?: string; skillIds?: string[] },
  token: string,
) {
  return request<{ message: string; requestId: string }>(`/api/v1/tasks/${taskId}/ask-suggestion`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function apiGetSuggestions(token: string) {
  return request<any[]>("/api/v1/suggestions", { method: "GET" }, token);
}

export async function apiGetSuggestionDetails(id: string, token: string) {
  return request<any>(`/api/v1/suggestions/${id}`, { method: "GET" }, token);
}

export async function apiRespondSuggestion(
  id: string,
  payload: { title: string; description?: string; steps: string[] },
  token: string,
) {
  return request<any>(`/api/v1/suggestions/${id}/respond`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function apiUsePlan(id: string, responseId: string, token: string) {
  return request<any>(`/api/v1/suggestions/${id}/use-plan`, {
    method: "POST",
    body: JSON.stringify({ responseId }),
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

export async function apiMarkNotificationRead(id: string, token: string) {
  return request<{ message: string }>(`/api/v1/notifications/${id}/read`, { method: "PATCH" }, token);
}

export async function apiMarkAllNotificationsRead(token: string) {
  return request<{ message: string }>("/api/v1/notifications/read-all", { method: "POST" }, token);
}

// ─── Tutor Operations ──────────────────────────────────────────────────────

export interface TutorProfileData {
  tutor: {
    id: string;
    fullName: string;
    rollNumber: string;
    department: string;
    yearOfStudy: number;
    phone?: string;
    photoUrl?: string;
  };
  proficiencyScore: number;
  doubtsSolved: number;
  experience: string;
  rank: number | null;
  masteredSkills: Array<{ id: string; name: string; slug: string; category?: string }>;
}

export interface TutorSession {
  id: string;
  doubt_id: string;
  student_id: string;
  tutor_id: string;
  scheduled_start: string;
  scheduled_end: string;
  mode: "ONLINE" | "OFFLINE";
  venue?: string;
  meeting_url?: string;
  status: string;
  student?: {
    id: string;
    full_name: string;
    roll_number: string;
    department: string;
  };
  doubts?: {
    id: string;
    description: string;
    expected_outcome: string;
  };
}

export async function apiGetTutorProfile(token: string): Promise<TutorProfileData> {
  return request<TutorProfileData>("/api/v1/tutor/profile", { method: "GET" }, token);
}

export async function apiGetTutorDoubts(token: string): Promise<Doubt[]> {
  const res = await request<any>("/api/v1/tutor/doubts", { method: "GET" }, token);
  return (Array.isArray(res) ? res : res?.doubts || res?.data || []) as Doubt[];
}

export async function apiGetTutorSessions(token: string): Promise<TutorSession[]> {
  const res = await request<any>("/api/v1/tutor/sessions", { method: "GET" }, token);
  return (Array.isArray(res) ? res : res?.sessions || res?.data || []) as TutorSession[];
}

export async function apiGetStudentSessions(token: string): Promise<TutorSession[]> {
  const res = await request<any>("/api/v1/sessions?mode=student", { method: "GET" }, token);
  return (Array.isArray(res) ? res : res?.sessions || res?.data || []) as TutorSession[];
}

export async function apiGetTutorLeaderboard(token: string) {
  return request<{ leaderboard: any[]; currentTutorPosition: any }>("/api/v1/tutor/leaderboard", { method: "GET" }, token);
}

export async function apiGetTutorProSkills(token: string): Promise<Skill[]> {
  return request<Skill[]>("/api/v1/tutor/pro-skills", { method: "GET" }, token);
}

export async function apiSetTutorProSkills(skillIds: string[], token: string): Promise<Skill[]> {
  return request<Skill[]>("/api/v1/tutor/pro-skills", {
    method: "PUT",
    body: JSON.stringify({ skillIds }),
  }, token);
}

export async function apiBookDoubt(
  doubtId: string,
  payload: {
    scheduledStart: string;
    scheduledEnd: string;
    mode: "ONLINE" | "OFFLINE";
    venue?: string;
    meetingUrl?: string;
  },
  token: string,
) {
  return request<TutorSession>(`/api/v1/doubts/${doubtId}/book`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function apiCompleteSession(sessionId: string, token: string) {
  return request<{ message: string }>(`/api/v1/sessions/${sessionId}/complete`, {
    method: "POST",
  }, token);
}

export async function apiConfirmSession(sessionId: string, token: string) {
  return request<{ message: string }>(`/api/v1/sessions/${sessionId}/confirm`, {
    method: "POST",
  }, token);
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

// ─── Resources ─────────────────────────────────────────────────────────────

export interface ResourceItem {
  id: string;
  bucket_id: string;
  title: string;
  type: "PDF" | "LINK" | "NOTE" | "PHOTO";
  url?: string;
  content?: string;
  created_at: string;
}

export interface ResourceBucket {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  resources: {
    pdfs: ResourceItem[];
    links: ResourceItem[];
    photos: ResourceItem[];
    notes: ResourceItem[];
  };
}

export async function apiGetResources(token: string): Promise<ResourceBucket[]> {
  const res = await request<any>("/api/v1/resources", { method: "GET" }, token);
  return (Array.isArray(res) ? res : res?.buckets || res?.data || []) as ResourceBucket[];
}

export async function apiCreateBucket(payload: { name: string; description?: string }, token: string) {
  return request<any>("/api/v1/resources/buckets", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function apiAddResource(
  payload: { bucketId: string; title: string; type: "PDF" | "LINK" | "NOTE" | "PHOTO"; url?: string; content?: string },
  token: string,
) {
  return request<ResourceItem>("/api/v1/resources", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function apiDeleteResource(id: string, token: string) {
  return request<{ message: string }>(`/api/v1/resources/${id}`, {
    method: "DELETE",
  }, token);
}

export interface SharedResourceProposal {
  id: string;
  title: string;
  description?: string;
  type: string;
  url?: string;
  content?: string;
  target_bucket_name?: string;
  department?: string;
  batch?: string;
  status: "PENDING_VOTES" | "APPROVED" | "REJECTED";
  upvotes_count: number;
  downvotes_count: number;
  expires_at: string;
  created_at: string;
  contributor_id: string;
}

export async function apiGetSharedBuckets(token: string) {
  return request<any[]>("/api/v1/shared-resources", { method: "GET" }, token);
}

export async function apiGetProposals(token: string): Promise<SharedResourceProposal[]> {
  const res = await request<any>("/api/v1/shared-resources/proposals", { method: "GET" }, token);
  return (Array.isArray(res) ? res : res?.proposals || res?.data || []) as SharedResourceProposal[];
}

export async function apiProposeSharedResource(payload: any, token: string) {
  return request<any>("/api/v1/shared-resources/proposals", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function apiVoteProposal(proposalId: string, vote: "UP" | "DOWN", token: string) {
  return request<{ message: string }>(`/api/v1/shared-resources/proposals/${proposalId}/vote`, {
    method: "POST",
    body: JSON.stringify({ vote }),
  }, token);
}

// ─── Profile Target & Academics ──────────────────────────────────────────

export async function apiUpdateTarget(targetCgpa: number, token: string) {
  return request<DetailedProfileResponse>("/api/v1/me/target", {
    method: "PATCH",
    body: JSON.stringify({ targetCgpa }),
  }, token);
}

export interface UpdateProfilePayload {
  phone?: string;
  photoUrl?: string;
  targetCgpa?: number;
}

export async function apiUpdateProfile(payload: UpdateProfilePayload, token: string) {
  return request<any>("/api/v1/me/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

export function formatDate(val?: string | null): string {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(val?: string | null): string {
  if (!val) return "—";
  const d = new Date(val);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export async function apiGetDetailedProfile(token: string): Promise<DetailedProfileResponse> {
  return request<DetailedProfileResponse>("/api/v1/me/profile", { method: "GET" }, token);
}

export async function apiGetAcademics(token: string) {
  return request<any[]>("/api/v1/me/academics", { method: "GET" }, token);
}

// ─── Health ────────────────────────────────────────────────────────────────

export async function apiHealth() {
  return request<{ status: string }>("/api/v1/health", { method: "GET" });
}


