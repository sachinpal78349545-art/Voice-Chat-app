import React, { useState, useEffect, useRef } from "react";
import { ref, onValue, off, get, set, push, remove, update } from "firebase/database";
import { db, uploadWithAppCheck } from "../lib/firebase";
import { UserProfile, isSuperAdmin } from "../lib/userService";
import { useToast } from "../lib/toastContext";

interface Comment {
  id: string;
  uid: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: number;
}

interface Post {
  id: string;
  uid: string;
  userName: string;
  userAvatar: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  likes: Record<string, boolean>;
  commentCount: number;
  createdAt: number;
}

interface Props {
  user: UserProfile;
  onMessage?: (uid: string) => void;
  onNavigate?: (page: string) => void;
}

function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !videoRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
          setPlaying(true);
        } else {
          videoRef.current?.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", background: "#000" }}>
      <video
        ref={videoRef}
        src={src}
        muted={muted}
        loop
        playsInline
        style={{ width: "100%", maxHeight: 400, objectFit: "contain", display: "block" }}
        onClick={() => {
          if (videoRef.current?.paused) { videoRef.current.play(); setPlaying(true); }
          else { videoRef.current?.pause(); setPlaying(false); }
        }}
      />
      <button onClick={(e) => { e.stopPropagation(); setMuted(!muted); }} style={{
        position: "absolute", bottom: 10, right: 10, width: 32, height: 32, borderRadius: 16,
        background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", fontSize: 14, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{muted ? "\uD83D\uDD07" : "\uD83D\uDD0A"}</button>
      {!playing && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 26, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}>▶</div>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage({ user, onMessage: _onMessage, onNavigate }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postFile, setPostFile] = useState<File | null>(null);
  const [postFilePreview, setPostFilePreview] = useState<string | null>(null);
  const [postFileType, setPostFileType] = useState<"image" | "video" | null>(null);
  const [commentingPost, setCommentingPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [reelsMode, setReelsMode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const isAdmin = isSuperAdmin(user);

  useEffect(() => {
    const r = ref(db, "moments");
    onValue(r, snap => {
      if (!snap.exists()) { setPosts([]); setLoading(false); return; }
      const val = snap.val();
      const list: Post[] = Object.keys(val).map(k => ({
        ...val[k],
        id: k,
        likes: val[k].likes || {},
        commentCount: val[k].commentCount || 0,
      }));
      list.sort((a, b) => b.createdAt - a.createdAt);
      const blockedList = user.blockedList || [];
      const filtered = blockedList.length > 0 ? list.filter(p => !blockedList.includes(p.uid)) : list;
      setPosts(filtered);
      setLoading(false);
    });
    return () => off(r);
  }, []);

  useEffect(() => {
    if (!commentingPost) { setComments([]); return; }
    setCommentsLoading(true);
    const r = ref(db, `momentComments/${commentingPost}`);
    onValue(r, snap => {
      if (!snap.exists()) { setComments([]); setCommentsLoading(false); return; }
      const val = snap.val();
      const list: Comment[] = Object.keys(val).map(k => ({ ...val[k], id: k }));
      list.sort((a, b) => a.createdAt - b.createdAt);
      const blockedList = user.blockedList || [];
      const filteredComments = blockedList.length > 0 ? list.filter(c => !blockedList.includes(c.uid)) : list;
      setComments(filteredComments);
      setCommentsLoading(false);
    });
    return () => off(r);
  }, [commentingPost]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(isVideo ? "Video must be under 50MB" : "Image must be under 5MB", "warning");
      return;
    }
    setPostFile(file);
    setPostFileType(isVideo ? "video" : "image");
    if (isVideo) {
      setPostFilePreview(URL.createObjectURL(file));
    } else {
      const reader = new FileReader();
      reader.onload = () => setPostFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!postFile && !postText.trim()) { showToast("Add a photo, video, or text", "warning"); return; }
    setPosting(true);
    try {
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;
      if (postFile) {
        const ext = postFile.name.split(".").pop() || (postFileType === "video" ? "mp4" : "jpg");
        const path = `moments/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const result = await uploadWithAppCheck(postFile, path);
        if (postFileType === "video") videoUrl = result.url;
        else imageUrl = result.url;
      }
      const momentRef = push(ref(db, "moments"));
      const data: Record<string, unknown> = {
        uid: user.uid,
        userName: user.name,
        userAvatar: user.avatar,
        text: postText.trim(),
        likes: {},
        commentCount: 0,
        createdAt: Date.now(),
      };
      if (imageUrl) data.imageUrl = imageUrl;
      if (videoUrl) data.videoUrl = videoUrl;
      await set(momentRef, data);
      setPostText("");
      setPostFile(null);
      setPostFilePreview(null);
      setPostFileType(null);
      setShowCreate(false);
      showToast("Posted!", "success");
    } catch (err) {
      console.error("Post error:", err);
      showToast("Failed to post", "error");
    }
    setPosting(false);
  };

  const handleLike = async (postId: string) => {
    const likeRef = ref(db, `moments/${postId}/likes/${user.uid}`);
    const snap = await get(likeRef);
    if (snap.exists()) await set(likeRef, null);
    else await set(likeRef, true);
  };

  const handleDelete = async (postId: string) => {
    try {
      await remove(ref(db, `moments/${postId}`));
      await remove(ref(db, `momentComments/${postId}`));
      showToast("Post deleted", "info");
    } catch { showToast("Delete failed", "error"); }
  };

  const handleComment = async () => {
    if (!commentingPost || !commentText.trim()) return;
    setSendingComment(true);
    try {
      const cRef = push(ref(db, `momentComments/${commentingPost}`));
      await set(cRef, {
        uid: user.uid,
        userName: user.name,
        userAvatar: user.avatar,
        text: commentText.trim(),
        createdAt: Date.now(),
      });
      await update(ref(db, `moments/${commentingPost}`), {
        commentCount: (posts.find(p => p.id === commentingPost)?.commentCount || 0) + 1,
      });
      setCommentText("");
    } catch { showToast("Failed to comment", "error"); }
    setSendingComment(false);
  };

  const handleEditComment = async () => {
    if (!commentingPost || !editingComment || !editCommentText.trim()) return;
    setSendingComment(true);
    try {
      await update(ref(db, `momentComments/${commentingPost}/${editingComment}`), { text: editCommentText.trim() });
      setEditingComment(null);
      setEditCommentText("");
    } catch { showToast("Failed to update comment", "error"); }
    setSendingComment(false);
  };

  const handleShare = async (post: Post) => {
    const shareText = post.text ? `${post.userName}: ${post.text}` : `Check out ${post.userName}'s post on Galaxy!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Galaxy Voice Chat", text: shareText, url: window.location.href });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        showToast("Copied to clipboard!", "success");
      } catch { showToast("Share not supported", "info"); }
    }
  };

  const getTimeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const renderAvatar = (avatar: string, size = 36) => (
    <div style={{
      width: size, height: size, borderRadius: size / 2, fontSize: size * 0.5,
      background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0,
    }}>
      {avatar?.startsWith?.("http")
        ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: size / 2 }} />
        : avatar}
    </div>
  );

  return (
    <div className="page-scroll">
      <div style={{ padding: "54px 16px 8px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, background: "linear-gradient(135deg,#A29BFE,#6C5CE7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Explore</h1>
          <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", marginTop: 2 }}>Discover photos & videos from the community</p>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <button onClick={() => setReelsMode(!reelsMode)} style={{
            background: reelsMode ? "rgba(191,0,255,0.2)" : "rgba(108,92,231,0.15)",
            border: reelsMode ? "1px solid rgba(191,0,255,0.4)" : "1px solid rgba(108,92,231,0.25)",
            borderRadius: 12, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700,
            color: reelsMode ? "#bf00ff" : "#A29BFE", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 5,
          }}>{"\uD83C\uDFAC"} Reels</button>
          {onNavigate && (
            <button onClick={() => onNavigate("moment")} style={{
              background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.25)",
              borderRadius: 12, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700,
              color: "#A29BFE", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5,
            }}>{"\uD83D\uDCF8"} Moments</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="galaxy-loader">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Loading" />
          <p>Loading feed...</p>
        </div>
      ) : reelsMode ? (
        (() => {
          const videoPosts = posts.filter(p => p.videoUrl);
          return videoPosts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(162,155,254,0.4)" }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>{"\uD83C\uDFAC"}</p>
              <p style={{ fontSize: 14, fontWeight: 600 }}>No video reels yet</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Upload a short video to start!</p>
            </div>
          ) : (
            <div className="reels-container" style={{ height: "calc(100dvh - 160px)" }}>
              {videoPosts.map(post => {
                const likeCount = Object.keys(post.likes).length;
                const isLiked = !!post.likes[user.uid];
                return (
                  <div key={post.id} className="reel-slide">
                    <video src={post.videoUrl} autoPlay muted loop playsInline
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      onClick={e => {
                        const v = e.currentTarget;
                        if (v.paused) v.play(); else v.pause();
                      }}
                    />
                    <div className="reel-overlay">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {renderAvatar(post.userAvatar, 32)}
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{post.userName}</p>
                          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{getTimeAgo(post.createdAt)}</p>
                        </div>
                      </div>
                      {post.text && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 8, lineHeight: 1.4 }}>{post.text}</p>}
                    </div>
                    <div className="reel-actions">
                      <button className="reel-action-btn" onClick={() => handleLike(post.id)}>
                        <span style={{ fontSize: 28, color: isLiked ? "#ff6482" : "#fff" }}>{isLiked ? "\u2764\uFE0F" : "\uD83E\uDD0D"}</span>
                        <span>{likeCount || ""}</span>
                      </button>
                      <button className="reel-action-btn" onClick={() => { setCommentingPost(post.id); setCommentText(""); }}>
                        <span style={{ fontSize: 28 }}>{"\uD83D\uDCAC"}</span>
                        <span>{post.commentCount || ""}</span>
                      </button>
                      <button className="reel-action-btn" onClick={() => handleShare(post)}>
                        <span style={{ fontSize: 28 }}>{"\uD83D\uDD17"}</span>
                        <span>Share</span>
                      </button>
                      {(isAdmin || post.uid === user.uid) && (
                        <button className="reel-action-btn" onClick={() => handleDelete(post.id)}>
                          <span style={{ fontSize: 24, color: "#ff6482" }}>{"\uD83D\uDDD1\uFE0F"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(162,155,254,0.4)" }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>{"\uD83C\uDF0C"}</p>
          <p style={{ fontSize: 14, fontWeight: 600 }}>No posts yet</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Be the first to share something!</p>
        </div>
      ) : (
        <div style={{ padding: "0 0 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {posts.map(post => {
            const likeCount = Object.keys(post.likes).length;
            const isLiked = !!post.likes[user.uid];
            return (
              <div key={post.id} className="card" style={{ padding: 0, overflow: "hidden", borderRadius: 0, margin: 0, border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 8px" }}>
                  {renderAvatar(post.userAvatar, 36)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.userName}</p>
                    <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>{getTimeAgo(post.createdAt)}</p>
                  </div>
                  {(isAdmin || post.uid === user.uid) && (
                    <button onClick={() => handleDelete(post.id)} style={{
                      background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "rgba(255,100,130,0.6)", padding: 4,
                    }}>{"\uD83D\uDDD1\uFE0F"}</button>
                  )}
                </div>

                {post.text && (
                  <p style={{ padding: "0 14px 8px", fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.85)" }}>{post.text}</p>
                )}

                {post.videoUrl && <VideoPlayer src={post.videoUrl} />}
                {post.imageUrl && !post.videoUrl && (
                  <img src={post.imageUrl} alt="" style={{ width: "100%", maxHeight: 400, objectFit: "cover", display: "block" }} />
                )}

                <div style={{ display: "flex", gap: 0, padding: "4px 6px 8px", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                  <button onClick={() => handleLike(post.id)} style={{
                    flex: 1, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
                    color: isLiked ? "#ff6482" : "rgba(162,155,254,0.5)", fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 0",
                  }}>{isLiked ? "\u2764\uFE0F" : "\uD83E\uDD0D"} {likeCount || ""}</button>
                  <button onClick={() => { setCommentingPost(post.id); setCommentText(""); }} style={{
                    flex: 1, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
                    color: "rgba(162,155,254,0.5)", fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 0",
                  }}>{"\uD83D\uDCAC"} {post.commentCount || ""}</button>
                  <button onClick={() => handleShare(post)} style={{
                    flex: 1, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
                    color: "rgba(162,155,254,0.5)", fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 0",
                  }}>{"\uD83D\uDD17"} Share</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ height: 80 }} />

      <button onClick={() => setShowCreate(true)} style={{
        position: "fixed", bottom: 80, right: 20, width: 56, height: 56, borderRadius: 28,
        background: "linear-gradient(135deg, #6C5CE7, #A29BFE)", border: "none", cursor: "pointer",
        boxShadow: "0 4px 20px rgba(108,92,231,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, color: "#fff", zIndex: 10,
      }}>+</button>

      {showCreate && (
        <div onClick={() => { if (!posting) setShowCreate(false); }} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: 430, background: "#1A0F2E", borderRadius: "20px 20px 0 0",
            padding: "20px 16px 32px", animation: "slide-up 0.3s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900 }}>{"\uD83C\uDF1F"} New Post</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
            </div>

            <textarea
              className="input-field"
              placeholder="What's on your mind?"
              value={postText}
              onChange={e => setPostText(e.target.value)}
              rows={3}
              disabled={posting}
              style={{ borderRadius: 14, padding: "12px 14px", fontSize: 14, resize: "none", minHeight: 60, marginBottom: 12 }}
            />

            {postFilePreview ? (
              <div style={{ position: "relative", marginBottom: 12 }}>
                {postFileType === "video" ? (
                  <video src={postFilePreview} style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 14 }} controls />
                ) : (
                  <img src={postFilePreview} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 14 }} />
                )}
                <button onClick={() => { setPostFile(null); setPostFilePreview(null); setPostFileType(null); }} style={{
                  position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: 14,
                  background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", cursor: "pointer", fontSize: 14,
                }}>{"\u2715"}</button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={posting} style={{
                width: "100%", padding: "24px 0", borderRadius: 14, border: "2px dashed rgba(108,92,231,0.3)",
                background: "rgba(108,92,231,0.06)", cursor: "pointer", color: "rgba(162,155,254,0.5)",
                fontSize: 14, fontFamily: "inherit", marginBottom: 12,
              }}>{"\uD83D\uDCF7"} Add Photo or Video</button>
            )}

            <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleFileSelect} />

            <button
              className="btn btn-primary btn-full"
              style={{ padding: "14px 0", borderRadius: 14, fontSize: 15, fontWeight: 800, opacity: (postText.trim() || postFile) ? 1 : 0.4 }}
              onClick={handlePost}
              disabled={posting || (!postText.trim() && !postFile)}
            >{posting ? "Posting..." : "Post"}</button>
          </div>
        </div>
      )}

      {commentingPost && (
        <div onClick={() => setCommentingPost(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: 430, background: "#1A0F2E", borderRadius: "20px 20px 0 0",
            padding: "16px 16px 32px", maxHeight: "70vh", display: "flex", flexDirection: "column",
            animation: "slide-up 0.3s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>{"\uD83D\uDCAC"} Comments</h3>
              <button onClick={() => setCommentingPost(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", marginBottom: 12, minHeight: 100 }}>
              {commentsLoading ? (
                <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 20 }}>Loading...</p>
              ) : comments.length === 0 ? (
                <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 20, fontSize: 13 }}>No comments yet. Be the first!</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {renderAvatar(c.userAvatar, 28)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{c.userName}</span>
                        <span style={{ fontSize: 9, color: "rgba(162,155,254,0.35)" }}>{getTimeAgo(c.createdAt)}</span>
                      </div>
                      {editingComment === c.id ? (
                        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                          <input className="input-field" value={editCommentText} onChange={e => setEditCommentText(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleEditComment(); if (e.key === "Escape") setEditingComment(null); }}
                            style={{ flex: 1, borderRadius: 10, padding: "6px 10px", fontSize: 12 }} autoFocus />
                          <button onClick={handleEditComment} disabled={sendingComment} className="btn btn-primary" style={{ borderRadius: 10, padding: "4px 10px", fontSize: 11 }}>Save</button>
                          <button onClick={() => setEditingComment(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "rgba(162,155,254,0.4)" }}>Cancel</button>
                        </div>
                      ) : (
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2, lineHeight: 1.4 }}>{c.text}</p>
                      )}
                    </div>
                    {(isAdmin || c.uid === user.uid) && editingComment !== c.id && (
                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        {c.uid === user.uid && (
                          <button onClick={() => { setEditingComment(c.id); setEditCommentText(c.text); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "rgba(162,155,254,0.5)", padding: 4 }}>{"\u270F\uFE0F"}</button>
                        )}
                        <button onClick={async () => {
                          await remove(ref(db, `momentComments/${commentingPost}/${c.id}`));
                          const post = posts.find(p => p.id === commentingPost);
                          if (post) await update(ref(db, `moments/${commentingPost}`), { commentCount: Math.max(0, (post.commentCount || 1) - 1) });
                        }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "rgba(255,100,130,0.5)", padding: 4 }}>{"\u2715"}</button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="input-field"
                placeholder="Write a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                style={{ flex: 1, borderRadius: 20, padding: "10px 14px", fontSize: 13 }}
                disabled={sendingComment}
              />
              <button
                className="btn btn-primary"
                onClick={handleComment}
                disabled={!commentText.trim() || sendingComment}
                style={{ borderRadius: 20, padding: "10px 16px", fontSize: 13, fontWeight: 700 }}
              >{sendingComment ? "..." : "Send"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
