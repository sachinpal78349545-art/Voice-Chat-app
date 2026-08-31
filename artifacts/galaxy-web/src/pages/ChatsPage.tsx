// ChatsPage.tsx – Exact Chalotalk Style (Messages tab mein sirf chatlist)
import React, { useState, useEffect, useRef, useCallback } from "react";

import { UserProfile, incrementStat, followUser, unfollowUser, subscribeUser, blockUser, canChatSync, isSuperAdmin, sendGift } from "../lib/userService";
import { Conversation, ChatMessage, subscribeConversations, subscribeMessages, sendMessage, sendImageMessage, sendVoiceMessage, addReaction, setTyping, subscribeTyping, markRead, clearChat, updateLastSeen } from "../lib/chatService";
import { sendNotification, subscribeNotifications, Notification as AppNotification, markNotificationRead, markAllNotificationsRead } from "../lib/notificationService";
import { useToast } from "../lib/toastContext";
import { ensureSystemConversations, getOrCreateSystemConversation, SYSTEM_USERS, ASSISTANT_UID } from "../lib/systemChatService";

interface Props { user: UserProfile; initialChatUid?: string | null; onChatActive?: (active: boolean) => void; }

// ========== CONSTANTS ==========
const EMOJI_GRID = [
  "\u{1F600}","\u{1F602}","\u{1F60D}","\u{1F618}","\u{1F970}","\u{1F60E}","\u{1F913}","\u{1F60F}",
  "\u{1F622}","\u{1F62D}","\u{1F621}","\u{1F631}","\u{1F92F}","\u{1F973}","\u{1F929}","\u{1F644}",
  "\u2764\uFE0F","\u{1F525}","\u{1F44D}","\u{1F44F}","\u{1F64F}","\u{1F4AA}","\u{1F91D}","\u270C\uFE0F",
  "\u{1F31F}","\u2728","\u{1F389}","\u{1F381}","\u{1F680}","\u{1F30C}","\u{1F48E}","\u{1F4AF}",
];
const REACTION_EMOJIS = ["\u2764\uFE0F", "\u{1F525}", "\u{1F602}", "\u{1F44D}", "\u{1F62E}", "\u{1F622}"];
const QUICK_PHRASES = ["Hi!", "How are you?", "Follow me", "GG!", "Nice to meet you", "Thanks!", "See you later", "Let's talk!"];
const UNLOCK_GIFTS = [
  { emoji: "\u{1F339}", name: "Rose", cost: 20 },
  { emoji: "\u{1F381}", name: "Gift Box", cost: 10 },
  { emoji: "\u2B50", name: "Star", cost: 40 },
  { emoji: "\u{1F48E}", name: "Diamond", cost: 50 },
  { emoji: "\u{1F451}", name: "Crown", cost: 100 },
];
const CHAT_GIFTS = [
  { emoji: "\u{1F339}", name: "Rose", cost: 10 },
  { emoji: "\u2764\uFE0F", name: "Heart", cost: 5 },
  { emoji: "\u2B50", name: "Star", cost: 15 },
  { emoji: "\u{1F48E}", name: "Diamond", cost: 30 },
];
const NOTIF_CATEGORIES = [
  { key: "follower", label: "New Followers", icon: "\u{1F465}", types: ["follower", "follow_back", "friend_request"] },
  { key: "system", label: "Announcements", icon: "\u{1F4E2}", types: ["system", "achievement"] },
  { key: "gift", label: "Gifts & Rewards", icon: "\u{1F381}", types: ["gift"] },
];

// ========== HELPER FUNCTIONS ==========
async function sendWelcomeMessage(userId: string, userName: string, showToast: (msg: string, type?: string, icon?: string) => void) {
  try {
    const convId = await getOrCreateSystemConversation(userId, ASSISTANT_UID, userName);
    await sendMessage(convId, ASSISTANT_UID,
      `👋 **Welcome to Galaxy Voice Chat, ${userName}!** 🌟\n\nWe're thrilled to have you here.\n🎁 **Welcome Bonus:** 50 Diamonds added!\n\n✨ Chat, make friends, level up, and unlock rewards.\n\nHave fun! 🚀`,
      "system"
    );
    showToast("Welcome! 50 Diamonds credited 🎉", "success");
  } catch (err) { console.error(err); }
}

export async function sendLevelUpReward(userId: string, newLevel: number, diamondsReward: number) {
  try {
    const convId = await getOrCreateSystemConversation(userId, ASSISTANT_UID);
    await sendMessage(convId, ASSISTANT_UID,
      `🎉 **Congratulations!** 🎉\n\nYou've reached **Level ${newLevel}**!\n\n✨ **Reward:** ${diamondsReward} Diamonds ✨\n\nKeep growing! 🌟`,
      "system"
    );
  } catch (err) { console.error(err); }
}

export default function ChatsPage({ user, initialChatUid, onChatActive }: Props) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Conversation | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typing, setTypingState] = useState<Record<string, boolean>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const [showQuickPhrases, setShowQuickPhrases] = useState(false);
  const [giftSending, setGiftSending] = useState(false);
  const [showChatGifts, setShowChatGifts] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showNotifHub, setShowNotifHub] = useState(false);
  const [notifTab, setNotifTab] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [swipingMsgId, setSwipingMsgId] = useState<string | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [activeTab, setActiveTab] = useState<"contacts" | "messages">("contacts");
  const touchStart = useRef<{ x: number; y: number; id: string } | null>(null);
  const msgEnd = useRef<HTMLDivElement>(null);
  const unlockedConvs = useRef<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStartTime = useRef(0);
  const { showToast } = useToast();

  // ========== EFFECTS ==========
  useEffect(() => {
    if (user.uid) {
      ensureSystemConversations(user.uid, user.name, user.avatar).catch(console.error);
    }
    const unsub = subscribeConversations(user.uid, (c: Conversation[]) => {
      setConvs(c);
      setLoading(false);
    });
    return unsub;
  }, [user.uid]);

  useEffect(() => {
    if (!user.uid) return;
    const flag = `welcome_sent_${user.uid}`;
    if (!localStorage.getItem(flag)) {
      sendWelcomeMessage(user.uid, user.name, showToast);
      localStorage.setItem(flag, "true");
    }
  }, [user.uid, user.name]);

  useEffect(() => {
    const unsub = subscribeNotifications(user.uid, setNotifications);
    return unsub;
  }, [user.uid]);

  useEffect(() => {
    if (initialChatUid && convs.length > 0 && !active) {
      const match = convs.find(c => c.participants.includes(initialChatUid));
      if (match) setActive(match);
    }
  }, [initialChatUid, convs, active]);

  useEffect(() => {
    if (!active) return;
    const unsub1 = subscribeMessages(active.id, setMsgs);
    const unsub2 = subscribeTyping(active.id, setTypingState);
    markRead(active.id, user.uid).catch(console.warn);
    updateLastSeen(active.id, user.uid).catch(() => {});
    return () => {
      unsub1(); unsub2();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [active?.id]);

  useEffect(() => { onChatActive?.(!!active); }, [active, onChatActive]);
  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => updateLastSeen(active.id, user.uid).catch(() => {}), 30000);
    return () => clearInterval(interval);
  }, [active?.id]);

  // ========== EVENT HANDLERS ==========
  const handleSend = async () => {
    if (!input.trim() || !active) return;
    try {
      const reply = replyingTo ? { id: replyingTo.id, text: replyingTo.text.slice(0, 60), senderName: replyingTo.senderName || "User" } : undefined;
      await sendMessage(active.id, user.uid, input.trim(), "text", reply);
      setInput("");
      setShowEmojiPicker(false);
      setReplyingTo(null);
      setTyping(active.id, user.uid, false);
      incrementStat(user.uid, "messagesSent").catch(console.error);
      const otherId = active.participants.find(p => p !== user.uid);
      if (otherId && !(otherId in SYSTEM_USERS)) {
        sendNotification(otherId, { type: "message", title: "New Message", body: `${user.name}: ${input.trim().slice(0,50)}`, icon: "\u{1F4AC}", fromUid: user.uid, fromName: user.name }).catch(console.error);
      }
    } catch (err) { showToast("Failed to send message", "error"); }
  };

  const handleImageSend = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !active) return;
    try {
      showToast("Uploading image...", "info", "\u{1F4F7}");
      await sendImageMessage(active.id, user.uid, file);
      showToast("Image sent!", "success");
    } catch { showToast("Failed to send image", "error"); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      audioChunks.current = [];
      mr.ondataavailable = e => e.data.size && audioChunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const duration = (Date.now() - recordStartTime.current) / 1000;
        if (duration > 0.5 && active) {
          showToast("Sending voice...", "info", "\u{1F3A4}");
          await sendVoiceMessage(active.id, user.uid, blob, duration);
          showToast("Voice message sent!", "success");
        }
      };
      mr.start();
      mediaRecorder.current = mr;
      recordStartTime.current = Date.now();
      setIsRecording(true);
      setRecordDuration(0);
      recordTimer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordStartTime.current) / 1000);
        setRecordDuration(elapsed);
        if (elapsed >= 30) stopRecording();
      }, 1000);
    } catch { showToast("Microphone access denied", "error"); }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") mediaRecorder.current.stop();
    setIsRecording(false);
    if (recordTimer.current) clearInterval(recordTimer.current);
  };

  const handleReaction = async (msgId: string, emoji: string) => { if (active) await addReaction(active.id, msgId, user.uid, emoji); setReactionMsgId(null); };
  const handleTyping = (val: string) => {
    setInput(val);
    if (!active) return;
    setTyping(active.id, user.uid, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTyping(active.id, user.uid, false), 2000);
  };
  const handleChatGift = async (gift: typeof CHAT_GIFTS[0]) => {
    if (!active || giftSending) return;
    const otherId = active.participants.find(p => p !== user.uid);
    if (!otherId) return;
    setGiftSending(true);
    try {
      const ok = await sendGift(user.uid, user as UserProfile, otherId, gift.emoji, gift.cost);
      if (!ok) { showToast("Not enough coins!", "error"); setGiftSending(false); return; }
      unlockedConvs.current.add(active.id);
      setChatLocked(false);
      setShowChatGifts(false);
      showToast(`${gift.emoji} ${gift.name} sent!`, "success");
      await sendMessage(active.id, user.uid, `sent ${gift.emoji} ${gift.name}`, "system");
      sendNotification(otherId, { type: "gift", title: "Gift Received!", body: `${user.name} sent you ${gift.emoji} ${gift.name}`, icon: gift.emoji, fromUid: user.uid, fromName: user.name }).catch(()=>{});
    } catch { showToast("Gift failed", "error"); } finally { setGiftSending(false); }
  };

  const handleSwipeStart = useCallback((e: React.TouchEvent, msgId: string) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, id: msgId };
  }, []);
  const handleSwipeMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
    if (dy > 30) { touchStart.current = null; setSwipingMsgId(null); setSwipeX(0); return; }
    if (dx > 10) { setSwipingMsgId(touchStart.current.id); setSwipeX(Math.min(dx, 80)); }
  }, []);
  const handleSwipeEnd = useCallback(() => {
    if (swipeX > 50 && swipingMsgId) {
      const msg = msgs.find(m => m.id === swipingMsgId);
      if (msg) setReplyingTo(msg);
    }
    setSwipingMsgId(null); setSwipeX(0); touchStart.current = null;
  }, [swipeX, swipingMsgId, msgs]);

  const otherTyping = active ? Object.entries(typing).some(([k, v]) => k !== user.uid && v) : false;

  // ========== PRESENCE & LOCK ==========
  const [otherOnline, setOtherOnline] = useState<boolean | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);
  const [chatLocked, setChatLocked] = useState(false);
  const [otherLastSeen, setOtherLastSeen] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const otherId = active.participants[0] === user.uid ? active.participants[1] : active.participants[0];
    setIsFollowing((user.followingList || []).includes(otherId));
    const unsubPresence = subscribeUser(otherId, u => {
      if (u) {
        setOtherOnline(u.online ?? false);
        setOtherProfile(u);
        const isMutual = canChatSync(user, u);
        const eitherIsSuperAdmin = isSuperAdmin(user) || isSuperAdmin(u);
        const giftUnlocked = unlockedConvs.current.has(active!.id);
        setChatLocked(!isMutual && !eitherIsSuperAdmin && !giftUnlocked);
      } else {
        setOtherOnline(false);
        setChatLocked(!isSuperAdmin(user) && !unlockedConvs.current.has(active!.id));
      }
    });
    return unsubPresence;
  }, [active?.id, user.followingList]);

  useEffect(() => {
    if (!active) return;
    const otherId = active.participants[0] === user.uid ? active.participants[1] : active.participants[0];
    if (active.lastSeen && active.lastSeen[otherId]) setOtherLastSeen(active.lastSeen[otherId]);
  }, [active]);

  const handleFollow = async () => {
    if (!active || followLoading) return;
    const otherId = active.participants[0] === user.uid ? active.participants[1] : active.participants[0];
    setFollowLoading(true);
    try {
      if (isFollowing) { await unfollowUser(user.uid, otherId); setIsFollowing(false); showToast("Unfollowed", "info"); }
      else { await followUser(user.uid, otherId); setIsFollowing(true); showToast("Following!", "success", "\u2764\uFE0F"); sendNotification(otherId, { type: "follower", title: "New Follower!", body: `${user.name} started following you`, icon: "\u{1F31F}", fromUid: user.uid, fromName: user.name }).catch(console.error); }
    } catch { showToast("Action failed", "error"); } finally { setFollowLoading(false); }
  };
  const handleBlock = async () => { if (active) { const otherId = active.participants.find(p => p !== user.uid); if (otherId) await blockUser(user.uid, otherId); setActive(null); showToast("User blocked", "info"); } };
  const getStatusIcon = (s?: string) => s === "seen" ? "\u2714\u2714" : s === "delivered" ? "\u2714\u2714" : s === "sent" ? "\u2714" : "";
  const getStatusColor = (s?: string) => s === "seen" ? "#00bfff" : s === "delivered" ? "rgba(162,155,254,0.5)" : "rgba(162,155,254,0.35)";
  const formatLastSeen = (ts: number | null) => { if (!ts) return ""; const diff = Date.now() - ts; if (diff < 60000) return "just now"; if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`; if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`; return `${Math.floor(diff / 86400000)}d ago`; };
  const formatMessageTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Get mutual count (random for demo)
  const getMutualCount = (_targetId: string): number => {
    return Math.floor(Math.random() * 100);
  };

  // Contacts list (non-system conversations only)
  const contactsList = convs
    .filter(conv => {
      const idx = conv.participants[0] === user.uid ? 1 : 0;
      return !conv.participantIsSystem?.[idx];
    })
    .map(conv => {
      const idx = conv.participants[0] === user.uid ? 1 : 0;
      const otherId = conv.participants[idx];
      const isMutual = (user.followingList || []).includes(otherId) && (user.followersList || []).includes(otherId);
      return {
        id: otherId,
        name: conv.participantNames[idx],
        avatar: conv.participantAvatars[idx],
        lastTime: conv.lastTime,
        isFriend: isMutual,
        mutualCount: getMutualCount(otherId),
      };
    })
    .sort((a,b) => (b.lastTime || 0) - (a.lastTime || 0));

  // Recommend friends (for Contacts tab only)
  const recommendedFriends = contactsList.slice(0, 5).map(contact => ({
    id: contact.id,
    name: contact.name,
    avatar: contact.avatar,
    isOfficial: false,
  }));

  // ========== RENDER NOTIFICATION HUB ==========
  if (showNotifHub) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "52px 14px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => setShowNotifHub(false)} style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontSize: 16, color: "#fff" }}>‹</button>
          <h2 style={{ fontSize: 16, fontWeight: 900, flex: 1 }}>Notifications</h2>
          <button onClick={() => { markAllNotificationsRead(user.uid); showToast("All marked read", "info"); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#6C5CE7", fontWeight: 700, padding: "4px 8px" }}>Mark All Read</button>
        </div>
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 14px" }}>
          {NOTIF_CATEGORIES.map((cat, i) => {
            const unread = notifications.filter(n => !n.read && cat.types.includes(n.type)).length;
            return <button key={cat.key} onClick={() => setNotifTab(i)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "10px 0", background: "none", border: "none", cursor: "pointer", borderBottom: notifTab === i ? "2px solid #6C5CE7" : "2px solid transparent", color: notifTab === i ? "#A29BFE" : "rgba(162,155,254,0.4)", fontWeight: 700, fontSize: 11 }}><span style={{ fontSize: 14 }}>{cat.icon}</span>{cat.label}{unread > 0 && <div style={{ minWidth: 16, height: 16, borderRadius: 8, background: "#ff6482", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, padding: "0 4px", color: "#fff" }}>{unread}</div>}</button>;
          })}
        </div>
        <div className="page-scroll" style={{ flex: 1, padding: "8px 14px" }}>
          {(() => {
            const cat = NOTIF_CATEGORIES[notifTab];
            const catNotifs = notifications.filter(n => cat.types.includes(n.type));
            if (!catNotifs.length) return <div style={{ textAlign: "center", padding: "40px 20px" }}><p style={{ fontSize: 32 }}>{cat.icon}</p><p style={{ fontSize: 13, color: "rgba(162,155,254,0.4)" }}>No {cat.label.toLowerCase()} yet</p></div>;
            return catNotifs.slice(0,30).map(n => (
              <div key={n.id} onClick={() => markNotificationRead(user.uid, n.id)} style={{ display: "flex", gap: 10, padding: "10px 8px", borderRadius: 12, marginBottom: 4, cursor: "pointer", background: n.read ? "transparent" : "rgba(108,92,231,0.08)", border: n.read ? "1px solid transparent" : "1px solid rgba(108,92,231,0.15)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, fontSize: 16, background: "rgba(108,92,231,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>{n.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, fontWeight: 700 }}>{n.title}</span>{!n.read && <div style={{ width: 7, height: 7, borderRadius: 4, background: "#ff6482" }} />}</div><p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginTop: 2 }}>{n.body}</p><span style={{ fontSize: 9, color: "rgba(162,155,254,0.3)" }}>{formatLastSeen(n.timestamp)}</span></div>
              </div>
            ));
          })()}
        </div>
      </div>
    );
  }

  // ========== ACTIVE CHAT VIEW ==========
  if (active) {
    const otherIdx = active.participants[0] === user.uid ? 1 : 0;
    const otherIsSuperAdmin = otherProfile ? isSuperAdmin(otherProfile) : false;
    const selfIsSuperAdmin = isSuperAdmin(user);
    const statusText = otherTyping ? "typing..." : otherOnline ? "● Online" : otherLastSeen ? `Last seen ${formatLastSeen(otherLastSeen)}` : "○ Offline";
    const statusColor = otherTyping ? "#A29BFE" : otherOnline ? "#00e676" : "rgba(162,155,254,0.4)";
    const isSystemConv = active.participantIsSystem?.[otherIdx] || false;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", flexDirection: "column", background: "#0F0F1A", maxWidth: 430, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(8,4,24,0.95)", backdropFilter: "blur(12px)", paddingTop: "env(safe-area-inset-top, 12px)" }}>
          <button onClick={() => { setActive(null); setShowEmojiPicker(false); setShowQuickPhrases(false); setShowChatGifts(false); setReplyingTo(null); }} style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontSize: 18, color: "#fff" }}>←</button>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: 42, height: 42, borderRadius: 21, fontSize: 20, background: otherIsSuperAdmin ? "rgba(255,215,0,0.12)" : "rgba(108,92,231,0.15)", border: otherIsSuperAdmin ? "2px solid rgba(255,215,0,0.4)" : "2px solid rgba(108,92,231,0.3)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {active.participantAvatars[otherIdx]?.startsWith?.("http") ? <img src={active.participantAvatars[otherIdx]} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : active.participantAvatars[otherIdx]}
            </div>
            {otherIsSuperAdmin && <img src={`${import.meta.env.BASE_URL}assets/official/official_frame_new.png`} style={{ position: "absolute", top: -4, left: -4, width: 50, height: 50, pointerEvents: "none" }} />}
            <div style={{ position: "absolute", bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, background: otherOnline ? "#00e676" : "rgba(162,155,254,0.3)", border: "2px solid #0F0F1A" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis" }}>{active.participantNames[otherIdx]}</p>
            <p style={{ fontSize: 10, color: statusColor }}>{statusText}</p>
          </div>
          {!isSystemConv && <button onClick={handleFollow} disabled={followLoading} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 12, background: isFollowing ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #6C5CE7, #8B7CF6)", border: "none", color: "#fff", cursor: "pointer" }}>{followLoading ? "..." : isFollowing ? "Following" : "Follow"}</button>}
          {!isSystemConv && <button onClick={async () => { if (active) { await clearChat(active.id); showToast("Chat cleared", "info"); } }} style={{ fontSize: 14, width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer" }}>🗑️</button>}
          {!isSystemConv && <button onClick={handleBlock} style={{ fontSize: 16, width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer" }}>🚫</button>}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 80px" }}>
          {msgs.map(msg => {
            const isSelf = msg.senderId === user.uid;
            const isSystemMsg = msg.type === "system";
            if (isSystemMsg) {
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ maxWidth: "75%", padding: "8px 12px", borderRadius: "18px 18px 18px 4px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <span style={{ fontSize: 13, color: "#fff", whiteSpace: "pre-wrap" }}>{msg.text}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginTop: 4, fontSize: 9, color: "rgba(162,155,254,0.5)" }}>
                      <span>{formatMessageTime(msg.timestamp)}</span>
                    </div>
                  </div>
                </div>
              );
            }
            const senderIsSuperAdmin = isSelf ? selfIsSuperAdmin : otherIsSuperAdmin;
            const reactions = msg.reactions ? Object.values(msg.reactions) : [];
            const isBeingSwiped = swipingMsgId === msg.id;
            return (
              <div key={msg.id} onTouchStart={e => handleSwipeStart(e, msg.id)} onTouchMove={handleSwipeMove} onTouchEnd={handleSwipeEnd} style={{ display: "flex", flexDirection: "column", alignItems: isSelf ? "flex-end" : "flex-start", marginBottom: 12, transform: isBeingSwiped ? `translateX(${isSelf ? -swipeX : swipeX}px)` : undefined, transition: isBeingSwiped ? "none" : "transform 0.2s", position: "relative" }}>
                {isBeingSwiped && swipeX > 20 && <div style={{ position: "absolute", [isSelf ? "right" : "left"]: isSelf ? "auto" : -30, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#6C5CE7", opacity: Math.min(swipeX / 60, 1) }}>↩️</div>}
                {msg.replyTo && <div style={{ fontSize: 10, color: "rgba(162,155,254,0.5)", padding: "4px 10px", marginBottom: 4, borderLeft: "2px solid #6C5CE7", background: "rgba(108,92,231,0.08)", borderRadius: "0 8px 8px 0", maxWidth: "70%" }}><span style={{ fontWeight: 700, fontSize: 9, color: "#6C5CE7" }}>{msg.replyTo.senderName}</span><p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.replyTo.text}</p></div>}
                <div style={{ maxWidth: "75%", padding: msg.type === "image" ? 4 : "8px 12px", borderRadius: isSelf ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: isSelf ? "linear-gradient(135deg, #6C5CE7, #8B7CF6)" : "rgba(255,255,255,0.07)", border: !isSelf && !senderIsSuperAdmin ? "1px solid rgba(255,255,255,0.1)" : "none", boxShadow: isSelf ? "0 2px 5px rgba(0,0,0,0.2)" : "none" }}>
                  {msg.type === "image" && msg.imageUrl ? <img src={msg.imageUrl} style={{ width: "100%", maxWidth: 240, minWidth: 120, borderRadius: 12, objectFit: "cover", maxHeight: 280 }} /> : msg.type === "voice" && msg.voiceUrl ? <VoicePlayer url={msg.voiceUrl} duration={msg.voiceDuration || 0} isSelf={isSelf} /> : <span style={{ fontSize: 13, color: "#fff" }}>{msg.text}</span>}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginTop: 4, fontSize: 9, color: isSelf ? "rgba(255,255,255,0.6)" : "rgba(162,155,254,0.5)" }}><span>{formatMessageTime(msg.timestamp)}</span>{isSelf && <span style={{ color: getStatusColor(msg.status) }}>{getStatusIcon(msg.status)}</span>}</div>
                </div>
                {reactions.length > 0 && <div style={{ display: "flex", gap: 4, marginTop: 2, paddingLeft: 4 }}>{reactions.map((r,i) => <span key={i} style={{ fontSize: 12, background: "rgba(108,92,231,0.15)", borderRadius: 10, padding: "1px 4px" }}>{r}</span>)}</div>}
                {reactionMsgId === msg.id && <div style={{ display: "flex", gap: 6, marginTop: 6, padding: "4px 8px", background: "rgba(20,10,40,0.95)", borderRadius: 20, border: "1px solid rgba(108,92,231,0.3)" }}>{REACTION_EMOJIS.map(e => <button key={e} onClick={() => handleReaction(msg.id, e)} style={{ background: "none", border: "none", fontSize: 18, padding: 2, cursor: "pointer" }}>{e}</button>)}<button onClick={() => { setReplyingTo(msg); setReactionMsgId(null); }} style={{ background: "none", border: "none", fontSize: 14, padding: 2, cursor: "pointer", color: "#A29BFE" }}>↩️</button></div>}
              </div>
            );
          })}
          {otherTyping && <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10, paddingLeft: 4 }}><div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px 18px 18px 4px", padding: "8px 14px", display: "flex", gap: 4 }}>{[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: "rgba(162,155,254,0.5)", animation: `typingDot 1s ease-in-out ${i*0.2}s infinite` }} />)}</div></div>}
          <div ref={msgEnd} />
        </div>

        {chatLocked && !isSystemConv && (
          <div style={{ padding: "12px 14px", textAlign: "center", background: "rgba(108,92,231,0.06)", borderTop: "1px solid rgba(108,92,231,0.12)" }}>
            <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)" }}>🔒 Send a gift or follow to unlock chat</p>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
              {UNLOCK_GIFTS.slice(0,3).map(g => {
                const canAfford = user.coins >= g.cost;
                return <button key={g.name} disabled={!canAfford || giftSending} onClick={() => handleChatGift(g)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 20, background: canAfford ? "rgba(108,92,231,0.15)" : "rgba(255,255,255,0.04)", border: canAfford ? "1px solid rgba(108,92,231,0.3)" : "1px solid rgba(255,255,255,0.06)", cursor: canAfford ? "pointer" : "not-allowed", opacity: canAfford ? 1 : 0.4, fontSize: 11 }}><span>{g.emoji}</span><span style={{ color: "#A29BFE", fontWeight: 700 }}>{g.cost}</span></button>;
              })}
              {!isFollowing && <button onClick={handleFollow} disabled={followLoading} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 11, background: "rgba(108,92,231,0.2)", border: "1px solid rgba(108,92,231,0.3)", color: "#6C5CE7", cursor: "pointer" }}>{followLoading ? "..." : "Follow"}</button>}
            </div>
          </div>
        )}

        {showEmojiPicker && <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(8,4,24,0.95)", display: "flex", flexWrap: "wrap", gap: 4 }}>{EMOJI_GRID.map(e => <button key={e} onClick={async () => { if (chatLocked && !isSystemConv) { showToast("Unlock chat first", "warning"); return; } await sendMessage(active.id, user.uid, e, "emoji"); setShowEmojiPicker(false); }} style={{ background: "none", border: "none", fontSize: 24, padding: 4, cursor: "pointer" }}>{e}</button>)}</div>}
        {showChatGifts && !isSystemConv && <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(8,4,24,0.95)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 800, color: "#A29BFE" }}>{chatLocked ? "Send Gift to Unlock" : "Send Gift"}</span><span style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>💎 {user.coins.toLocaleString()}</span></div><div style={{ display: "flex", gap: 8, justifyContent: "center" }}>{CHAT_GIFTS.map(g => <button key={g.name} disabled={user.coins < g.cost || giftSending} onClick={() => handleChatGift(g)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 14px", borderRadius: 14, background: user.coins >= g.cost ? "rgba(108,92,231,0.15)" : "rgba(255,255,255,0.04)", border: user.coins >= g.cost ? "1px solid rgba(108,92,231,0.3)" : "1px solid rgba(255,255,255,0.06)", cursor: user.coins >= g.cost ? "pointer" : "not-allowed", opacity: user.coins >= g.cost ? 1 : 0.4 }}><span style={{ fontSize: 22 }}>{g.emoji}</span><span style={{ fontSize: 9, fontWeight: 700, color: "#A29BFE" }}>{g.name}</span><span style={{ fontSize: 8, color: "rgba(162,155,254,0.4)" }}>{g.cost} coins</span></button>)}</div></div>}
        {showQuickPhrases && !isSystemConv && <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(8,4,24,0.95)", display: "flex", flexWrap: "wrap", gap: 6 }}>{QUICK_PHRASES.map(p => <button key={p} onClick={async () => { if (chatLocked) { showToast("Unlock chat first", "warning"); return; } await sendMessage(active.id, user.uid, p); setShowQuickPhrases(false); incrementStat(user.uid, "messagesSent").catch(()=>{}); const oid = active.participants.find(p=>p!==user.uid); if(oid && !(oid in SYSTEM_USERS)) sendNotification(oid, { type: "message", title: "New Message", body: `${user.name}: ${p}`, icon: "💬", fromUid: user.uid, fromName: user.name }).catch(()=>{}); }} style={{ background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)", borderRadius: 16, padding: "6px 12px", fontSize: 12, color: "#A29BFE", cursor: "pointer", whiteSpace: "nowrap" }}>{p}</button>)}</div>}
        {replyingTo && <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(108,92,231,0.15)", background: "rgba(108,92,231,0.06)", display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1, borderLeft: "3px solid #6C5CE7", paddingLeft: 10, overflow: "hidden" }}><span style={{ fontSize: 10, fontWeight: 700, color: "#6C5CE7" }}>{replyingTo.senderName || "User"}</span><p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", margin: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{replyingTo.type === "voice" ? "🎤 Voice message" : replyingTo.type === "image" ? "📷 Photo" : replyingTo.text}</p></div><button onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: "rgba(162,155,254,0.5)" }}>✕</button></div>}

        <div style={{ display: "flex", gap: 6, padding: "10px 12px", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(8,4,24,0.95)", backdropFilter: "blur(14px)", flexShrink: 0, paddingBottom: "max(env(safe-area-inset-bottom, 10px), 10px)" }}>
          {!isSystemConv && <button onClick={() => fileRef.current?.click()} style={{ width: 36, height: 36, borderRadius: 18, background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.25)", cursor: "pointer", fontSize: 18, color: "#A29BFE" }}>+</button>}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSend} />
          {!isSystemConv && <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowQuickPhrases(false); setShowChatGifts(false); }} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>😊</button>}
          {!isSystemConv && <button onClick={() => { setShowQuickPhrases(!showQuickPhrases); setShowEmojiPicker(false); setShowChatGifts(false); }} style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", color: showQuickPhrases ? "#6C5CE7" : "#A29BFE", fontWeight: 800 }}>⚡</button>}
          {!isSystemConv && <button onClick={() => { setShowChatGifts(!showChatGifts); setShowEmojiPicker(false); setShowQuickPhrases(false); }} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: showChatGifts ? "#ff6482" : "#A29BFE" }}>🎁</button>}
          {isRecording ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(255,100,130,0.1)", borderRadius: 22, border: "1px solid rgba(255,100,130,0.3)" }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: "#ff6482", animation: "pulse-glow 1s infinite" }} />
              <span style={{ fontSize: 13, color: "#ff6482", fontWeight: 700, flex: 1 }}>{formatDuration(recordDuration)} / 0:30</span>
              <button onClick={stopRecording} style={{ background: "rgba(255,100,130,0.2)", border: "none", borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#ff6482" }}>⏹ Send</button>
            </div>
          ) : (
            <>
              <input className="input-field" style={{ flex: 1, borderRadius: 22, padding: "10px 14px", fontSize: 13, background: isSystemConv ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none" }} placeholder={isSystemConv ? "Can't send messages to system account" : "Type a message..."} value={input} onChange={e => handleTyping(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !isSystemConv && !chatLocked) handleSend(); }} disabled={isSystemConv} />
              {input.trim() && !isSystemConv ? <button onClick={() => { if (!chatLocked) handleSend(); else showToast("Unlock chat first", "warning"); }} style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #6C5CE7, #A29BFE)", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", boxShadow: "0 2px 10px rgba(108,92,231,0.4)" }}>➤</button> : !isSystemConv && <button onClick={() => { if (!chatLocked) startRecording(); else showToast("Unlock chat first", "warning"); }} style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(108,92,231,0.15)", border: "none", fontSize: 18, cursor: "pointer", color: "#A29BFE" }}>🎤</button>}
            </>
          )}
        </div>
      </div>
    );
  }

  // ========== CHAT LIST VIEW (Contacts & Messages tabs) ==========
  // Sort conversations by lastTime (latest first)
  const sortedConvs = [...convs].sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));

  return (
    <div className="page-scroll">
      <div style={{ padding: "52px 16px 12px" }}>
        {/* Tabs - Contacts | Messages */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <span
            onClick={() => setActiveTab("contacts")}
            style={{ fontSize: 18, fontWeight: 800, color: activeTab === "contacts" ? "#6C5CE7" : "rgba(162,155,254,0.5)", borderBottom: activeTab === "contacts" ? "2px solid #6C5CE7" : "none", paddingBottom: 8, cursor: "pointer" }}
          >Contacts</span>
          <span
            onClick={() => setActiveTab("messages")}
            style={{ fontSize: 18, fontWeight: 800, color: activeTab === "messages" ? "#6C5CE7" : "rgba(162,155,254,0.5)", borderBottom: activeTab === "messages" ? "2px solid #6C5CE7" : "none", paddingBottom: 8, cursor: "pointer" }}
          >Messages</span>
        </div>

        {/* Stats row 1: Friends | Followers | Following */}
        <div style={{ display: "flex", justifyContent: "space-between", background: "rgba(108,92,231,0.06)", borderRadius: 28, padding: "12px 20px", marginBottom: 12, border: "1px solid rgba(108,92,231,0.15)" }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{user.friendsCount || 0} <span style={{ fontWeight: 400, color: "rgba(162,155,254,0.7)" }}>Friends</span></span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{user.followers || 0} <span style={{ fontWeight: 400, color: "rgba(162,155,254,0.7)" }}>Followers</span></span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{user.following || 0} <span style={{ fontWeight: 400, color: "rgba(162,155,254,0.7)" }}>Following</span></span>
        </div>

        {/* Stats row 2: Fans (❤️) and Visitors (👁️) */}
        <div style={{ display: "flex", justifyContent: "space-around", background: "rgba(0,0,0,0.2)", borderRadius: 28, padding: "10px 20px", marginBottom: 20, border: "1px solid rgba(108,92,231,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>❤️</span>
            <div>
              <span style={{ fontSize: 16, fontWeight: 800, display: "block" }}>{user.fansCount || 0}</span>
              <span style={{ fontSize: 10, color: "rgba(162,155,254,0.6)" }}>Fans</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>👁️</span>
            <div>
              <span style={{ fontSize: 16, fontWeight: 800, display: "block" }}>{user.visitorsCount || 0}</span>
              <span style={{ fontSize: 10, color: "rgba(162,155,254,0.6)" }}>Visitors</span>
            </div>
          </div>
        </div>

        {/* CONTACTS TAB - with Recommend Friends */}
        {activeTab === "contacts" && (
          <>
            {/* RECOMMEND FRIENDS */}
            {recommendedFriends.length > 0 && (
              <>
                <p style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,215,0,0.6)", marginBottom: 8, letterSpacing: 1 }}>📌 RECOMMEND FRIENDS</p>
                <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, marginBottom: 20 }}>
                  {recommendedFriends.map(f => (
                    <div key={f.id} onClick={() => { const conv = convs.find(c => c.participants.includes(f.id)); if (conv) setActive(conv); else showToast("Start a conversation", "info"); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 70, cursor: "pointer" }}>
                      <div style={{ width: 56, height: 56, borderRadius: 28, background: "linear-gradient(135deg, #a855f7, #6C5CE7)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {f.avatar?.startsWith("http") ? <img src={f.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 24 }}>{f.avatar || "👤"}</span>}
                      </div>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>{f.name.length > 10 ? f.name.slice(0,8)+".." : f.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Contacts List */}
            <div style={{ padding: "0 14px" }}>
              {contactsList.map(contact => (
                <div key={contact.id} onClick={() => { const conv = convs.find(c => c.participants.includes(contact.id)); if (conv) setActive(conv); else showToast("Start a conversation", "info"); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 2px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 24, background: "rgba(108,92,231,0.14)", border: "2px solid rgba(108,92,231,0.25)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {contact.avatar?.startsWith("http") ? <img src={contact.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 24 }}>{contact.avatar || "👤"}</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>{contact.name}</span>
                      <span style={{ fontSize: 11, color: "rgba(162,155,254,0.35)" }}>📞{contact.mutualCount}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "rgba(162,155,254,0.6)", marginTop: 2 }}>
                      {contact.isFriend ? "Friends" : "Follow back to become friends."}
                    </p>
                  </div>
                </div>
              ))}
              {contactsList.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <p style={{ fontSize: 40, marginBottom: 12 }}>👥</p>
                  <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No contacts yet</p>
                  <p style={{ fontSize: 12, color: "rgba(162,155,254,0.4)" }}>Follow people to see them here</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* MESSAGES TAB - ONLY CHATLIST (no System Notifications tile, no Recommend Friends) */}
        {activeTab === "messages" && (
          <div style={{ padding: "0 14px" }}>
            {loading ? (
              Array.from({ length: 5 }).map((_,i)=> <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 2px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><div className="skeleton skeleton-circle" style={{ width: 48, height: 48 }} /><div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}><div className="skeleton skeleton-text" style={{ width:"50%" }} /><div className="skeleton skeleton-text" style={{ width:"70%" }} /></div></div>)
            ) : sortedConvs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>💬</p>
                <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No conversations yet</p>
                <p style={{ fontSize: 12, color: "rgba(162,155,254,0.4)" }}>Start chatting from Rooms or Explore!</p>
              </div>
            ) : (
              sortedConvs.map(conv => {
                const idx = conv.participants[0] === user.uid ? 1 : 0;
                const elapsed = Date.now() - (conv.lastTime || 0);
                const timeStr = elapsed < 3600000 ? `${Math.floor(elapsed / 60000)}m` : elapsed < 86400000 ? `${Math.floor(elapsed / 3600000)}h` : `${Math.floor(elapsed / 86400000)}d`;
                const unreadCount = (conv.unread || {})[user.uid] || 0;
                const isSystem = conv.participantIsSystem?.[idx] || false;
                return (
                  <div key={conv.id} onClick={() => { setActive(conv); markRead(conv.id, user.uid); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 2px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
                    <div style={{ position: "relative" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 24, fontSize: 22, background: "rgba(108,92,231,0.14)", border: "2px solid rgba(108,92,231,0.25)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        {conv.participantAvatars[idx]?.startsWith?.("http") ? <img src={conv.participantAvatars[idx]} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : conv.participantAvatars[idx]}
                      </div>
                      {isSystem && <div style={{ position: "absolute", bottom: -4, right: -4, background: "#FFD700", borderRadius: 10, width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#000" }}>✨</div>}
                      <div style={{ position: "absolute", bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, background: "#00e676", border: "1.5px solid #0F0F1A" }} />
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: isSystem ? "#FFD700" : "#fff" }}>{conv.participantNames[idx]}</span>
                        <span style={{ fontSize: 11, color: "rgba(162,155,254,0.35)" }}>{timeStr}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "rgba(162,155,254,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.lastMessage}</p>
                    </div>
                    {unreadCount > 0 && <div style={{ minWidth: 20, height: 20, borderRadius: 10, background: "#ff6482", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, padding: "0 5px", color: "#fff" }}>{unreadCount}</div>}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== VOICE PLAYER ==========
function VoicePlayer({ url, duration, isSelf }: { url: string; duration: number; isSelf: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bars = useRef(Array.from({ length: 20 }, () => 0.2 + Math.random() * 0.8));
  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.ontimeupdate = () => { if (audioRef.current) setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100); };
      audioRef.current.onended = () => { setPlaying(false); setProgress(0); };
    }
    playing ? audioRef.current.pause() : audioRef.current.play();
    setPlaying(!playing);
  };
  const activeIdx = Math.floor((progress / 100) * bars.current.length);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", minWidth: 140 }}>
      <button onClick={toggle} style={{ width: 28, height: 28, borderRadius: 14, border: "none", cursor: "pointer", background: isSelf ? "rgba(255,255,255,0.2)" : "rgba(108,92,231,0.3)", color: "#fff", fontSize: 12 }}>{playing ? "⏸" : "▶"}</button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}><div style={{ display: "flex", alignItems: "center", gap: 2, height: 20 }}>{bars.current.map((h,i) => <div key={i} style={{ flex: 1, height: `${h*100}%`, borderRadius: 1, background: i <= activeIdx ? (isSelf ? "rgba(255,255,255,0.7)" : "#6C5CE7") : (isSelf ? "rgba(255,255,255,0.2)" : "rgba(108,92,231,0.25)") }} />)}</div><span style={{ fontSize: 9, color: isSelf ? "rgba(255,255,255,0.5)" : "rgba(162,155,254,0.4)" }}>{formatDuration(Math.round(duration))}</span></div>
    </div>
  );
}

function formatDuration(sec: number) { const m = Math.floor(sec/60); const s = sec%60; return `${m}:${String(s).padStart(2,"0")}`; }