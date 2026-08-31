import React, { useState, useRef } from "react";
import { uploadToCloudinary } from "../lib/cloudinary";
import { UserProfile, updateUser, AVATAR_LIST } from "../lib/userService";
import { useToast } from "../lib/toastContext";
import imageCompression from "browser-image-compression";
import { Copy, Check, ChevronRight, Camera } from "lucide-react"; 

interface Props { user: UserProfile; onUpdate: (u: UserProfile) => void; onBack: () => void; }

export default function EditProfilePage({ user, onUpdate, onBack }: Props) {
  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio,
    gender: user.gender || "Secret",
    birthday: user.birthday || "2000-01-01",
    avatar: user.avatar,
  });

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  
  // Custom Sheet Control matching native app clicks
  const [activeSheet, setActiveSheet] = useState<"gender" | null>(null);

  const { showToast } = useToast();

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Nickname cannot be empty";
    if (form.name.length > 30) errs.name = "Max 30 characters allowed";
    if (form.bio.length > 200) errs.bio = "Bio cannot exceed 200 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.uid);
    setCopied(true);
    showToast("ID Copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(10);
    setUploadStep("Compressing...");

    try {
      let compressed: Blob = file;
      try {
        compressed = await imageCompression(file, {
          maxSizeMB: 0.1,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: "image/jpeg",
          initialQuality: 0.6,
        });
      } catch (ce) {
        console.warn("[DP] Compression failed:", ce);
      }

      setUploadProgress(30);
      setUploadStep("Uploading...");

      const blob = new Blob([compressed], { type: "image/jpeg" });
      const url = await uploadToCloudinary(blob, (pct) => {
        setUploadProgress(30 + Math.round(pct * 0.7));
      });

      setForm(f => ({ ...f, avatar: url }));
      showToast("Photo updated!", "success");
    } catch (err: any) {
      showToast("Upload failed!", "error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const updated: UserProfile = { ...user, ...form };
      await updateUser(user.uid, { 
        name: form.name, 
        bio: form.bio, 
        gender: form.gender, 
        birthday: form.birthday, 
        avatar: form.avatar 
      });
      onUpdate(updated);
      showToast("Changes saved!", "success");
      setTimeout(() => onBack(), 1000);
    } catch (err) {
      showToast("Failed to save changes.", "error");
    } finally {
      setSaving(false);
    }
  };

  const isUrl = form.avatar.startsWith("http") || form.avatar.startsWith("data:");

  return (
    // Pura outer screen background is smooth custom gradient mix as requested
    <div className="page-scroll" style={{ background: "linear-gradient(to bottom, #1c103f, #0f0826)", minHeight: "100vh", color: "#FFFFFF" }}>
      
      {/* --- Native ChaloTalk Style Top Header --- */}
      <div style={{ 
        display: "flex", alignItems: "center", justifyContent: "space-between", padding: "54px 16px 16px", 
        borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(28, 16, 63, 0.95)", position: "sticky", top: 0, zIndex: 100
      }}>
        <button onClick={onBack} style={{
          background: "transparent", border: "none", cursor: "pointer", fontSize: 26, color: "#FFFFFF",
          display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32
        }}>{"\u2039"}</button>
        
        <h1 style={{ fontSize: 16, fontWeight: 600, flex: 1, textAlign: "center", color: "#FFFFFF" }}>Edit Profile</h1>
        
        <button onClick={save} disabled={saving} style={{ 
          background: "transparent", color: saving ? "rgba(255,255,255,0.4)" : "#ff6482", 
          border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer" 
        }}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 20 }}>
        
        {/* --- Center Avatar Container with Edit Camera Trigger --- */}
        <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 15px" }}>
          <div style={{ position: "relative" }}>
            <div onClick={() => fileRef.current?.click()} style={{
              width: 88, height: 88, borderRadius: 44, overflow: "hidden",
              background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
            }}>
              {isUrl ? (
                <img src={form.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 42 }}>{form.avatar}</span>
              )}
            </div>
            {uploading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", borderRadius: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
              </div>
            )}
            {/* Absolute Bottom Pink Camera Badge matching ChaloTalk layout */}
            <div onClick={() => setShowPicker(true)} style={{
              position: "absolute", bottom: -2, right: -2, background: "#ff6482", 
              borderRadius: "50%", padding: 6, border: "2px solid #1c103f", display: "flex", cursor: "pointer"
            }}>
              <Camera size={12} color="#fff" />
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
        </div>

        {/* --- ChaloTalk Styled Block Container (Solid dark transparent background layer) --- */}
        <div style={{ background: "rgba(0, 0, 0, 0.25)", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.04)" }}>
          
          {/* Row 1: Nickname */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 400 }}>Nickname</span>
            <input style={{ background: "transparent", border: "none", color: "#FFFFFF", textAlign: "right", fontSize: 14, fontWeight: 500, outline: "none", width: "60%" }} 
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter nickname" />
          </div>

          {/* Row 2: Account ID Block */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 400 }}>ID</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
                {user.uid.toUpperCase()}
              </span>
              <button onClick={handleCopyId} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", padding: 2 }}>
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Row 3: Gender Row Trigger */}
          <div onClick={() => setActiveSheet("gender")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 400 }}>Gender</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 14, color: "#FFFFFF" }}>{form.gender}</span>
              <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
            </div>
          </div>

          {/* Row 4: Birthday Fields Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", cursor: "pointer" }}>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 400 }}>Birthday</span>
            <input type="date" style={{ background: "transparent", border: "none", color: "#FFFFFF", fontSize: 14, fontWeight: 500, outline: "none", cursor: "pointer", textAlign: "right", colorScheme: "dark" }}
              value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} />
          </div>

        </div>

        {/* --- Bio Form Card Wrapper --- */}
        <div style={{ background: "rgba(0, 0, 0, 0.25)", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14, color: "rgba(255,255,255,0.6)", fontWeight: 400 }}>
            <span>Bio</span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{form.bio.length}/200</span>
          </div>
          <textarea style={{ 
            width: "100%", color: "#FFFFFF", fontSize: 14, background: "transparent", border: "none", outline: "none", resize: "none", padding: 0, lineHeight: "1.4" 
          }} rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Introduce yourself..." />
          {errors.name && <p style={{ fontSize: 12, color: "#ff6482", marginTop: 4 }}>{errors.name}</p>}
          {errors.bio && <p style={{ fontSize: 12, color: "#ff6482", marginTop: 4 }}>{errors.bio}</p>}
        </div>

      </div>

      {/* --- NATIVE BOTTOM SHEET: GENDER FREQUENCY LIST --- */}
      {activeSheet === "gender" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 999 }} onClick={() => setActiveSheet(null)}>
          <div style={{ width: "100%", maxWidth: 420, padding: "20px 16px 30px", background: "#1c123a", borderRadius: "20px 20px 0 0", animation: "slide-up 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 32, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 2, margin: "0 auto 16px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {["Male", "Female", "Secret"].map(g => (
                <button key={g} onClick={() => { setForm(f => ({ ...f, gender: g })); setActiveSheet(null); }} style={{
                  width: "100%", padding: "16px 0", background: "transparent", border: "none",
                  color: form.gender === g ? "#ff6482" : "#FFFFFF", fontSize: 15, fontWeight: form.gender === g ? "600" : "400", textAlign: "center", cursor: "pointer",
                  borderBottom: "1px solid rgba(255,255,255,0.03)"
                }}>{g}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- CHALOTALK STYLE EMOJI PICKER MODAL --- */}
      {showPicker && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 400,
        }} onClick={() => setShowPicker(false)}>
          <div style={{
            width: "100%", maxWidth: 420, borderRadius: "20px 20px 0 0", padding: "20px 16px 30px", 
            background: "#1c123a", borderTop: "1px solid rgba(255,255,255,0.05)"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 32, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 2, margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>Select Avatar Emoji</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              {AVATAR_LIST.map(a => (
                <button key={a} onClick={() => { setForm(f => ({ ...f, avatar: a })); setShowPicker(false); }} style={{
                  width: 50, height: 50, borderRadius: 12, fontSize: 26, border: "none",
                  background: form.avatar === a ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                }}>{a}</button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
