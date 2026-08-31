import { useState, useEffect, useRef } from "react";
import { Image, Plus, Trash2, Edit2, ArrowUp, ArrowDown, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ref, get, set, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// ─── Cloudinary Config ──────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "dz1bhfpkc";
const CLOUDINARY_UPLOAD_PRESET = "Profile_pic"; // ← अपना Upload Preset

// ─── Types ──────────────────────────────────────────────────────
interface Banner {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  image?: string;
  link?: string;          // 👈 User click पर यह URL open होगा
  order: number;
  enabled: boolean;
}

// ─── Default Banners ────────────────────────────────────────────
const DEFAULT_BANNERS: Banner[] = [
  { id: "portal", title: "Welcome to Galaxy", subtitle: "Discover magical voice rooms", badge: "NEW", link: "/events", order: 0, enabled: true },
  { id: "gaming", title: "New Features", subtitle: "Play with friends worldwide", badge: "HOT", link: "/games", order: 1, enabled: true },
  { id: "rewards", title: "Daily Rewards", subtitle: "Claim coins & gifts every day", badge: "REWARDS", link: "/rewards", order: 2, enabled: true },
  { id: "event1", title: "Special Event", subtitle: "Join the exclusive party", badge: "EVENT", link: "/event", order: 3, enabled: true },
  { id: "event2", title: "Leaderboard", subtitle: "Climb the leaderboard now", badge: "RANKED", link: "/leaderboard", order: 4, enabled: true },
];

// ─── Component ──────────────────────────────────────────────────
export default function BannerManagement() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState<Partial<Banner>>({
    title: "",
    subtitle: "",
    badge: "NEW",
    link: "",
    image: "",
    enabled: true,
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load Banners ──
  async function loadBanners() {
    setLoading(true);
    const snap = await get(ref(db, "appConfig/banners"));
    if (snap.exists()) {
      const val = snap.val() as Record<string, Banner>;
      setBanners(Object.values(val).sort((a, b) => a.order - b.order));
    } else {
      setBanners(DEFAULT_BANNERS);
      const batch: Record<string, Banner> = {};
      DEFAULT_BANNERS.forEach(b => { batch[b.id] = b; });
      await set(ref(db, "appConfig/banners"), batch);
    }
    setLoading(false);
  }

  useEffect(() => { loadBanners(); }, []);

  // ── Cloudinary Upload ──
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Only image files allowed", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Max 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setFormData(prev => ({ ...prev, image: data.secure_url }));
      toast({ title: "Image uploaded successfully!" });
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openAddModal = () => {
    setEditingBanner(null);
    setFormData({ title: "", subtitle: "", badge: "NEW", link: "", image: "", enabled: true });
    setIsDialogOpen(true);
  };

  const openEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({ ...banner });
    setIsDialogOpen(true);
  };

  async function handleSave() {
    if (!formData.title?.trim() || !formData.badge?.trim()) {
      toast({ title: "Title and Badge are required", variant: "destructive" });
      return;
    }
    try {
      if (editingBanner) {
        await update(ref(db, `appConfig/banners/${editingBanner.id}`), formData);
        setBanners(prev => prev.map(b => b.id === editingBanner.id ? { ...b, ...formData } : b));
        toast({ title: "Banner updated" });
      } else {
        const id = `banner_${Date.now()}`;
        const newBanner: Banner = {
          id,
          title: formData.title!,
          subtitle: formData.subtitle || "",
          badge: formData.badge!,
          link: formData.link || "",
          image: formData.image || "",
          order: banners.length,
          enabled: formData.enabled !== undefined ? formData.enabled : true,
        };
        await set(ref(db, `appConfig/banners/${id}`), newBanner);
        setBanners(prev => [...prev, newBanner]);
        toast({ title: "Banner added" });
      }
      setIsDialogOpen(false);
    } catch (err) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this banner?")) return;
    await remove(ref(db, `appConfig/banners/${id}`));
    setBanners(prev => prev.filter(b => b.id !== id));
    toast({ title: "Banner deleted" });
  }

  function handleMove(id: string, dir: "up" | "down") {
    const idx = banners.findIndex(b => b.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === banners.length - 1) return;
    const newBanners = [...banners];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [newBanners[idx], newBanners[swapIdx]] = [newBanners[swapIdx], newBanners[idx]];
    const reordered = newBanners.map((b, i) => ({ ...b, order: i }));
    setBanners(reordered);
    const batch: Record<string, Banner> = {};
    reordered.forEach(b => { batch[b.id] = b; });
    set(ref(db, "appConfig/banners"), batch);
  }

  async function toggleEnabled(banner: Banner) {
    const updated = { ...banner, enabled: !banner.enabled };
    await update(ref(db, `appConfig/banners/${banner.id}`), { enabled: updated.enabled });
    setBanners(prev => prev.map(b => b.id === banner.id ? updated : b));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Banners</h1>
          <p className="text-muted-foreground text-sm">Home screen carousel banners</p>
        </div>
        <Button size="sm" onClick={openAddModal}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Banner
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />)}</div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Image className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No banners</p>
        </div>
      ) : (
        <div className="space-y-2">
          {banners.map(b => (
            <div key={b.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="h-20 relative overflow-hidden bg-black/40">
                {b.image ? (
                  <img src={b.image} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 to-indigo-900/40" />
                )}
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-0 flex items-center px-4 gap-3 z-10">
                  <span className="text-xs font-bold bg-white/20 text-white px-2 py-0.5 rounded backdrop-blur-sm">{b.badge}</span>
                  <div>
                    <p className="text-sm font-bold text-white drop-shadow-lg">{b.title}</p>
                    <p className="text-[10px] text-white/80 drop-shadow-lg">{b.subtitle}</p>
                    {b.link && <p className="text-[8px] text-white/40 truncate max-w-[120px]">🔗 {b.link}</p>}
                  </div>
                  {!b.enabled && (
                    <span className="ml-auto text-[10px] bg-black/60 text-white/80 px-2 py-0.5 rounded">HIDDEN</span>
                  )}
                </div>
              </div>
              <div className="px-4 py-2 border-t border-border flex items-center gap-2">
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-white" onClick={() => handleMove(b.id, "up")}>
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-white" onClick={() => handleMove(b.id, "down")}>
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-white h-6 px-2" onClick={() => toggleEnabled(b)}>
                  {b.enabled ? "Hide" : "Show"}
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-white ml-auto" onClick={() => openEditModal(b)}>
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(b.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingBanner ? "Edit Banner" : "Add New Banner"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Title *</label>
              <Input
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Subtitle</label>
              <Input
                value={formData.subtitle || ""}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Badge *</label>
              <Input
                value={formData.badge || ""}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Link (user click पर open होगा)</label>
              <Input
                value={formData.link || ""}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://... or /internal-path"
                className="bg-background border-border"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                ⚡ Internal: /rewards &nbsp;|&nbsp; External: https://example.com
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">Banner Image</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload from Gallery"}
                </Button>
                <span className="text-xs text-muted-foreground">or paste URL below</span>
              </div>
              <Input
                value={formData.image || ""}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://..."
                className="bg-background border-border mt-1"
              />
              {formData.image && (
                <div className="mt-2 w-full h-20 rounded bg-muted/20 overflow-hidden">
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground">Enabled</label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                className={`w-10 h-5 rounded-full transition-colors ${formData.enabled ? "bg-primary" : "bg-muted"} relative`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${formData.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingBanner ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}