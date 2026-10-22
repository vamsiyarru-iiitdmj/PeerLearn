"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import {
  apiRegisterStart,
  apiRegisterVerify,
  apiForgotPassword,
  apiResetPassword,
  ApiError,
} from "../../lib/api";

type Tab = "login" | "register" | "forgot";
type RegStep = "start" | "verify";
type ForgotStep = "request" | "verify";

export default function LoginPage() {
  const { login, loading, error, clearError, token, setSession } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (token) router.replace("/");
  }, [token, router]);

  const [tab, setTab] = useState<Tab>("login");

  // ── Login form ──────────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login({ instituteEmail: loginEmail.trim(), password: loginPassword });
  };

  // ── Forgot Password form ────────────────────────────────────────────────
  const [forgotStep, setForgotStep] = useState<ForgotStep>("request");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);
    try {
      const res = await apiForgotPassword({ instituteEmail: forgotEmail.trim() });
      const msg = res.devOtpCode
        ? `${res.message} (Dev OTP: ${res.devOtpCode})`
        : res.message || "OTP sent to your institute email!";
      setForgotSuccess(msg);
      if (res.devOtpCode) {
        setForgotOtp(res.devOtpCode);
      }
      setForgotStep("verify");
    } catch (err) {
      setForgotError(err instanceof ApiError ? err.message : "Failed to send reset OTP. Check your institute email.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    if (forgotNewPassword.length < 6) {
      setForgotError("Password must be at least 6 characters.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }
    setForgotLoading(true);
    try {
      await apiResetPassword({
        instituteEmail: forgotEmail.trim(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword,
      });
      setForgotSuccess("Password reset successfully! Redirecting to sign in…");
      setLoginEmail(forgotEmail.trim());
      setLoginPassword(forgotNewPassword);
      setTimeout(() => {
        setTab("login");
        setForgotStep("request");
        setForgotOtp("");
        setForgotNewPassword("");
        setForgotConfirmPassword("");
        setForgotSuccess(null);
      }, 1500);
    } catch (err) {
      setForgotError(err instanceof ApiError ? err.message : "Password reset failed. Check your OTP.");
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Register form ───────────────────────────────────────────────────────
  const [regStep, setRegStep] = useState<RegStep>("start");
  const [regRoll, setRegRoll] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regPersonalEmail, setRegPersonalEmail] = useState("");
  const [regInstituteEmail, setRegInstituteEmail] = useState("");
  const [regOtp, setRegOtp] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  const handleRegisterStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);
    setRegLoading(true);
    try {
      const res = await apiRegisterStart({
        rollNumber: regRoll.trim().toUpperCase(),
        fullName: regFullName.trim(),
        personalEmail: regPersonalEmail.trim(),
        instituteEmail: regInstituteEmail.trim(),
      });
      const msg = res.devOtpCode
        ? `${res.message} (Dev OTP: ${res.devOtpCode})`
        : res.message || "OTP sent to your institute email!";
      setRegSuccess(msg);
      if (res.devOtpCode) {
        setRegOtp(res.devOtpCode);
      }
      setRegStep("verify");
    } catch (err) {
      setRegError(err instanceof ApiError ? err.message : "Registration failed. Try again.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleRegisterVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegLoading(true);
    try {
      const session = await apiRegisterVerify({
        rollNumber: regRoll.trim().toUpperCase(),
        instituteEmail: regInstituteEmail.trim(),
        otp: regOtp.trim(),
        password: regPassword,
      });
      setRegSuccess("Account created successfully!");
      setSession(session);
      router.push("/");
    } catch (err) {
      setRegError(err instanceof ApiError ? err.message : "Verification failed. Check your OTP.");
    } finally {
      setRegLoading(false);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    clearError();
    setRegError(null);
    setRegSuccess(null);
    setRegStep("start");
    setForgotError(null);
    setForgotSuccess(null);
    setForgotStep("request");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-surface)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      {/* Background pattern */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(18,62,58,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 440,
          position: "relative",
          zIndex: 1,
        }}
        className="animate-in"
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: "var(--color-primary-container)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(18,62,58,0.18)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-newsreader)",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--color-on-primary)",
              }}
            >
              PL
            </span>
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-newsreader)",
                fontSize: 24,
                fontWeight: 500,
                color: "var(--color-primary)",
                lineHeight: 1,
              }}
            >
              PeerLearn
            </div>
            <div
              style={{
                fontFamily: "var(--font-jakarta)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-on-surface-variant)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              IIITDMJ · Peer Tutoring Network
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: "2rem" }}>
          {/* Tab switcher / Back button */}
          {tab === "forgot" ? (
            <div style={{ marginBottom: "1.5rem" }}>
              <button
                type="button"
                onClick={() => switchTab("login")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-primary)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 0",
                  marginBottom: "1rem",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                Back to Sign In
              </button>
              <h2
                style={{
                  fontFamily: "var(--font-newsreader)",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--color-primary)",
                  margin: 0,
                }}
              >
                Reset Password
              </h2>
              <p style={{ fontSize: 13, color: "var(--color-on-surface-variant)", marginTop: 4, marginBottom: 0 }}>
                {forgotStep === "request"
                  ? "Enter your verified IIITDMJ institute email to receive a 6-digit OTP."
                  : `Enter the OTP sent to ${forgotEmail} and set your new password.`}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                backgroundColor: "var(--color-surface-container)",
                borderRadius: "var(--radius-md)",
                padding: 4,
                marginBottom: "1.75rem",
              }}
            >
              {(["login", "register"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "var(--radius)",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-jakarta)",
                    fontSize: 14,
                    fontWeight: 600,
                    transition: "all 0.15s ease",
                    backgroundColor:
                      tab === t
                        ? "var(--color-surface-container-lowest)"
                        : "transparent",
                    color:
                      tab === t
                        ? "var(--color-primary)"
                        : "var(--color-on-surface-variant)",
                    boxShadow:
                      tab === t ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
                  }}
                >
                  {t === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>
          )}

          {/* ── FORGOT PASSWORD FLOW ────────────────────────────────────── */}
          {tab === "forgot" && forgotStep === "request" && (
            <form onSubmit={handleForgotRequest} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <InfoBox message="A 6-digit verification code will be sent to your official @iiitdmj.ac.in inbox." />

              <div>
                <label htmlFor="forgot-email" style={labelStyle}>Institute Email</label>
                <input
                  id="forgot-email"
                  name="instituteEmail"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="rollno@iiitdmj.ac.in"
                  required
                  style={inputStyle}
                  autoComplete="email"
                />
              </div>

              {forgotError && <ErrorBox message={forgotError} />}
              {forgotSuccess && <SuccessBox message={forgotSuccess} />}

              <button
                type="submit"
                disabled={forgotLoading}
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: 4, opacity: forgotLoading ? 0.7 : 1 }}
              >
                {forgotLoading ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>
                      progress_activity
                    </span>
                    Sending OTP…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
                    Send Reset OTP
                  </>
                )}
              </button>
            </form>
          )}

          {tab === "forgot" && forgotStep === "verify" && (
            <form onSubmit={handleForgotReset} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {forgotSuccess && <SuccessBox message={forgotSuccess} />}

              <div>
                <label htmlFor="forgot-otp" style={labelStyle}>6-Digit OTP</label>
                <input
                  id="forgot-otp"
                  name="otp"
                  type="text"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  required
                  style={{
                    ...inputStyle,
                    letterSpacing: "0.25em",
                    fontWeight: 700,
                    fontSize: 16,
                    textAlign: "center",
                  }}
                  autoComplete="one-time-code"
                />
              </div>

              <div>
                <label htmlFor="forgot-new-password" style={labelStyle}>New Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="forgot-new-password"
                    name="newPassword"
                    type={showForgotPw ? "text" : "password"}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    style={{ ...inputStyle, paddingRight: 44 }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForgotPw((v) => !v)}
                    style={pwToggleStyle}
                    tabIndex={-1}
                    aria-label={showForgotPw ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {showForgotPw ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="forgot-confirm-password" style={labelStyle}>Confirm New Password</label>
                <input
                  id="forgot-confirm-password"
                  name="confirmPassword"
                  type={showForgotPw ? "text" : "password"}
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  minLength={6}
                  style={inputStyle}
                  autoComplete="new-password"
                />
              </div>

              {forgotError && <ErrorBox message={forgotError} />}

              <button
                type="submit"
                disabled={forgotLoading}
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: 4, opacity: forgotLoading ? 0.7 : 1 }}
              >
                {forgotLoading ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>
                      progress_activity
                    </span>
                    Resetting Password…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock_reset</span>
                    Reset Password & Sign In
                  </>
                )}
              </button>

              <div style={{ textAlign: "center", marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setForgotStep("request")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-primary)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Didn&apos;t receive code? Resend OTP
                </button>
              </div>
            </form>
          )}

          {/* ── LOGIN FORM ──────────────────────────────────────────────── */}
          {tab === "login" && (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label htmlFor="login-email" style={labelStyle}>Institute Email</label>
                <input
                  id="login-email"
                  name="instituteEmail"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="rollno@iiitdmj.ac.in"
                  required
                  style={inputStyle}
                  autoComplete="email"
                />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label htmlFor="login-password" style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(loginEmail);
                      switchTab("forgot");
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-primary)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    id="login-password"
                    name="password"
                    type={showLoginPw ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Your password"
                    required
                    style={{ ...inputStyle, paddingRight: 44 }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPw((v) => !v)}
                    style={pwToggleStyle}
                    tabIndex={-1}
                    aria-label={showLoginPw ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {showLoginPw ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {error && <ErrorBox message={error} />}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: 4, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>
                      progress_activity
                    </span>
                    Signing in…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span>
                    Sign In
                  </>
                )}
              </button>

              <p style={{ textAlign: "center", fontSize: 12, color: "var(--color-on-surface-variant)", marginTop: 4 }}>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchTab("register")}
                  style={{ color: "var(--color-secondary)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
                >
                  Register with your roll number
                </button>
              </p>
            </form>
          )}

          {/* ── REGISTER FORM — Step 1: Start ────────────────────────────── */}
          {tab === "register" && regStep === "start" && (
            <form onSubmit={handleRegisterStart} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <InfoBox message="Registration requires your official IIITDMJ roll number and institute email to link your academic record." />
              <div>
                <label style={labelStyle}>Roll Number</label>
                <input
                  type="text"
                  value={regRoll}
                  onChange={(e) => setRegRoll(e.target.value.toUpperCase())}
                  placeholder="e.g. 2022CSE001"
                  required
                  style={inputStyle}
                  autoComplete="off"
                />
              </div>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Vamsi Yarru"
                  required
                  style={inputStyle}
                  autoComplete="name"
                />
              </div>
              <div>
                <label style={labelStyle}>Personal Email</label>
                <input
                  type="email"
                  value={regPersonalEmail}
                  onChange={(e) => setRegPersonalEmail(e.target.value)}
                  placeholder="e.g. personal@gmail.com"
                  required
                  style={inputStyle}
                  autoComplete="email"
                />
              </div>
              <div>
                <label style={labelStyle}>Institute Email</label>
                <input
                  type="email"
                  value={regInstituteEmail}
                  onChange={(e) => setRegInstituteEmail(e.target.value)}
                  placeholder="e.g. 2022cse001@iiitdmj.ac.in"
                  required
                  style={inputStyle}
                  autoComplete="email"
                />
              </div>

              {regError && <ErrorBox message={regError} />}
              {regSuccess && <SuccessBox message={regSuccess} />}

              <button
                type="submit"
                disabled={regLoading}
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: 4, opacity: regLoading ? 0.7 : 1 }}
              >
                {regLoading ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>
                      progress_activity
                    </span>
                    Verifying…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>mail</span>
                    Send OTP to Institute Email
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── REGISTER FORM — Step 2: Verify OTP ─────────────────────── */}
          {tab === "register" && regStep === "verify" && (
            <form onSubmit={handleRegisterVerify} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <SuccessBox message={`OTP sent to ${regInstituteEmail}. Check your inbox or dev code above.`} />
              <div>
                <label style={labelStyle}>OTP Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={regOtp}
                  onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  maxLength={6}
                  required
                  style={{ ...inputStyle, letterSpacing: "0.25em", textAlign: "center", fontSize: 20 }}
                  autoComplete="one-time-code"
                />
              </div>
              <div>
                <label style={labelStyle}>Set Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showRegPw ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    minLength={6}
                    required
                    style={{ ...inputStyle, paddingRight: 44 }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPw((v) => !v)}
                    style={pwToggleStyle}
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {showRegPw ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {regError && <ErrorBox message={regError} />}

              <button
                type="submit"
                disabled={regLoading || loading}
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", marginTop: 4, opacity: (regLoading || loading) ? 0.7 : 1 }}
              >
                {(regLoading || loading) ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, animation: "spin 1s linear infinite" }}>
                      progress_activity
                    </span>
                    Creating account…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified_user</span>
                    Verify & Create Account
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setRegStep("start"); setRegError(null); setRegSuccess(null); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-on-surface-variant)", fontSize: 12, textDecoration: "underline" }}
              >
                ← Back to change details
              </button>
            </form>
          )}
        </div>

        {/* Footer note */}
        <p
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "var(--color-on-surface-variant)",
            marginTop: "1rem",
            fontFamily: "var(--font-jakarta)",
          }}
        >
          Only students with a valid <strong>@iiitdmj.ac.in</strong> email and official academic record can register.
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Shared style objects ──────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-jakarta)",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-on-surface-variant)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 0.875rem",
  borderRadius: "var(--radius)",
  border: "1px solid var(--color-outline-variant)",
  backgroundColor: "var(--color-surface-container-lowest)",
  color: "var(--color-on-surface)",
  fontFamily: "var(--font-jakarta)",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.15s ease",
  boxSizing: "border-box",
};

const pwToggleStyle: React.CSSProperties = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--color-on-surface-variant)",
  display: "flex",
  alignItems: "center",
  padding: 4,
};

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "0.625rem 0.875rem",
        borderRadius: "var(--radius)",
        backgroundColor: "var(--color-error-container)",
        color: "var(--color-on-error-container)",
        fontFamily: "var(--font-jakarta)",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16, flexShrink: 0 }}>error</span>
      {message}
    </div>
  );
}

function InfoBox({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "0.625rem 0.875rem",
        borderRadius: "var(--radius)",
        backgroundColor: "var(--color-surface-container)",
        color: "var(--color-on-surface-variant)",
        fontFamily: "var(--font-jakarta)",
        fontSize: 12,
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>info</span>
      {message}
    </div>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "0.625rem 0.875rem",
        borderRadius: "var(--radius)",
        backgroundColor: "#e8f4ee",
        color: "#1a6842",
        border: "1px solid #b4d9c5",
        fontFamily: "var(--font-jakarta)",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16, flexShrink: 0 }}>check_circle</span>
      {message}
    </div>
  );
}
