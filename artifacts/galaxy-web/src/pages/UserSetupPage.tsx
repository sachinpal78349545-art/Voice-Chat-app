import { useState } from "react";
import { User as FBUser } from "firebase/auth";
import { updateUser } from "../lib/userService";
import { useToast } from "../lib/toastContext";

interface Props {
  user: FBUser;
  onComplete: () => void;
}

const COUNTRIES = ["India", "USA", "UK", "Canada", "Australia", "Dubai", "Singapore"];

export default function UserSetupPage({ user, onComplete }: Props) {
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [gender, setGender] = useState("Male");
  const [country, setCountry] = useState("India");
  const [dob, setDob] = useState("2008-01-01");
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      showToast("Please enter your name", "warning", "✏️");
      return;
    }
    setSaving(true);
    try {
      await updateUser(user.uid, {
        name: trimmed,
        gender,
        country,
        birthday: dob,
        profileCompleted: true,
        createdAt: Date.now(),
        email: user.email || "",
        uid: user.uid,
      });
      onComplete();
    } catch (err) {
      console.error("Setup save error:", err);
      showToast("Couldn't save profile. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #1a0f2e, #0a0418)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "'Poppins', 'Inter', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient glow orbs */}
      <div style={{
        position: "absolute", top: "10%", left: "15%",
        width: 260, height: 260, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(108,92,231,0.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "15%", right: "10%",
        width: 200, height: 200, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,206,201,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Card */}
      <div style={{
        width: "100%",
        maxWidth: 400,
        background: "rgba(255,255,255,0.035)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        padding: "36px 28px 32px",
        boxShadow: "0 8px 60px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.04)",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 10, lineHeight: 1 }}>👋</div>
          <h1 style={{
            fontSize: 22, fontWeight: 900, color: "#fff",
            margin: "0 0 8px", letterSpacing: "-0.3px",
          }}>Welcome to Chalotalk</h1>
          <p style={{
            fontSize: 13, color: "rgba(162,155,254,0.65)",
            margin: 0, lineHeight: 1.55,
          }}>Complete personal profile and get to know more friends</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              placeholder="Silent Jadoo"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={30}
              style={inputStyle}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(108,92,231,0.7)"; }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
            />
          </div>

          {/* Gender */}
          <div>
            <label style={labelStyle}>Gender</label>
            <div style={{ display: "flex", gap: 10 }}>
              {(["Male", "Female"] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 12,
                    fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                    cursor: "pointer", transition: "all 0.2s",
                    background: gender === g
                      ? "linear-gradient(135deg, rgba(191,0,255,0.18), rgba(108,92,231,0.18))"
                      : "rgba(255,255,255,0.04)",
                    border: gender === g
                      ? "1.5px solid #bf00ff"
                      : "1.5px solid rgba(255,255,255,0.08)",
                    color: gender === g ? "#d580ff" : "rgba(162,155,254,0.5)",
                    boxShadow: gender === g ? "0 0 16px rgba(191,0,255,0.2)" : "none",
                  }}
                >
                  {g === "Male" ? "👦 Male" : "👧 Female"}
                </button>
              ))}
            </div>
          </div>

          {/* Country */}
          <div>
            <label style={labelStyle}>Country</label>
            <div style={{ position: "relative" }}>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                style={{
                  ...inputStyle,
                  appearance: "none",
                  WebkitAppearance: "none",
                  paddingRight: 36,
                  cursor: "pointer",
                }}
              >
                {COUNTRIES.map(c => (
                  <option key={c} value={c} style={{ background: "#1a0f2e" }}>{c}</option>
                ))}
              </select>
              <span style={{
                position: "absolute", right: 14, top: "50%",
                transform: "translateY(-50%)", pointerEvents: "none",
                fontSize: 12, color: "rgba(162,155,254,0.5)",
              }}>▼</span>
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label style={labelStyle}>Date of Birth</label>
            <input
              type="date"
              value={dob}
              max={new Date().toISOString().split("T")[0]}
              onChange={e => setDob(e.target.value)}
              style={{
                ...inputStyle,
                colorScheme: "dark",
              }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              marginTop: 6,
              width: "100%",
              padding: "15px 0",
              borderRadius: 16,
              border: "none",
              background: saving
                ? "rgba(108,92,231,0.3)"
                : "linear-gradient(135deg, #7c3aed 0%, #6C5CE7 45%, #00cec9 100%)",
              color: "#fff",
              fontFamily: "inherit",
              fontSize: 16,
              fontWeight: 800,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.7 : 1,
              boxShadow: saving ? "none" : "0 4px 24px rgba(108,92,231,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
              transition: "all 0.2s",
              letterSpacing: "0.3px",
            }}
          >
            {saving ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 8,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  display: "inline-block",
                  animation: "spin 0.7s linear infinite",
                }} />
                Saving...
              </span>
            ) : "Next →"}
          </button>
        </div>

        {/* Bottom hint */}
        <p style={{
          textAlign: "center", marginTop: 20, marginBottom: 0,
          fontSize: 11, color: "rgba(162,155,254,0.3)", lineHeight: 1.5,
        }}>
          Your information is private and secure 🔒
        </p>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "rgba(162,155,254,0.6)",
  marginBottom: 7,
  letterSpacing: "0.3px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  color: "#fff",
  fontSize: 14,
  fontFamily: "'Poppins', 'Inter', sans-serif",
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};
