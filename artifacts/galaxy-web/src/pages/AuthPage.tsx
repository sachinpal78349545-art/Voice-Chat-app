import React, { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase";

const logoUrl = `${import.meta.env.BASE_URL}logo.png`;

interface Props { onDone: () => void; }

export default function AuthPage({ onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"main" | "email-login" | "email-signup" | "phone">("main");
  const [emailVal, setEmailVal] = useState("");
  const [passwordVal, setPasswordVal] = useState("");
  const [nameVal, setNameVal] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // ChaloTalk Interceptor Bottom-Sheet States
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Interceptor Check Wrapper
  const checkTermsAndExecute = (action: () => void) => {
    if (!termsAccepted) {
      setPendingAction(() => action);
      setShowTermsModal(true);
    } else {
      action();
    }
  };

  const handleModalAgree = () => {
    setTermsAccepted(true);
    setShowTermsModal(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
      onDone();
    } catch (e: any) {
      if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") {
        setLoading(false);
        return;
      }
      if (e.code === "auth/popup-blocked") {
        setError("Popup blocked. Please allow popups and try again.");
      } else if (e.code === "auth/unauthorized-domain") {
        setError("This domain isn't authorized in Firebase. Add it under Auth → Settings → Authorized domains.");
      } else {
        setError(e.message || "Sign in failed.");
      }
      setLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!nameVal.trim()) { setError("Please enter your name"); return; }
    if (!emailVal.trim() || !passwordVal) { setError("Please fill in all fields"); return; }
    if (passwordVal.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, emailVal.trim(), passwordVal);
      await updateProfile(cred.user, { displayName: nameVal.trim() });
      onDone();
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") setError("Email already registered. Try logging in.");
      else if (e.code === "auth/invalid-email") setError("Invalid email address.");
      else if (e.code === "auth/weak-password") setError("Password too weak. Use at least 6 characters.");
      else setError(e.message || "Signup failed.");
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!emailVal.trim() || !passwordVal) { setError("Please fill in all fields"); return; }
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, emailVal.trim(), passwordVal);
      onDone();
    } catch (e: any) {
      if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") setError("Invalid email or password.");
      else if (e.code === "auth/wrong-password") setError("Incorrect password.");
      else if (e.code === "auth/too-many-requests") setError("Too many attempts. Try again later.");
      else setError(e.message || "Login failed.");
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (phone.length < 10) { setError("Please enter a valid phone number"); return; }
    setOtpLoading(true); setError("");
    await new Promise(r => setTimeout(r, 1500));
    setOtpSent(true); setOtpLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) { setError("Please enter a 6-digit code"); return; }
    setOtpLoading(true); setError("");
    try { await signInAnonymously(auth); onDone(); } catch { setError("Verification failed."); setOtpLoading(false); }
  };

  const goBack = () => { setMode("main"); setError(""); setOtpSent(false); setEmailVal(""); setPasswordVal(""); setNameVal(""); };

  const backBtn = (
    <button onClick={goBack} style={{
      position: "absolute", top: 32, left: 20, background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, width: 40, height: 40,
      cursor: "pointer", fontSize: 20, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10
    }}>{"\u2039"}</button>
  );

  const errorBox = error && (
    <div style={{
      background: "rgba(255,100,130,0.08)", border: "1px solid rgba(255,100,130,0.2)",
      borderRadius: 16, padding: "12px 16px", fontSize: 13, color: "#ff6482", textAlign: "center", width: "100%", lineHeight: 1.5,
    }}>
      {error}
      {error.includes("new tab") && (
        <div style={{ marginTop: 8 }}>
          <a href={window.location.href} target="_blank" rel="noreferrer" style={{ color: "#A29BFE", textDecoration: "underline" }}>
            Open in new tab {"\u2192"}
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      width: "100%", minHeight: "100vh",
      background: "radial-gradient(circle at 50% 25%, #160d33 0%, #080417 70%, #04020a 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
      padding: "40px 24px 30px 24px", boxSizing: "border-box", fontFamily: "system-ui, -apple-system, sans-serif",
      position: "relative", overflow: "hidden"
    }}>
      
      {/* Background Radial Glow */}
      <div style={{
        position: "absolute", top: "25%", left: "50%", transform: "translate(-50%, -50%)",
        width: "300px", height: "300px", background: "rgba(108, 92, 231, 0.15)",
        borderRadius: "50%", filter: "blur(90px)", pointerEvents: "none"
      }} />

      {/* TOP COMPONENT HEADER AREA */}
      <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", zIndex: 5 }}>
        {mode !== "main" && backBtn}
        <button style={{
          background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px", padding: "6px 14px", color: "rgba(255, 255, 255, 0.5)", fontSize: "12px", fontWeight: 500, cursor: "pointer"
        }}>
          Need Help?
        </button>
      </div>

      {/* CONDITIONAL RENDERING INNER VIEWS */}
      <div style={{ width: "100%", maxWidth: "340px", display: "flex", flexDirection: "column", alignItems: "center", gap: 26, zIndex: 2, margin: "auto 0" }}>
        
        {mode === "main" && (
          <>
            <div style={{ textAlign: "center" }}>
              <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
                <img src={logoUrl} alt="Galaxy Voice Chat" onError={(e)=>{(e.target as HTMLElement).style.display='none'}} style={{ width: 90, height: 90, borderRadius: 26, boxShadow: "0 8px 32px rgba(108,92,231,0.3)" }} />
                <div id="fallback-logo" style={{ width: 90, height: 90, borderRadius: 26, background: "#0b061e", border: "2px solid rgba(108,92,231,0.3)", display: "none", alignItems: "center", justifyContent: "center", fontSize: 40, boxShadow: "0 8px 32px rgba(108,92,231,0.3)" }}></div>
              </div>
              <h1 style={{ fontSize: "30px", fontWeight: 900, margin: "0 0 6px 0", background: "linear-gradient(135deg, #ffffff 40%, #b4b0ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Galaxy Voice Chat
              </h1>
              <p style={{ color: "rgba(162,155,254,0.5)", fontSize: "14px", margin: 0 }}>Find your voice, find your galaxy ✨</p>
            </div>

            {/* Feature Badges */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { icon: "🎙️", text: "Live voice rooms with real people" },
                { icon: "🌟", text: "Level up, earn coins & VIP badges" },
              ].map((f) => (
                <div key={f.text} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(108,92,231,0.1)",
                  borderRadius: "18px", padding: "12px 16px"
                }}>
                  <span style={{ fontSize: 20 }}>{f.icon}</span>
                  <span style={{ fontSize: 13, color: "rgba(162,155,254,0.7)", fontWeight: 500 }}>{f.text}</span>
                </div>
              ))}
            </div>

            {/* Actions Stack */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
              {/* GOOGLE BTN */}
              <button 
                onClick={() => checkTermsAndExecute(signInWithGoogle)} 
                disabled={loading} 
                style={{
                  width: "100%", height: "54px", borderRadius: "27px", border: "none", cursor: loading ? "not-allowed" : "pointer",
                  background: "#ffffff", color: "#0b061a", fontSize: "15px", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                  boxShadow: "0 4px 16px rgba(255, 255, 255, 0.05)"
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 2 }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? "Connecting..." : "Continue with Google"}
              </button>

              {/* EMAIL SIGNUP / LOGIN */}
              <button onClick={() => checkTermsAndExecute(() => setMode("email-signup"))} style={{
                width: "100%", height: "52px", borderRadius: "26px", border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #6C5CE7, #8B7CF6)", color: "#fff", fontSize: "15px", fontWeight: 700,
                boxShadow: "0 4px 20px rgba(108,92,231,0.25)"
              }}>
                ✉️ Sign Up with Email
              </button>

              <button onClick={() => checkTermsAndExecute(() => setMode("email-login"))} style={{
                width: "100%", height: "52px", borderRadius: "26px", cursor: "pointer",
                border: "1.5px solid rgba(108,92,231,0.25)", background: "rgba(108,92,231,0.06)", color: "#A29BFE", fontSize: "15px", fontWeight: 700,
              }}>
                🔒 Log In with Email
              </button>

              {/* PHONE BUTTON (STRETCHED TO FULL WIDTH) */}
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <button onClick={() => checkTermsAndExecute(() => setMode("phone"))} style={{
                  flex: 1, height: "46px", borderRadius: "23px", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
                  background: "rgba(255,255,255,0.03)", color: "rgba(162,155,254,0.7)", fontSize: "13px", fontWeight: 700
                }}>
                  📱 Continue with Phone
                </button>
              </div>
            </div>
          </>
        )}

        {mode === "email-signup" && (
          <>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 44, marginBottom: 6 }}>🚀</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Create Account</h2>
              <p style={{ color: "rgba(162,155,254,0.5)", fontSize: 13, marginTop: 4 }}>Join the Galaxy community</p>
            </div>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
              <input style={{ width: "100%", height: "50px", borderRadius: "25px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(108,92,231,0.2)", padding: "0 20px", boxSizing: "border-box", color: "#fff", fontSize: "14px", outline: "none" }} placeholder="Your Name" value={nameVal} onChange={e => setNameVal(e.target.value)} />
              <input style={{ width: "100%", height: "50px", borderRadius: "25px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(108,92,231,0.2)", padding: "0 20px", boxSizing: "border-box", color: "#fff", fontSize: "14px", outline: "none" }} placeholder="Email" type="email" value={emailVal} onChange={e => setEmailVal(e.target.value)} />
              <input style={{ width: "100%", height: "50px", borderRadius: "25px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(108,92,231,0.2)", padding: "0 20px", boxSizing: "border-box", color: "#fff", fontSize: "14px", outline: "none" }} placeholder="Password (min 6 chars)" type="password" value={passwordVal} onChange={e => setPasswordVal(e.target.value)} onKeyDown={e => e.key === "Enter" && handleEmailSignup()} />
              <button onClick={handleEmailSignup} disabled={loading} style={{ width: "100%", height: "52px", borderRadius: "26px", border: "none", background: "linear-gradient(135deg, #6C5CE7, #8B7CF6)", color: "#fff", fontSize: "15px", fontWeight: 800, cursor: "pointer", marginTop: 6 }}>
                {loading ? "Creating..." : "Sign Up"}
              </button>
              <button onClick={() => { setMode("email-login"); setError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#A29BFE", fontSize: 13, fontWeight: 600, padding: 8 }}>Already have an account? Log in</button>
            </div>
          </>
        )}

        {mode === "email-login" && (
          <>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 44, marginBottom: 6 }}>🔒</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Welcome Back</h2>
              <p style={{ color: "rgba(162,155,254,0.5)", fontSize: 13, marginTop: 4 }}>Log in to your account</p>
            </div>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
              <input style={{ width: "100%", height: "50px", borderRadius: "25px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(108,92,231,0.2)", padding: "0 20px", boxSizing: "border-box", color: "#fff", fontSize: "14px", outline: "none" }} placeholder="Email" type="email" value={emailVal} onChange={e => setEmailVal(e.target.value)} />
              <input style={{ width: "100%", height: "50px", borderRadius: "25px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(108,92,231,0.2)", padding: "0 20px", boxSizing: "border-box", color: "#fff", fontSize: "14px", outline: "none" }} placeholder="Password" type="password" value={passwordVal} onChange={e => setPasswordVal(e.target.value)} onKeyDown={e => e.key === "Enter" && handleEmailLogin()} />
              <button onClick={handleEmailLogin} disabled={loading} style={{ width: "100%", height: "52px", borderRadius: "26px", border: "none", background: "linear-gradient(135deg, #6C5CE7, #8B7CF6)", color: "#fff", fontSize: "15px", fontWeight: 800, cursor: "pointer", marginTop: 6 }}>
                {loading ? "Logging in..." : "Log In"}
              </button>
              <button onClick={() => { setMode("email-signup"); setError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#A29BFE", fontSize: 13, fontWeight: 600, padding: 8 }}>Don't have an account? Sign up</button>
            </div>
          </>
        )}

        {mode === "phone" && (
          <>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 44, marginBottom: 6 }}>📱</div>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>{otpSent ? "Enter Code" : "Phone Login"}</h2>
              <p style={{ color: "rgba(162,155,254,0.5)", fontSize: 13, marginTop: 4, lineHeight: 1.4 }}>
                {otpSent ? `We sent a code to ${phone}` : "Enter your phone number to get started"}
              </p>
            </div>
            {!otpSent ? (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
                <input style={{ width: "100%", height: "52px", borderRadius: "26px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(108,92,231,0.2)", padding: "0 20px", boxSizing: "border-box", color: "#fff", fontSize: "16px", textAlign: "center", letterSpacing: 1, outline: "none" }} placeholder="+91 XXXXX XXXXX" value={phone} onChange={e => setPhone(e.target.value)} type="tel" />
                <button onClick={handleSendOTP} disabled={otpLoading} style={{ width: "100%", height: "52px", borderRadius: "26px", border: "none", background: "linear-gradient(135deg, #6C5CE7, #8B7CF6)", color: "#fff", fontSize: "15px", fontWeight: 800, cursor: "pointer" }}>
                  {otpLoading ? "Sending..." : "Send Code"}
                </button>
              </div>
            ) : (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <input key={i} maxLength={1} value={otpCode[i] || ""}
                      onChange={e => {
                        const val = e.target.value;
                        if (val.length <= 1 && /^\d*$/.test(val)) {
                          const newCode = otpCode.split(""); newCode[i] = val; setOtpCode(newCode.join(""));
                          if (val && i < 5) { const next = e.target.nextElementSibling as HTMLInputElement; next?.focus(); }
                        }
                      }}
                      style={{
                        width: 44, height: 50, borderRadius: 12, border: "1.5px solid rgba(108,92,231,0.3)",
                        background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 20, fontWeight: 800,
                        textAlign: "center", outline: "none"
                      }}
                    />
                  ))}
                </div>
                <button onClick={handleVerifyOTP} disabled={otpLoading} style={{ width: "100%", height: "52px", borderRadius: "26px", border: "none", background: "linear-gradient(135deg, #6C5CE7, #8B7CF6)", color: "#fff", fontSize: "15px", fontWeight: 800, cursor: "pointer" }}>
                  {otpLoading ? "Verifying..." : "Verify"}
                </button>
                <p style={{ fontSize: 12, color: "rgba(162,155,254,0.4)", textAlign: "center", margin: 0 }}>Demo mode: any 6-digit code works</p>
              </div>
            )}
          </>
        )}

        {/* ERROR DISPLAYER AREA */}
        {errorBox}
      </div>

      {/* STATIC FOOTER (IF CHECKBOX NOT SELECTED) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", zIndex: 2, pointerEvents: mode === "main" ? "auto" : "none", opacity: mode === "main" ? 1 : 0.4 }}>
        <input 
          type="checkbox" 
          id="termsCheck"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          style={{ accentColor: "#6C5CE7", width: "15px", height: "15px", cursor: "pointer" }}
        />
        <label htmlFor="termsCheck" style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.4)", cursor: "pointer" }}>
          I agree to <span style={{ color: "rgba(255,255,255,0.6)", textDecoration: "underline" }}>Terms of Use</span> & <span style={{ color: "rgba(255,255,255,0.6)", textDecoration: "underline" }}>Privacy Policy</span>
        </label>
      </div>

      {/* CHALOTALK PREMIUM DYNAMIC BOTTOM SHEET PROMPT */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        maxWidth: "480px", margin: "0 auto", zIndex: 1000,
        background: "#ffffff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px",
        padding: "24px 24px 34px 24px", boxSizing: "border-box",
        transform: showTermsModal ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.28s cubic-bezier(0.1, 0.88, 0.3, 1)",
        boxShadow: "0 -12px 40px rgba(0,0,0,0.5)",
        color: "#0f0b21"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "#110a29" }}>
              Please read and agree
            </h2>
          </div>
          <button onClick={() => setShowTermsModal(false)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        <p style={{ fontSize: "14px", color: "#4b5563", margin: "0 0 24px 0", lineHeight: "1.5", textAlign: "left" }}>
          By continuing, you agree to our <span style={{ color: "#6C5CE7", fontWeight: 600, textDecoration: "underline" }}>Terms of Use</span> and <span style={{ color: "#6C5CE7", fontWeight: 600, textDecoration: "underline" }}>Privacy Policy</span>. Your personal data is encrypted and secure.
        </p>

        <button 
          onClick={handleModalAgree}
          style={{
            width: "100%", height: "50px", borderRadius: "25px", border: "none",
            background: "#6C5CE7", color: "#ffffff", fontSize: "15px", fontWeight: 700,
            cursor: "pointer", boxShadow: "0 4px 14px rgba(108,92,231,0.3)"
          }}
        >
          Agree and continue
        </button>
      </div>

      {/* SCREEN BLUR OVERLAY */}
      {showTermsModal && (
        <div 
          onClick={() => setShowTermsModal(false)} 
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)", zIndex: 990 }} 
        />
      )}
    </div>
  );
}
