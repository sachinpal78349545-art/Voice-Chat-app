// src/pages/Post.tsx
import { useState, useEffect, useRef } from "react";
import { ref, onValue, update, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, X, Edit, ImagePlus, Loader2, Filter, Eye, UserRound, CalendarDays, ChevronLeft, ChevronRight, Video, Trash2 } from "lucide-react";

// ─── Cloudinary Upload ──────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "dz1bhfpkc";
const CLOUDINARY_UPLOAD_PRESET = "Profile_pic";

function UploadImageButton({ onUploaded }: { onUploaded: (url: string) => void }) {
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
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || "Upload failed"); }
      const data = await res.json();
      onUploaded(data.secure_url);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <Button type="button" variant="outline" size="sm" className="gap-2 border-dashed"
        onClick={() => fileRef.current?.click()} disabled={uploading}>
        <ImagePlus className="w-4 h-4" />
        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : "Upload from Gallery"}
      </Button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

// ─── Post Interface ──────────────────────────────────────────────
interface Post {
  id: string;
  databasePath: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  content: string;
  hashtags: string[];
  createdAt: number;
  status: "real" | "fake" | "banned";
  mentionedUsers?: string[];
  likes?: number;
  comments?: number;
  shares?: number;
  imageUrl?: string;      // ✅ Single image URL (जैसा Firebase में है)
  videoUrl?: string;
}

interface UserDetails {
  uid: string;
  name?: string;
  userId?: string;
  avatar?: string;
  email?: string;
  level?: number;
  coins?: number;
  followers?: number;
  following?: number;
  online?: boolean;
  globalRole?: string;
  isBanned?: boolean;
  shadowBanned?: boolean;
}

export default function Post() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filtered, setFiltered] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, real: 0, fake: 0, banned: 0 });

  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState<"real" | "fake">("real");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editForm, setEditForm] = useState<Partial<Post>>({});
  const [newImageUrl, setNewImageUrl] = useState<string>("");
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const [viewingUser, setViewingUser] = useState<UserDetails | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  // ─── Fetch Posts ──────────────────────────────────────────────
  useEffect(() => {
    const POSTS_PATH = "moments";
    const refPosts = ref(db, POSTS_PATH);
    const unsub = onValue(refPosts, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list: Post[] = [];

        const addPost = (
          postId: string,
          p: Record<string, any>,
          legacyUserId?: string,
          databasePath = `moments/${postId}`,
        ) => {
          const userId = p.uid || p.userId || legacyUserId || "Unknown";
          const isDemoUser = userId.startsWith("demo_") || userId.startsWith("fake_") || userId.includes("test");
          if (isDemoUser) return;

          const hashtags = Array.isArray(p.hashtags)
            ? p.hashtags
            : Array.isArray(p.tags)
              ? p.tags
              : [];
          const mentionedUsers = Array.isArray(p.mentionedUsers)
            ? p.mentionedUsers
            : Array.isArray(p.mentions)
              ? p.mentions
              : [];

          list.push({
            id: postId,
            databasePath,
            userId,
            userName: p.userName || p.name || p.author || "Unknown",
            userAvatar: p.userAvatar || p.avatar || p.photoURL || "",
            content: p.text || p.content || p.caption || "",
            hashtags,
            createdAt: Number(p.timestamp || p.createdAt || p.postedAt || Date.now()),
            status: p.status || "real",
            mentionedUsers,
            likes: typeof p.likes === "number" ? p.likes : p.likeCount || 0,
            comments: typeof p.comments === "number" ? p.comments : p.commentCount || 0,
            shares: typeof p.shares === "number" ? p.shares : p.shareCount || 0,
            imageUrl: p.imageUrl || p.image || p.img || null,
            videoUrl: p.videoUrl || p.video || null,
          });
        };

        Object.entries(data).forEach(([key, value]) => {
          if (!value || typeof value !== "object") return;
          const record = value as Record<string, any>;

          // Current app format: moments/{postId}
          const isFlatPost = Boolean(
            record.uid || record.userId || record.text !== undefined ||
            record.content !== undefined || record.caption !== undefined ||
            record.createdAt || record.timestamp || record.postedAt
          );
          if (isFlatPost) {
            addPost(key, record);
            return;
          }

          // Backward compatibility for older moments/{userId}/{postId} data.
          Object.entries(record).forEach(([postId, post]) => {
            if (post && typeof post === "object") {
              addPost(`${key}_${postId}`, post as Record<string, any>, key, `moments/${key}/${postId}`);
            }
          });
        });

        list.sort((a, b) => b.createdAt - a.createdAt);
        setPosts(list);
        applyFilters(list, search, showAll);
        calculateStats(list);
      } else {
        setPosts([]);
        setFiltered([]);
        setStats({ total: 0, real: 0, fake: 0, banned: 0 });
      }
      setLoading(false);
    }, error => {
      console.error("❌ Error fetching posts:", error);
      toast({ title: "Failed to load posts", variant: "destructive" });
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const applyFilters = (postList: Post[], searchTerm: string, all: boolean) => {
    let result = postList;
    if (all) {
      result = result.filter(p => p.status === "real" || p.status === "fake" || p.status === "banned");
    } else {
      result = result.filter(p => p.status === activeTab);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.userId.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
      );
    }
    if (dateFilter) {
      result = result.filter(p => new Date(p.createdAt).toISOString().slice(0, 10) === dateFilter);
    }
    setFiltered(result);
    setPage(1);
  };

  const calculateStats = (list: Post[]) => {
    const filteredList = list.filter(p => p.status === "real" || p.status === "fake" || p.status === "banned");
    setStats({
      total: filteredList.length,
      real: filteredList.filter(p => p.status === "real").length,
      fake: filteredList.filter(p => p.status === "fake").length,
      banned: filteredList.filter(p => p.status === "banned").length,
    });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearch(q);
    applyFilters(posts, q, showAll);
  };

  const toggleShowAll = () => {
    const newVal = !showAll;
    setShowAll(newVal);
    applyFilters(posts, search, newVal);
  };

  const selectTab = (tab: "real" | "fake") => {
    setActiveTab(tab);
    setShowAll(false);
    applyFilters(posts, search, false);
  };

  const handleDateFilter = (value: string) => {
    setDateFilter(value);
    applyFilters(posts, search, showAll);
  };

  const openUserDetails = async (uid: string) => {
    setUserLoading(true);
    try {
      const snapshot = await get(ref(db, `users/${uid}`));
      setViewingUser({ uid, ...(snapshot.exists() ? snapshot.val() : {}) });
    } catch {
      toast({ title: "Could not load user details", variant: "destructive" });
    } finally {
      setUserLoading(false);
    }
  };

  const paginatedPosts = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  const updateStatus = async (id: string, status: "real" | "fake" | "banned") => {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    try {
      await update(ref(db, post.databasePath), { status });
      toast({ title: `Post marked as ${status}` });
      const updatedPosts = posts.map(p => p.id === id ? { ...p, status } : p);
      setPosts(updatedPosts);
      applyFilters(updatedPosts, search, showAll);
      calculateStats(updatedPosts);
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const openEditModal = (post: Post) => {
    setEditingPost(post);
    setEditForm({ ...post });
    setNewImageUrl("");
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingPost(null);
    setEditForm({});
    setNewImageUrl("");
  };

  const handleEditSave = async () => {
    if (!editingPost) return;
    const updates: any = {};
    if (editForm.content !== undefined) updates.text = editForm.content;
    if (editForm.hashtags !== undefined) updates.hashtags = editForm.hashtags;
    if (editForm.mentionedUsers !== undefined) updates.mentionedUsers = editForm.mentionedUsers;
    if (newImageUrl) {
      updates.imageUrl = newImageUrl;   // ✅ Single image
    }
    try {
      await update(ref(db, editingPost.databasePath), updates);
      toast({ title: "Post updated" });
      const updatedPost = { ...editingPost, ...updates };
      const newPosts = posts.map(p => p.id === editingPost.id ? updatedPost : p);
      setPosts(newPosts);
      applyFilters(newPosts, search, showAll);
      closeEditModal();
    } catch {
      toast({ title: "Failed to update post", variant: "destructive" });
    }
  };

  const handleImageUploaded = (url: string) => {
    setNewImageUrl(url);
  };

  if (loading) return <div className="text-white p-6">Loading posts...</div>;

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Posts</h1>
        <div className="flex items-center gap-2">
          <Button variant={showAll ? "default" : "outline"} size="sm" onClick={toggleShowAll} className="gap-2">
            <Filter className="w-4 h-4" /> {showAll ? "All Posts" : "Real Posts Only"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold text-white">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Real</p><p className="text-2xl font-bold text-green-400">{stats.real}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Fake</p><p className="text-2xl font-bold text-red-400">{stats.fake}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Banned</p><p className="text-2xl font-bold text-yellow-400">{stats.banned}</p></CardContent></Card>
      </div>

      <Input
        placeholder="Search by User ID or content..."
        value={search}
        onChange={handleSearch}
        className="max-w-md bg-background border-border"
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <Button size="sm" variant={!showAll && activeTab === "real" ? "default" : "ghost"} onClick={() => selectTab("real")}>Real Posts</Button>
          <Button size="sm" variant={!showAll && activeTab === "fake" ? "default" : "ghost"} onClick={() => selectTab("fake")}>Fake Posts</Button>
        </div>
        <label className="relative">
          <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="date" value={dateFilter} onChange={e => handleDateFilter(e.target.value)} className="pl-9 w-44 bg-background border-border" />
        </label>
        {dateFilter && <Button size="sm" variant="ghost" onClick={() => handleDateFilter("")}>Clear date</Button>}
      </div>

      <div className="bg-card border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="p-3 text-left">User ID</th>
              <th className="p-3 text-left">Content</th>
              <th className="p-3 text-left">Image</th>
              <th className="p-3 text-left">Hashtags</th>
              <th className="p-3 text-left">Mentions</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">
                {showAll ? "No posts found" : "No real posts found."}
              </td></tr>
            ) : (
                paginatedPosts.map(p => (
                <tr key={p.id} className="border-b border-border/40">
                   <td className="p-3">
                     <button className="flex items-center gap-2 text-left hover:text-primary transition-colors" onClick={() => openUserDetails(p.userId)}>
                       {p.userAvatar ? <img src={p.userAvatar} alt="" className="w-8 h-8 rounded-full object-cover border border-border" /> : <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><UserRound className="w-4 h-4 text-primary" /></span>}
                       <span><span className="block text-white text-xs font-semibold max-w-[140px] truncate">{p.userName || "Unknown"}</span><span className="block text-muted-foreground font-mono text-[10px]">{p.userId}</span></span>
                     </button>
                   </td>
                   <td className="p-3 text-white max-w-xs">
                     <button className="text-left hover:text-primary transition-colors" onClick={() => setViewingPost(p)}>
                       <span className="block truncate">{p.content || "Media post"}</span>
                       <span className="text-[10px] text-muted-foreground">Read more · {p.likes || 0} likes · {p.comments || 0} comments</span>
                     </button>
                   </td>
                  <td className="p-3">
                     {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt="post"
                        className="w-10 h-10 rounded object-cover border border-border"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                     ) : p.videoUrl ? (
                       <span className="w-10 h-10 rounded bg-primary/15 flex items-center justify-center"><Video className="w-4 h-4 text-primary" /></span>
                     ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-white">{p.hashtags?.join(", ") || "—"}</td>
                  <td className="p-3 text-white">{p.mentionedUsers?.join(", ") || "—"}</td>
                  <td className="p-3 text-white text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <Badge className={
                      p.status === "real" ? "bg-green-500/20 text-green-400" :
                      p.status === "fake" ? "bg-red-500/20 text-red-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }>{p.status}</Badge>
                  </td>
                  <td className="p-3 flex gap-1 flex-wrap">
                    {p.status !== "real" && (
                      <Button size="sm" variant="ghost" className="text-green-400" onClick={() => updateStatus(p.id, "real")}>
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    {p.status !== "fake" && (
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => updateStatus(p.id, "fake")}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    {p.status !== "banned" && (
                      <Button size="sm" variant="ghost" className="text-yellow-400" onClick={() => updateStatus(p.id, "banned")}>
                        Ban
                      </Button>
                    )}
                     <Button size="sm" variant="ghost" className="text-cyan-400" onClick={() => setViewingPost(p)} title="View post"><Eye className="w-4 h-4" /></Button>
                     <Button size="sm" variant="ghost" className="text-blue-400" onClick={() => openEditModal(p)} title="Edit post"><Edit className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)}` : 0} of {filtered.length} posts</span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(v => v - 1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
          <span className="px-2">{page} / {pageCount}</span>
          <Button size="icon" variant="outline" className="h-7 w-7" disabled={page >= pageCount} onClick={() => setPage(v => v + 1)}><ChevronRight className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      {/* ─── Edit Modal ────────────────────────────────────────── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-muted-foreground">Content</label>
              <textarea
                className="w-full bg-background border border-border rounded p-2 text-white text-sm"
                rows={3}
                value={editForm.content || ""}
                onChange={e => setEditForm({ ...editForm, content: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Hashtags (comma separated)</label>
              <Input
                value={editForm.hashtags?.join(", ") || ""}
                onChange={e => setEditForm({ ...editForm, hashtags: e.target.value.split(",").map(s => s.trim()) })}
                placeholder="e.g. #photography, #love"
                className="bg-background border-border"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Mentioned Users (comma separated)</label>
              <Input
                value={editForm.mentionedUsers?.join(", ") || ""}
                onChange={e => setEditForm({ ...editForm, mentionedUsers: e.target.value.split(",").map(s => s.trim()) })}
                placeholder="e.g. @john, @jane"
                className="bg-background border-border"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">Add Image</label>
              <UploadImageButton onUploaded={handleImageUploaded} />
              {newImageUrl && (
                <div className="mt-2 w-32 h-32 rounded overflow-hidden bg-muted/20">
                  <img src={newImageUrl} alt="New upload" className="w-full h-full object-cover" />
                </div>
              )}
              {editingPost?.imageUrl && (
                <div className="mt-2 w-32 h-32 rounded overflow-hidden bg-muted/20">
                  <img src={editingPost.imageUrl} alt="Current" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>❤️ {editingPost?.likes || 0}</span>
              <span>💬 {editingPost?.comments || 0}</span>
              <span>↗️ {editingPost?.shares || 0}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal}>Cancel</Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingPost)} onOpenChange={open => !open && setViewingPost(null)}>
        <DialogContent className="bg-card border-border max-w-xl">
          <DialogHeader><DialogTitle className="text-white">Post Preview</DialogTitle></DialogHeader>
          {viewingPost && (
            <div className="space-y-4">
              <button className="flex items-center gap-3 text-left" onClick={() => openUserDetails(viewingPost.userId)}>
                {viewingPost.userAvatar ? <img src={viewingPost.userAvatar} alt="" className="w-11 h-11 rounded-full object-cover" /> : <span className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center"><UserRound className="w-5 h-5 text-primary" /></span>}
                <span><span className="block text-white font-semibold">{viewingPost.userName || "Unknown"}</span><span className="text-xs text-muted-foreground">ID: {viewingPost.userId}</span></span>
              </button>
              <p className="text-white whitespace-pre-wrap">{viewingPost.content || "No caption"}</p>
              {viewingPost.imageUrl && <img src={viewingPost.imageUrl} alt="Post media" className="w-full max-h-96 object-contain rounded-lg bg-background" />}
              {viewingPost.videoUrl && <video src={viewingPost.videoUrl} controls className="w-full max-h-96 rounded-lg bg-background" />}
              <div className="flex gap-5 text-sm text-muted-foreground">
                <span>❤️ {viewingPost.likes || 0}</span><span>💬 {viewingPost.comments || 0}</span><span>↗️ {viewingPost.shares || 0}</span><Badge>{viewingPost.status}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingUser) || userLoading} onOpenChange={open => !open && setViewingUser(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader><DialogTitle className="text-white">User Details</DialogTitle></DialogHeader>
          {userLoading ? <div className="py-8 text-center text-muted-foreground">Loading user...</div> : viewingUser && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                {viewingUser.avatar ? <img src={viewingUser.avatar} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-primary" /> : <span className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center"><UserRound className="w-7 h-7 text-primary" /></span>}
                <div><h3 className="text-lg font-semibold text-white">{viewingUser.name || "Unknown user"}</h3><p className="text-xs text-muted-foreground">UID: {viewingUser.uid}</p><p className="text-xs text-muted-foreground">User ID: {viewingUser.userId || "—"}</p></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg bg-background p-3"><span className="text-xs text-muted-foreground">Level</span><strong className="block text-white">{viewingUser.level || 1}</strong></div>
                <div className="rounded-lg bg-background p-3"><span className="text-xs text-muted-foreground">Coins</span><strong className="block text-yellow-400">{viewingUser.coins || 0}</strong></div>
                <div className="rounded-lg bg-background p-3"><span className="text-xs text-muted-foreground">Followers</span><strong className="block text-white">{viewingUser.followers || 0}</strong></div>
                <div className="rounded-lg bg-background p-3"><span className="text-xs text-muted-foreground">Following</span><strong className="block text-white">{viewingUser.following || 0}</strong></div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge className={viewingUser.online ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}>{viewingUser.online ? "Online" : "Offline"}</Badge>
                {viewingUser.globalRole && <Badge>{viewingUser.globalRole}</Badge>}
                {viewingUser.isBanned && <Badge className="bg-red-500/20 text-red-400">Banned</Badge>}
                {viewingUser.shadowBanned && <Badge className="bg-yellow-500/20 text-yellow-400">Shadow banned</Badge>}
              </div>
              {viewingUser.email && <p className="text-sm text-muted-foreground">{viewingUser.email}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}