/**
 * OfficialFramesPage – Admin panel page to manage frame images for Official and Official Host roles
 * Now supports direct Cloudinary upload (using `Profile_pic` preset)
 */
import { useState, useEffect, useRef } from "react";
import { ref, get, set, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, Shield, Upload, Trash2, RefreshCw, Info, ImagePlus } from "lucide-react";

interface OfficialFrameConfig {
  url: string;
  updatedAt: number;
  note?: string;
}

// ─── Cloudinary Config ──────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "dz1bhfpkc";
const CLOUDINARY_UPLOAD_PRESET = "Profile_pic"; // 👈 यह आपके Cloudinary में बना हुआ है

// ─── Cloudinary Upload Button Component ─────────────────────────
function UploadImageButton({ onUploaded, itemId }: { onUploaded: (url: string) => void; itemId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Only image files allowed"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Max 5MB"); return; }
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "Upload failed");
      }

      const data = await response.json();
      const url = data.secure_url;
      console.log("✅ Cloudinary upload success:", url);
      onUploaded(url);
    } catch (err: any) {
      console.error("❌ Cloudinary upload error:", err);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full h-10 border-dashed border-primary/40 text-primary hover:bg-primary/10 text-xs gap-2"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        <ImagePlus className="w-4 h-4" />
        {uploading ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Uploading...
          </span>
        ) : (
          "📱 Upload from Gallery"
        )}
      </Button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

export default function OfficialFramesPage() {
  const { toast } = useToast();
  const { isDemo, showDemoBlock } = useAdmin();

  const [hostFrameUrl, setHostFrameUrl]     = useState("");
  const [officialFrameUrl, setOfficialFrameUrl] = useState("");
  const [savedHost, setSavedHost]           = useState<OfficialFrameConfig | null>(null);
  const [savedOfficial, setSavedOfficial]   = useState<OfficialFrameConfig | null>(null);
  const [loading, setLoading]               = useState(false);
  const [loadingPage, setLoadingPage]       = useState(true);

  async function loadFrames() {
    setLoadingPage(true);
    try {
      const [hostSnap, offSnap] = await Promise.all([
        get(ref(db, "appConfig/officialFrames/officialHost")),
        get(ref(db, "appConfig/officialFrames/official")),
      ]);
      if (hostSnap.exists()) setSavedHost(hostSnap.val());
      if (offSnap.exists()) setSavedOfficial(offSnap.val());
    } catch {
      toast({ title: "Error loading frames", variant: "destructive" });
    }
    setLoadingPage(false);
  }

  useEffect(() => { loadFrames(); }, []);

  async function saveFrame(role: "officialHost" | "official", url: string) {
    if (isDemo) { showDemoBlock(); return; }
    if (!url.trim()) { toast({ title: "Please enter an image URL", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const data: OfficialFrameConfig = { url: url.trim(), updatedAt: Date.now() };
      await set(ref(db, `appConfig/officialFrames/${role}`), data);
      if (role === "officialHost") { setSavedHost(data); setHostFrameUrl(""); }
      else { setSavedOfficial(data); setOfficialFrameUrl(""); }
      toast({ title: "Frame saved ✅" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
    setLoading(false);
  }

  async function clearFrame(role: "officialHost" | "official") {
    if (isDemo) { showDemoBlock(); return; }
    setLoading(true);
    try {
      await remove(ref(db, `appConfig/officialFrames/${role}`));
      if (role === "officialHost") setSavedHost(null);
      else setSavedOfficial(null);
      toast({ title: "Frame removed – default CSS animation will show" });
    } catch {
      toast({ title: "Remove failed", variant: "destructive" });
    }
    setLoading(false);
  }

  // ── Upload callbacks ──────────────────────────────────────────
  const onHostUploaded = (url: string) => {
    setHostFrameUrl(url);
    // Auto-save after upload (optional)
    saveFrame("officialHost", url);
  };

  const onOfficialUploaded = (url: string) => {
    setOfficialFrameUrl(url);
    saveFrame("official", url);
  };

  const FRAME_CARD = ({
    role, title, icon: Icon, iconColor, badge, current, inputVal, onInputChange, onSave, onClear,
    uploadComponent, // 👈 new: upload button component
  }: {
    role: string; title: string; icon: typeof Crown; iconColor: string; badge: string;
    current: OfficialFrameConfig | null; inputVal: string; onInputChange: (v: string) => void;
    onSave: () => void; onClear: () => void;
    uploadComponent: React.ReactNode;
  }) => (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b border-border bg-muted/20">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ background: `${iconColor}22` }}>
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        <div>
          <h2 className="font-bold text-base text-white">{title}</h2>
          <p className="text-xs text-muted-foreground">Role: <code className="text-xs bg-muted px-1 rounded">{role}</code></p>
        </div>
        <div className="ml-auto">
          <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${iconColor}22`, color: iconColor }}>{badge}</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Current Frame Preview */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Current Frame</p>
          {current ? (
            <div className="flex items-start gap-4">
              <div className="relative shrink-0" style={{ width: 72, height: 72 }}>
                <div className="absolute inset-3 rounded-full bg-muted" style={{ background: "rgba(108,92,231,0.2)" }} />
                <img
                  src={current.url}
                  alt="Frame preview"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
                  onError={e => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium break-all line-clamp-2">{current.url}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Updated: {new Date(current.updatedAt).toLocaleDateString()}
                </p>
                <Button
                  variant="destructive" size="sm" className="mt-2 h-7 text-xs"
                  onClick={onClear} disabled={loading || isDemo}
                >
                  <Trash2 className="w-3 h-3 mr-1.5" />Remove Frame
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-4 px-4 rounded-xl bg-muted/20 border border-dashed border-border">
              <div className="text-2xl">✨</div>
              <div>
                <p className="text-sm font-medium text-white">Using default animated frame</p>
                <p className="text-xs text-muted-foreground">Upload a custom PNG to override the CSS animation</p>
              </div>
            </div>
          )}
        </div>

        {/* Upload New Frame – with Cloudinary button + URL input */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upload New Frame</p>
          <div className="space-y-2">
            {uploadComponent}
            <div className="flex gap-2">
              <Input
                placeholder="Or paste transparent PNG URL directly"
                value={inputVal}
                onChange={e => onInputChange(e.target.value)}
                className="text-sm"
                disabled={isDemo}
              />
              <Button onClick={onSave} disabled={loading || !inputVal.trim() || isDemo} className="shrink-0">
                <Upload className="w-4 h-4 mr-1.5" />Save
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Frame image must be a transparent PNG. The image will be overlaid on top of the user's avatar. Recommended size: 200×200px or larger.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Official Frames</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage avatar frame images for Official and Official Host roles</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadFrames} disabled={loadingPage}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingPage ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {/* Info card */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-300 leading-relaxed">
          <strong className="text-blue-200">How it works:</strong> If you upload a custom PNG frame here, it will appear on all users with that role instead of the default animated CSS frame.
          The PNG must have a <strong>transparent background</strong>. The avatar will appear inside the frame automatically.
          Leave empty to use the built-in animated frame (gold ring for Official Host, blue ring for Official).
        </div>
      </div>

      {loadingPage ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          <FRAME_CARD
            role="officialHost"
            title="Official Host Frame"
            icon={Crown}
            iconColor="#FFD700"
            badge="👑 HOST"
            current={savedHost}
            inputVal={hostFrameUrl}
            onInputChange={setHostFrameUrl}
            onSave={() => saveFrame("officialHost", hostFrameUrl)}
            onClear={() => clearFrame("officialHost")}
            uploadComponent={
              <UploadImageButton
                onUploaded={onHostUploaded}
                itemId="officialHostFrame"
              />
            }
          />

          <FRAME_CARD
            role="official"
            title="Official Frame"
            icon={Shield}
            iconColor="#00BFFF"
            badge="🔷 OFFICIAL"
            current={savedOfficial}
            inputVal={officialFrameUrl}
            onInputChange={setOfficialFrameUrl}
            onSave={() => saveFrame("official", officialFrameUrl)}
            onClear={() => clearFrame("official")}
            uploadComponent={
              <UploadImageButton
                onUploaded={onOfficialUploaded}
                itemId="officialFrame"
              />
            }
          />
        </div>
      )}
    </div>
  );
}