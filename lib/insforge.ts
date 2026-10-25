import { createClient, createAdminClient } from "@insforge/sdk";

const INSFORGE_URL =
  process.env.INSFORGE_URL ||
  process.env.NEXT_PUBLIC_INSFORGE_URL ||
  "https://c35py4a8.us-east.insforge.app";

const INSFORGE_ANON_KEY =
  process.env.INSFORGE_ANON_KEY ||
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
  "anon_c3225d1d37792ea21d479def5e79d7d9328e721e1a97a3c4007655e8393a8b53";

const INSFORGE_API_KEY =
  process.env.INSFORGE_API_KEY ||
  "ik_fa11d50c13a48c14fcd786fd165ea331";

export function getInsforgeAdmin() {
  return createAdminClient({
    baseUrl: INSFORGE_URL,
    apiKey: INSFORGE_API_KEY,
  });
}

export function getInsforgeAnon() {
  return createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
  });
}

export function getInsforgeUser(accessToken: string) {
  if (!accessToken) return getInsforgeAnon();
  return createClient({
    baseUrl: INSFORGE_URL,
    accessToken,
  });
}

export async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    const userClient = getInsforgeUser(token);
    const { data, error } = await userClient.auth.getCurrentUser();
    const user = data?.user || (data as any);
    if (error || !user || !user.id) return null;

    const admin = getInsforgeAdmin();
    const { data: students } = await admin.database
      .from("students")
      .select("*")
      .or(`auth_user_id.eq.${user.id},institute_email.eq.${user.email}`)
      .limit(1);

    const student = students && students.length > 0 ? students[0] : null;

    return {
      token,
      user,
      student,
    };
  } catch (err) {
    return null;
  }
}
