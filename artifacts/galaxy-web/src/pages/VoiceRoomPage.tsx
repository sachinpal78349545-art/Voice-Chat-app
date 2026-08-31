// VoiceRoomPage.tsx – Dynamic Room Theme Picker with Optimized Background
import React, { useState, useEffect, useRef } from "react";
import { uploadWithAppCheck } from "../lib/firebase";
import { getStoreItem, STORE_ITEMS } from "../lib/storeService";
import {
  Room, RoomMessage, ROOM_THEMES, ROOM_AVATARS,
  subscribeRoom, subscribeRoomMessages, sendRoomMessage,
  raiseHand, kickFromSeat, muteUserSeat, toggleLockSeat, toggleMuteSeat,
  leaveSeat, joinSeat, setCoHost, isOwnerOrAdmin, getUserRole,
  joinRoom, leaveRoom, setAdmin, removeAdmin, banUser, unbanUser,
  kickUserFromRoom, updateRoomSettings, endRoom,
  followRoom, unfollowRoom, setupPresence,
} from "../lib/roomService";
import { UserProfile, gainXP, sendGift, incrementStat, followUser, reportUser, isOfficialOrAdmin, ensureSuperAdmin, isSuperAdmin, getUser } from "../lib/userService";
import { recordGift, getGiftLeaderboard, LeaderboardEntry, LeaderboardPeriod } from "../lib/giftService";
import { sendNotification } from "../lib/notificationService";
import { getOrCreateConversation } from "../lib/chatService";
import { voiceService } from "../lib/voiceService";
import { useToast } from "../lib/toastContext";
import { subscribeWaitlist, joinWaitlist, leaveWaitlist, admitFromWaitlist } from "../lib/roomService";
import { PKBattle, PKInvite, subscribePKBattle, subscribePKInvites, sendPKInvite, respondPKInvite, endPKBattle, getPKDurations } from "../lib/pkBattleService";
import { RoomHeader, SeatGrid, ChatSection, BottomBar, DiceGame, GameHub, ClassicLudo, CarromGame, TruthDareWheel, cleanName, hashCode } from "../components/room";
import SnakeLadders from "../components/room/SnakeLadders";
import { subscribeNotifications, Notification } from "../lib/notificationService";
import GiftAnimation from "../components/gifts/GiftAnimation";
import { GiftAnimState } from "../components/gifts/giftTypes";
import EntryEffect from "../components/room/EntryEffect";
import { ref as dbRef, get } from "firebase/database";
import { db } from "../lib/firebase";

interface Props { roomId: string; user: UserProfile; onLeave: () => void; onMinimize?: () => void; enteredPassword?: string; onMessage?: (uid: string) => void; }

export default function VoiceRoomPage({ roomId, user, onLeave, onMinimize, enteredPassword, onMessage }: Props) {
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [isMuted, setIsMuted] = useState(true);
  const [inputText, setInputText] = useState("");
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [floats, setFloats] = useState<{ id: number; item: string; x: number; big?: boolean }[]>([]);
  const [elapsed, setElapsed] = useState("0:00");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lbPeriod, setLbPeriod] = useState<LeaderboardPeriod>("daily");
  const [lbEntries, setLbEntries] = useState<LeaderboardEntry[]>([]);
  const [speakingUids, setSpeakingUids] = useState<Set<number>>(new Set());
  const [giftAnim, setGiftAnim] = useState<GiftAnimState | null>(null);
  const [giftParticles, setGiftParticles] = useState<{ id: number; emoji: string; x: number; y: number; px: string; py: string }[]>([]);
  const [showCloseMenu, setShowCloseMenu] = useState(false);
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const [showHostControls, setShowHostControls] = useState(false);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [welcomeAnim, setWelcomeAnim] = useState<string | null>(null);
  const [showSeatSheet, setShowSeatSheet] = useState<number | null>(null);
  const [showProfileCard, setShowProfileCard] = useState<{ uid: string; name: string; avatar: string; seatIdx: number } | null>(null);
  const [controlPanel, setControlPanel] = useState(false);
  const [cpTab, setCpTab] = useState<"profile" | "follower" | "events">("profile");
  const [cpSubView, setCpSubView] = useState<null | "blocked" | "advanced" | "country">(null);
  const [cpEditName, setCpEditName] = useState("");
  const [cpAnnouncement, setCpAnnouncement] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [showReportModal, setShowReportModal] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [showGameHub, setShowGameHub] = useState(false);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [_inviteSeatIdx, setInviteSeatIdx] = useState<number | null>(null);
  const [equippedFrames, setEquippedFrames] = useState<Record<string, string>>({});
  const [cpDpUploading, setCpDpUploading] = useState(false);
  const cpDpRef = useRef<HTMLInputElement>(null);
  const [waitlist, setWaitlist] = useState<Array<{ uid: string; name: string; avatar: string; joinedAt: number }>>([]);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [pkBattle, setPkBattle] = useState<PKBattle | null>(null);
  const [pkInvites, setPkInvites] = useState<PKInvite[]>([]);
  const [showPKPanel, setShowPKPanel] = useState(false);
  const [pkTimer, setPkTimer] = useState("");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showRoomMode, setShowRoomMode] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [roomThemes, setRoomThemes] = useState<any[]>([]);
  const [backgroundValue, setBackgroundValue] = useState<string | null>(null);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [seatFloats, setSeatFloats] = useState<{ id: number; emoji: string; left: number; top: number }[]>([]);
  const [inboxNotifs, setInboxNotifs] = useState<Notification[]>([]);
  const floatId = useRef(0);
  const msgEnd = useRef<HTMLDivElement>(null);
  const roomContainerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const joinedRef = useRef(false);
  const voiceInitRef = useRef(false);
  const presenceCleanupRef = useRef<(() => void) | null>(null);
  const joinTimestampRef = useRef(Date.now());
  const chatClearedAtRef = useRef(0);

  // ─── Helper to optimize Cloudinary images ───
  const optimizeImageUrl = (url: string): string => {
    if (!url || !url.includes("cloudinary.com")) return url;
    // Add width 400, auto quality, auto format for mobile
    return url.replace("/upload/", "/upload/w_400,q_auto,f_auto/");
  };

  // ─── Fetch room themes from Firebase ───
  const fetchRoomThemes = async () => {
    try {
      const snap = await get(dbRef(db, "appConfig/themes"));
      if (snap.exists()) {
        const data = snap.val();
        const themes = Object.values(data).filter((t: any) => t.enabled !== false);
        setRoomThemes(themes);
        return themes;
      } else {
        const fallback = STORE_ITEMS.filter(i => i.category === "theme");
        setRoomThemes(fallback);
        return fallback;
      }
    } catch {
      const fallback = STORE_ITEMS.filter(i => i.category === "theme");
      setRoomThemes(fallback);
      return fallback;
    }
  };

  useEffect(() => {
    if (!showThemePicker) return;
    fetchRoomThemes();
  }, [showThemePicker]);

  const preloadImage = (src: string) => new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to load room background: ${src}`));
    image.src = src;
  });

  const prepareRoomBackground = async (roomValue: Room, themes: any[]) => {
    const themeId = roomValue.theme || "galaxy";
    let theme = themes.find(t => t.id === themeId);
    if (!theme) theme = ROOM_THEMES.find(t => t.id === themeId);

    const imageUrl = themeId !== "galaxy" && theme?.imageUrl
      ? optimizeImageUrl(theme.imageUrl)
      : `${import.meta.env.BASE_URL}bg-mystical.png`;
    const cssFallback = themeId !== "galaxy" && theme?.preview
      ? theme.preview
      : "radial-gradient(circle at 30% 20%, #25104e, #0a0614 65%)";

    setBackgroundReady(false);
    setBackgroundValue(`url("${imageUrl}")`);
    try {
      await preloadImage(imageUrl);
    } catch {
      // Keep the room usable when a remote CDN image is unavailable.
      setBackgroundValue(cssFallback);
    } finally {
      setBackgroundReady(true);
    }
  };

  // ─── Apply the already-preloaded background ───
  useEffect(() => {
    const container = roomContainerRef.current;
    if (!container) return;
    if (!backgroundValue) return;
    container.style.backgroundImage = backgroundValue;
    container.style.backgroundSize = "cover";
    container.style.backgroundPosition = "center";
    container.style.backgroundRepeat = "no-repeat";
    container.style.backgroundColor = "#0a0614";
  }, [backgroundValue]);

  // ─── Original useEffects (unchanged) ───
  useEffect(() => {
    const unsub1 = subscribeRoom(roomId, r => {
      if (!r && joinedRef.current) {
        showToast("Room has ended", "info");
        onLeave();
        return;
      }
      setRoom(r);
      if (r && !joinedRef.current) {
        joinedRef.current = true;
        const officialFlag = isOfficialOrAdmin(user);
        const superAdminFlag = isSuperAdmin(user);
        if (superAdminFlag) ensureSuperAdmin(user.uid).catch(console.error);
        fetchRoomThemes().then(themes => prepareRoomBackground(r, themes)).then(() =>
          joinRoom(roomId, user.uid, user.name, user.avatar, enteredPassword, officialFlag, superAdminFlag, user.ghostMode || false)
        ).then(res => {
          if (!res.joined) {
            showToast(res.reason || "Cannot join room", "error");
            onLeave();
            return;
          }
          presenceCleanupRef.current = setupPresence(roomId, user.uid);
          incrementStat(user.uid, "roomsJoined").catch(console.error);
          if (officialFlag) {
            sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F6E1}\uFE0F", text: `Official Support ${cleanName(user.name)} has entered the room`, type: "system" }).catch(console.error);
          } else {
            const entryItem = user.equippedEntry ? getStoreItem(user.equippedEntry) : null;
            const entryIcon = entryItem ? entryItem.icon : "\u{1F389}";
            const entryText = entryItem
              ? `${entryIcon} ${cleanName(user.name)} arrived with ${entryItem.name}! ${entryIcon}`
              : `Welcome ${cleanName(user.name)} to the room \u{1F389}`;
            sendRoomMessage(roomId, { userId: "system", username: "System", avatar: entryIcon, text: entryText, type: "welcome" }).catch(console.error);
          }
          setWelcomeAnim(cleanName(user.name));
          setTimeout(() => setWelcomeAnim(null), 3500);
        }).catch(err => {
          console.error("Join error:", err);
          showToast("Failed to join room", "error");
          onLeave();
        });
      }
    });
    const since = joinTimestampRef.current;
    const unsub2 = subscribeRoomMessages(roomId, (msgs) => {
      const cutoff = Math.max(since, chatClearedAtRef.current);
      setMessages(cutoff > 0 ? msgs.filter(m => m.timestamp >= cutoff) : msgs);
    }, since);
    return () => { unsub1(); unsub2(); presenceCleanupRef.current?.(); };
  }, [roomId]);

  useEffect(() => {
    if (!room?.chatClearedAt) return;
    const clearedAt = room.chatClearedAt as number;
    if (clearedAt > chatClearedAtRef.current) {
      chatClearedAtRef.current = clearedAt;
      setMessages(prev => prev.filter(m => m.timestamp >= clearedAt));
    }
  }, [room?.chatClearedAt]);

  useEffect(() => {
    if (!room) return;
    const seatUids = (room.seats || []).filter(s => s.userId).map(s => s.userId!);
    if (seatUids.length === 0) { setEquippedFrames({}); return; }
    const frames: Record<string, string> = {};
    if (user.equippedFrame) frames[user.uid] = user.equippedFrame;
    Promise.all(seatUids.filter(uid => uid !== user.uid).map(uid =>
      getUser(uid).then(u => { if (u?.equippedFrame) frames[uid] = u.equippedFrame; }).catch(() => {})
    )).then(() => setEquippedFrames(frames));
  }, [room?.seats?.map(s => s.userId).join(",")]);

  useEffect(() => {
    if (!room || voiceInitRef.current) return;
    voiceInitRef.current = true;
    (async () => {
      const ok = await voiceService.init();
      if (ok) {
        const numericUid = Math.abs(hashCode(user.uid)) % 1000000;
        await voiceService.join(roomId, numericUid);
        voiceService.onSpeaker((uid, vol) => {
          setSpeakingUids(prev => {
            const next = new Set(prev);
            if (vol > 15) next.add(uid);
            else next.delete(uid);
            return next;
          });
        });
      }
    })();
    return () => { voiceService.leave(); };
  }, [room?.id]);

  const mySeatIndex = room ? room.seats.findIndex(s => s.userId === user.uid) : -1;
  const isOnSeat = mySeatIndex >= 0;
  const prevOnSeatRef = useRef(false);

  useEffect(() => {
    if (prevOnSeatRef.current && !isOnSeat && voiceService.micEnabled) {
      voiceService.disableMic();
      setIsMuted(true);
      showToast("You left the seat, mic disabled", "info", "\u{1F3A4}");
    }
    prevOnSeatRef.current = isOnSeat;
  }, [isOnSeat]);

  const enableMicForSeat = async () => {
    const ok = await voiceService.enableMic();
    if (ok) {
      setIsMuted(false);
      if (room && mySeatIndex >= 0) {
        toggleMuteSeat(roomId, mySeatIndex, false).catch(console.error);
      }
      showToast("Mic is ON", "success", "\u{1F3A4}");
    } else {
      showToast("Microphone permission denied", "error");
    }
  };

  const disableMicForSeat = async () => {
    await voiceService.disableMic();
    setIsMuted(true);
  };

  useEffect(() => {
    if (!room) return;
    const t = setInterval(() => {
      const diff = Date.now() - room.createdAt;
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      if (hrs > 0) setElapsed(`${hrs}:${String(mins % 60).padStart(2, "0")}:${String(Math.floor((diff / 1000) % 60)).padStart(2, "0")}`);
      else setElapsed(`${mins}:${String(Math.floor((diff / 1000) % 60)).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(t);
  }, [room?.createdAt]);

  useEffect(() => {
    if (!room || voiceService.joined) return;
    const t = setInterval(() => {
      setSpeakingUids(prev => {
        const next = new Set<number>();
        room.seats.forEach((s, i) => {
          if (s.userId && !s.isMuted && Math.random() > 0.45) next.add(i);
        });
        if (prev.size === next.size && [...prev].every(v => next.has(v))) return prev;
        return next;
      });
    }, 2000);
    return () => clearInterval(t);
  }, [room?.id]);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const unsub = subscribeWaitlist(roomId, setWaitlist);
    return unsub;
  }, [roomId]);

  useEffect(() => {
    if (!room) return undefined;
    const isHost = room.hostId === user.uid || isSuperAdmin(user);
    if (!isHost) return undefined;
    const unsub = subscribePKInvites(roomId, room.hostId, setPkInvites);
    return unsub;
  }, [roomId, room?.hostId]);

  useEffect(() => {
    if (!(room as any)?.pkBattleId) { setPkBattle(null); return undefined; }
    const unsub = subscribePKBattle((room as any).pkBattleId, setPkBattle);
    return unsub;
  }, [(room as any)?.pkBattleId]);

  useEffect(() => {
    if (!pkBattle || pkBattle.status !== "active") { setPkTimer(""); return undefined; }
    const t = setInterval(() => {
      const remaining = pkBattle.endsAt - Date.now();
      if (remaining <= 0) {
        setPkTimer("ENDED");
        endPKBattle(pkBattle.id).catch(console.error);
        clearInterval(t);
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining / 1000) % 60);
      setPkTimer(`${mins}:${String(secs).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(t);
  }, [pkBattle?.id, pkBattle?.status]);

  const isRealOwner = room?.hostId === user.uid;
  const userIsOfficial = isOfficialOrAdmin(user);
  const userIsSuperAdmin = isSuperAdmin(user);
  const isOwner = isRealOwner || userIsSuperAdmin;
  const hasControl = room ? (isOwnerOrAdmin(room, user.uid) || userIsOfficial || userIsSuperAdmin) : false;
  const myRole = room ? (userIsSuperAdmin ? "owner" as const : getUserRole(room, user.uid)) : "user";
  const liveCount = room ? Object.keys(room.roomUsers || {}).length || room.listeners : 0;

  const spawnFloat = (item: string, big = false) => {
    const id = floatId.current++;
    const x = 10 + Math.random() * 60;
    setFloats(prev => [...prev, { id, item, x, big }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), big ? 3200 : 2800);
  };

  const spawnFloatAtSeat = (emoji: string) => {
    const seatEls = document.querySelectorAll<HTMLElement>("[data-seat-idx]");
    let target: HTMLElement | null = null;
    seatEls.forEach(el => {
      if (el.dataset.seatUid === user.uid) target = el;
    });
    let left = window.innerWidth / 2;
    let top = window.innerHeight * 0.35;
    if (target) {
      const r = (target as HTMLElement).getBoundingClientRect();
      left = r.left + r.width / 2;
      top = r.top + r.height / 2;
    }
    const id = floatId.current++;
    setSeatFloats(prev => [...prev, { id, emoji, left, top }]);
    setTimeout(() => setSeatFloats(prev => prev.filter(f => f.id !== id)), 2200);
  };

  useEffect(() => {
    const unsub = subscribeNotifications(user.uid, setInboxNotifs);
    return unsub;
  }, [user.uid]);

  const initialGameLaunched = useRef(false);
  useEffect(() => {
    if (!room?.initialGame || initialGameLaunched.current) return;
    if (room.hostId === user.uid) {
      initialGameLaunched.current = true;
      setActiveGame(room.initialGame);
    }
  }, [room?.initialGame, room?.hostId, user.uid]);

  const sendChat = async () => {
    const text = inputText.trim();
    if (!text || !room) return;
    try {
      await sendRoomMessage(roomId, { userId: user.uid, username: user.name, avatar: user.avatar, text, type: "text" });
      setInputText("");
      gainXP(user.uid, 3, user.xp, user.level).catch(console.error);
      incrementStat(user.uid, "messagesSent").catch(console.error);
    } catch (err) {
      console.error("Chat send error:", err);
      showToast("Failed to send message", "error");
    }
  };

  const sendEmojiMsg = async (e: string) => {
    spawnFloat(e);
    await sendRoomMessage(roomId, { userId: user.uid, username: user.name, avatar: user.avatar, text: e, type: "emoji" }).catch(console.error);
  };

  const handleGift = async (gift: { emoji: string; name: string; cost: number; url?: string; animationType?: string; soundUrl?: string }, combo: number = 1) => {
    if (!room) return;
    const totalCost = gift.cost * combo;
    const hostSeat = room.seats.find(s => s.userId && s.userId !== user.uid);
    const recipientId = hostSeat?.userId || room.hostId;
    const recipientName = hostSeat?.username || room.host;
    const success = await sendGift(user.uid, user, recipientId, gift.emoji, totalCost);
    if (!success) { showToast(`Not enough coins! Need ${totalCost}`, "warning"); return; }

    const isVip = totalCost >= 500 ||
                  gift.name.toLowerCase().includes("vip") ||
                  gift.name.toLowerCase().includes("premium") ||
                  gift.name.toLowerCase().includes("crown") ||
                  gift.name.toLowerCase().includes("diamond");

    const animationType = (
      gift.animationType === "fullscreen" || gift.animationType === "particle"
        ? gift.animationType
        : isVip ? "fullscreen" : "float"
    ) as "float" | "fullscreen" | "particle";

    if (gift.soundUrl) {
      try { new Audio(gift.soundUrl).play().catch(() => {}); } catch {}
    }

    setGiftAnim({
      emoji: gift.emoji,
      giftName: gift.name,
      sender: user.name,
      receiver: recipientName,
      url: gift.url,
      isVip,
      animationType,
      combo,
    });

    const duration = animationType === "fullscreen" ? 4500 : animationType === "particle" ? 3500 : 3000;
    setTimeout(() => setGiftAnim(null), duration);

    const floatCount = Math.min(combo * 3, 15);
    for (let i = 0; i < floatCount; i++) setTimeout(() => spawnFloat(gift.emoji, true), i * 200);
    const particleEmojis = ["\u2764\uFE0F", "\u2B50", "\u2728", "\uD83D\uDC96", "\uD83C\uDF1F"];
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      emoji: particleEmojis[i % particleEmojis.length],
      x: 50, y: 30,
      px: `${(Math.random() - 0.5) * 200}px`,
      py: `${(Math.random() - 0.5) * 200}px`,
    }));
    setGiftParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => setGiftParticles(prev => prev.filter(p => !newParticles.find(n => n.id === p.id))), 1500);
    const comboText = combo > 1 ? ` x${combo}` : "";
    showToast(`Sent ${gift.emoji} ${gift.name}${comboText} to ${recipientName}`, "success");
    recordGift({ senderId: user.uid, senderName: user.name, senderAvatar: user.avatar, receiverId: recipientId, receiverName: recipientName, receiverAvatar: hostSeat?.avatar || "\u{1F3A4}", giftEmoji: gift.emoji, coins: totalCost, timestamp: Date.now() }).catch(console.error);
    sendNotification(recipientId, { type: "gift", title: "Gift Received!", body: `${user.name} sent you ${gift.emoji} ${gift.name}${comboText}!`, icon: gift.emoji, fromUid: user.uid, fromName: user.name }).catch(console.error);
    sendRoomMessage(roomId, { userId: user.uid, username: user.name, avatar: user.avatar, text: `sent ${gift.emoji} ${gift.name}${comboText} to ${recipientName}`, type: "gift" }).catch(console.error);
  };

  const handleReaction = (emoji: string) => {
    spawnFloat(emoji);
    sendRoomMessage(roomId, { userId: user.uid, username: user.name, avatar: user.avatar, text: emoji, type: "emoji" }).catch(console.error);
  };

  const handleSpeakerToggle = () => {
    const newOff = !isSpeakerOff;
    setIsSpeakerOff(newOff);
    voiceService.setSpeakerOff(newOff);
    showToast(newOff ? "Speaker OFF" : "Speaker ON", "info");
  };

  const handleInviteToSeat = async (uid: string, seatIdx: number) => {
    if (!room) return;
    const ru = room.roomUsers?.[uid];
    const uname = ru?.name || "User";
    try {
      const ok = await joinSeat(roomId, seatIdx, uid, uname, ru?.avatar || "\u{1F464}");
      if (!ok) { showToast("Seat not available", "warning"); setInviteSeatIdx(null); return; }
      showToast(`${uname} invited to seat ${seatIdx + 1}`, "success");
      sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F3A4}", text: `${cleanName(uname)} was invited to seat ${seatIdx + 1}`, type: "system" }).catch(console.error);
    } catch {
      showToast("Failed to invite", "error");
    }
    setInviteSeatIdx(null);
  };

  const handleRaiseHand = async () => {
    if (!room) return;
    const mySeat = room.seats.findIndex(s => s.userId === user.uid);
    if (mySeat >= 0) {
      const raised = !room.seats[mySeat].handRaised;
      await raiseHand(roomId, mySeat, raised);
      showToast(raised ? "Hand raised! \u270B" : "Hand lowered", "info");
    } else {
      if (room.micPermission === "admin_only" && !hasControl) {
        showToast("Only owner/admins can take seats", "warning");
        return;
      }
      const maxMics = room.maxMics || 12;
      const emptySeat = room.seats.findIndex((s, i) => i < maxMics && !s.userId && !s.isLocked);
      if (emptySeat >= 0) {
        if (room.micPermission === "request" && !hasControl) {
          showToast("Mic request sent to owner/admin", "info");
          sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u270B", text: `${cleanName(user.name)} is requesting to speak`, type: "system" }).catch(console.error);
          return;
        }
        const ok = await joinSeat(roomId, emptySeat, user.uid, user.name, user.avatar);
        if (ok) {
          showToast("Joined seat! Enabling mic...", "success");
          await enableMicForSeat();
        } else {
          showToast("No seats available", "warning");
        }
      } else {
        showToast("No seats available", "warning");
      }
    }
  };

  const handleSeatAction = async (action: string, seatIdx: number) => {
    if (!room || !hasControl) return;
    try {
      if (action === "kick") {
        const seatUser = room.seats[seatIdx]?.username;
        const seatUserId = room.seats[seatIdx]?.userId;
        if (seatUserId === user.uid) {
          await disableMicForSeat();
        }
        await kickFromSeat(roomId, seatIdx);
        showToast(`${seatUser} removed from seat`, "info");
        sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F6AB}", text: `${seatUser} was removed from seat`, type: "system" }).catch(console.error);
      } else if (action === "mute") {
        await muteUserSeat(roomId, seatIdx);
        showToast("User muted", "info");
      } else if (action === "unmute") {
        await toggleMuteSeat(roomId, seatIdx, false);
        showToast("User unmuted", "info");
      } else if (action === "lock") {
        await toggleLockSeat(roomId, seatIdx, !room.seats[seatIdx].isLocked);
        showToast(room.seats[seatIdx].isLocked ? "Seat unlocked" : "Seat locked", "info");
      } else if (action === "cohost") {
        const isCo = room.seats[seatIdx].isCoHost;
        await setCoHost(roomId, seatIdx, !isCo);
        showToast(isCo ? "Co-host removed" : "Co-host assigned!", "success");
      } else if (action === "admin") {
        const uid = room.seats[seatIdx].userId;
        if (uid) {
          const isAdm = (room.adminIds || []).includes(uid);
          if (isAdm) { await removeAdmin(roomId, uid); showToast("Admin removed", "info"); }
          else { await setAdmin(roomId, uid); showToast("Admin assigned!", "success"); }
        }
      }
    } catch (err) {
      console.error("Seat action error:", err);
      showToast("Action failed", "error");
    }
    setShowHostControls(false);
    setSelectedSeat(null);
  };

  const handleUserAction = async (action: string, uid: string) => {
    if (!room) return;
    try {
      const ru = room.roomUsers?.[uid];
      const uname = ru?.name || "User";
      if (action === "make_admin") {
        await setAdmin(roomId, uid);
        showToast(`${uname} is now an Admin`, "success");
        sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F6E1}\uFE0F", text: `${cleanName(uname)} was promoted to Admin`, type: "system" }).catch(console.error);
      } else if (action === "remove_admin") {
        await removeAdmin(roomId, uid);
        showToast(`${uname} admin removed`, "info");
      } else if (action === "kick") {
        await kickUserFromRoom(roomId, uid);
        showToast(`${uname} kicked from room`, "info");
        sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F6AB}", text: `${cleanName(uname)} was kicked from the room`, type: "system" }).catch(console.error);
      } else if (action === "ban") {
        await banUser(roomId, uid);
        showToast(`${uname} banned`, "info");
        sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u26D4", text: `${cleanName(uname)} was banned from the room`, type: "system" }).catch(console.error);
      } else if (action === "mute") {
        const seatIdx = room.seats.findIndex(s => s.userId === uid);
        if (seatIdx >= 0) { await muteUserSeat(roomId, seatIdx); showToast(`${uname} muted`, "info"); }
      }
    } catch (err) {
      console.error("User action error:", err);
      showToast("Action failed", "error");
    }
    setSelectedUserUid(null);
  };

  const handleMicToggle = async () => {
    if (!isOnSeat) {
      showToast("Take a seat first to use the mic", "warning", "\u{1F3A4}");
      return;
    }
    if (!voiceService.micEnabled) {
      await enableMicForSeat();
      return;
    }
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    await voiceService.setMuted(newMuted);
    if (room && mySeatIndex >= 0) {
      toggleMuteSeat(roomId, mySeatIndex, newMuted).catch(console.error);
    }
    showToast(newMuted ? "Mic muted" : "Mic unmuted", "info", newMuted ? "\u{1F507}" : "\u{1F3A4}");
  };

  const handleLeave = async () => {
    await disableMicForSeat();
    await voiceService.leave();
    if (room) {
      const mySeat = room.seats.findIndex(s => s.userId === user.uid);
      if (mySeat >= 0) await leaveSeat(roomId, mySeat).catch(console.error);
      await leaveRoom(roomId, user.uid).catch(console.error);
      sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F44B}", text: `${cleanName(user.name)} left the room`, type: "leave" }).catch(console.error);
    }
    onLeave();
  };

  const handleEndRoom = async () => {
    await voiceService.leave();
    if (room) await endRoom(roomId).catch(console.error);
    onLeave();
  };

  const loadLeaderboard = async (period: LeaderboardPeriod) => {
    setLbPeriod(period);
    const entries = await getGiftLeaderboard(period, "senders");
    setLbEntries(entries);
  };

  const shareRoom = () => {
    const shareText = `Join ${room?.name} on Galaxy Voice Chat!`;
    if (navigator.share) navigator.share({ title: room?.name, text: shareText }).catch(() => {});
    else { navigator.clipboard?.writeText(shareText + ` Room ID: ${room?.id}`); showToast("Room link copied!", "success"); }
  };

  const openControlPanel = () => {
    if (!room) return;
    setControlPanel(true);
    setCpEditName(room.name);
    setCpAnnouncement(room.announcement || "");
    setCpTab("profile");
    setCpSubView(null);
  };

  const roomUsers = room?.roomUsers ? Object.values(room.roomUsers) : [];
  roomUsers.sort((a, b) => {
    const ro = { owner: 0, admin: 1, user: 2 };
    return (ro[a.role] || 2) - (ro[b.role] || 2);
  });

  if (!room) {
    return (
      <div className="room-container" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="room-bg" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}bg-mystical.png)` }} />
        <div className="room-bg-overlay" />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 48, animation: "mysticFloat 2s ease-in-out infinite", filter: "drop-shadow(0 0 16px rgba(45,212,191,0.6))" }}>{"\u{1F52E}"}</div>
          <div style={{ width: 36, height: 36, borderRadius: 18, border: "3px solid rgba(45,212,191,0.15)", borderTopColor: "#2DD4BF", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: 1 }}>Entering the sanctuary...</p>
        </div>
      </div>
    );
  }

  return (
      <div className="no-screenshot room-container" ref={roomContainerRef}>
      {!backgroundReady && (
        <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0614" }}>
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
            <div style={{ width: 34, height: 34, margin: "0 auto 12px", borderRadius: "50%", border: "3px solid rgba(45,212,191,0.18)", borderTopColor: "#2DD4BF", animation: "spin 0.8s linear infinite" }} />
            Loading room background...
          </div>
        </div>
      )}
      {/* Default mystical background – only shown when no custom theme is active */}
      {!backgroundValue && (!room?.theme || room.theme === "galaxy") && (
        <>
          <div className="room-bg" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}bg-mystical.png)` }} />
          <div className="room-bg-overlay" />
        </>
      )}

      <div className="galaxy-stars" />
      <div className="galaxy-twinkle" />
      <div className="room-bg-glow" />

      <div style={{
        position: "fixed", inset: 0, zIndex: -7, pointerEvents: "none",
        background: "radial-gradient(ellipse at 25% 15%, rgba(191,0,255,0.35) 0%, transparent 50%), radial-gradient(ellipse at 80% 75%, rgba(0,230,230,0.25) 0%, transparent 45%)",
        animation: "nebulaGlow 7s ease-in-out infinite",
      }} />
      <div style={{
        position: "fixed", inset: 0, zIndex: -6, pointerEvents: "none",
        background: "radial-gradient(circle at 70% 30%, rgba(0,230,230,0.18) 0%, transparent 40%), radial-gradient(circle at 20% 80%, rgba(191,0,255,0.15) 0%, transparent 35%)",
        animation: "nebulaDrift 12s ease-in-out infinite",
      }} />

      {floats.map(f => (
        <div key={f.id} style={{
          position: "fixed", bottom: "42%", right: `${f.x}%`, fontSize: f.big ? 52 : 38, zIndex: 500,
          pointerEvents: "none", animation: f.big ? "giftFly 3.2s ease-out forwards" : "emojiFloat 2.8s ease-out forwards",
        }}>{f.item}</div>
      ))}

      <GiftAnimation giftAnim={giftAnim} giftParticles={giftParticles} />

      <EntryEffect
        name={welcomeAnim || ""}
        avatar={user.avatar}
        entryId={user.equippedEntry}
        visible={!!welcomeAnim}
      />

      <RoomHeader
        room={room}
        myRole={myRole}
        liveCount={liveCount}
        elapsed={elapsed}
        hasControl={hasControl}
        onOpenControlPanel={openControlPanel}
        onShowUsersPanel={() => setShowUsersPanel(true)}
        onShowCloseMenu={() => setShowCloseMenu(true)}
        onLoadLeaderboard={() => { loadLeaderboard("daily"); setShowLeaderboard(true); }}
        onShare={shareRoom}
        onShowMoreMenu={() => setShowMoreMenu(true)}
      />

      <SeatGrid
        room={room}
        userUid={user.uid}
        hasControl={hasControl}
        speakingUids={speakingUids}
        voiceJoined={voiceService.joined}
        hashCode={hashCode}
        isOwnerSeat={(seat) => seat.userId === room.hostId}
        officialUids={new Set(Object.values(room.roomUsers || {}).filter((ru: any) => ru.isOfficial).map((ru: any) => ru.uid))}
        superAdminUids={new Set()}
        equippedFrames={equippedFrames}
        ghostUids={new Set(Object.values(room.roomUsers || {}).filter((ru: any) => ru.ghostMode).map((ru: any) => ru.uid))}
        onSeatTap={(i, seat) => {
          if (seat.userId === user.uid) {
            setShowSeatSheet(i);
            return;
          }
          if (seat.userId) {
            setShowProfileCard({ uid: seat.userId, name: seat.username || "User", avatar: seat.avatar || "\u{1F464}", seatIdx: i });
          } else if (seat.isLocked && hasControl) {
            toggleLockSeat(roomId, i, false).then(() => {
              showToast(`Seat ${i + 1} unlocked`, "success");
            }).catch(console.error);
          } else if (!seat.isLocked) {
            setShowSeatSheet(i);
          }
        }}
      />

      {!isOnSeat && room.seats.every(s => s.userId || s.isLocked) && (
        <div style={{ padding: "6px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          {waitlist.some(w => w.uid === user.uid) ? (
            <button className="btn btn-ghost btn-full" style={{ fontSize: 12, padding: "8px 0" }}
              onClick={async () => {
                await leaveWaitlist(roomId, user.uid);
                showToast("Left waitlist", "info");
              }}>⏳ Leave Queue (#{waitlist.findIndex(w => w.uid === user.uid) + 1})</button>
          ) : (
            <button className="btn btn-primary btn-full" style={{ fontSize: 12, padding: "8px 0" }}
              onClick={async () => {
                const pos = await joinWaitlist(roomId, user.uid, user.name, user.avatar);
                showToast(`Joined queue at position #${pos}`, "success");
              }}>⏳ Join Waitlist ({waitlist.length} waiting)</button>
          )}
        </div>
      )}

      <ChatSection messages={messages} userId={user.uid} msgEndRef={msgEnd} />

      <BottomBar
        room={room}
        user={user}
        inputText={inputText}
        setInputText={setInputText}
        isMuted={isMuted}
        isSpeakerOff={isSpeakerOff}
        isOnSeat={isOnSeat}
        onSendChat={sendChat}
        onSendEmoji={sendEmojiMsg}
        onHandleGift={handleGift}
        onHandleReaction={handleReaction}
        onMicToggle={handleMicToggle}
        onSpeakerToggle={handleSpeakerToggle}
        onRaiseHand={handleRaiseHand}
        onShare={shareRoom}
        showToast={showToast}
        onOpenMenu={() => setShowGameHub(true)}
        onOpenInbox={() => setShowInbox(true)}
        onFloatEmoji={spawnFloatAtSeat}
        inboxBadge={inboxNotifs.filter(n => !n.read).length}
      />

      {seatFloats.map(f => (
        <div key={f.id} style={{
          position: "fixed", left: f.left, top: f.top, zIndex: 1500,
          pointerEvents: "none", fontSize: 38,
          transform: "translate(-50%, -50%)",
          animation: "seatFloatRise 2.2s ease-out forwards",
          filter: "drop-shadow(0 0 8px rgba(167,139,250,0.6))",
        }}>{f.emoji}</div>
      ))}

      {showGameHub && (
        <GameHub
          hasControl={hasControl}
          onSelectGame={(g) => { setShowGameHub(false); setActiveGame(g); }}
          onClose={() => setShowGameHub(false)}
        />
      )}

      {activeGame === "dice" && (
        <DiceGame roomId={roomId} userId={user.uid} username={user.name}
          onClose={() => setActiveGame(null)} />
      )}
      {activeGame === "ludo" && (
        <ClassicLudo roomId={roomId} userId={user.uid} username={user.name}
          hasControl={hasControl} onClose={() => setActiveGame(null)}
          voiceUsers={roomUsers.map(u => ({ uid: u.uid, name: u.name, avatar: u.avatar }))}
          speakingUidsHash={speakingUids}
          hashCode={hashCode} />
      )}
      {activeGame === "carrom" && (
        <CarromGame roomId={roomId} userId={user.uid} username={user.name}
          hasControl={hasControl} onClose={() => setActiveGame(null)} />
      )}
      {activeGame === "tod" && (
        <TruthDareWheel roomId={roomId} userId={user.uid} username={user.name}
          hasControl={hasControl}
          roomUsers={roomUsers.map(u => ({ uid: u.uid, name: u.name }))}
          onClose={() => setActiveGame(null)} />
      )}
      {activeGame === "snake" && (
        <SnakeLadders roomId={roomId} userId={user.uid} username={user.name}
          hasControl={hasControl} onClose={() => setActiveGame(null)} />
      )}

      {/* ── 3-DOT MORE MENU ── */}
      {showMoreMenu && (
        <div onClick={() => setShowMoreMenu(false)} style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
          paddingTop: 90, paddingRight: 14,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 200, background: "rgba(20,12,40,0.97)",
            border: "1px solid rgba(167,139,250,0.4)", borderRadius: 14,
            padding: 6, boxShadow: "0 12px 36px rgba(0,0,0,0.7)",
            animation: "popIn 0.18s ease",
          }}>
            {[
              { icon: "🧹", label: "Clean Chat", color: "#22d3ee", onClick: () => { setMessages([]); showToast("Chat cleared (locally)", "success"); }, show: true },
              { icon: room.isPrivate ? "🔓" : "🔒", label: room.isPrivate ? "Unlock Room" : "Lock Room", color: "#f59e0b", onClick: async () => {
                if (!hasControl) { showToast("Admin only", "error"); return; }
                try { await updateRoomSettings(roomId, { isPrivate: !room.isPrivate } as any); showToast(room.isPrivate ? "Room unlocked" : "Room locked", "success"); }
                catch { showToast("Failed", "error"); }
              }, show: true },
              { icon: "🎨", label: "Room Theme", color: "#a78bfa", onClick: () => { if (!hasControl) { showToast("Admin only", "error"); return; } setShowThemePicker(true); }, show: hasControl },
              { icon: "🚩", label: "Report Room", color: "#ef4444", onClick: () => setShowReportModal(room.hostId), show: true },
            ].filter(x => x.show).map((opt, i) => (
              <button key={i} onClick={() => { opt.onClick(); setShowMoreMenu(false); }} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10, border: "none",
                background: "transparent", color: "#fff", cursor: "pointer",
                fontFamily: "inherit", fontSize: 13, fontWeight: 600, textAlign: "left",
                transition: "background 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(167,139,250,0.12)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 18 }}>{opt.icon}</span>
                <span style={{ flex: 1, color: opt.color }}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ROOM THEME PICKER ── */}
      {showThemePicker && (
        <div onClick={() => setShowThemePicker(false)} style={{
          position: "fixed", inset: 0, zIndex: 1110,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: 340, background: "rgba(20,12,40,0.98)",
            border: "1px solid rgba(167,139,250,0.5)", borderRadius: 18, padding: 20,
            boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 14, textAlign: "center" }}>
              🎨 Choose Room Theme
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {roomThemes.length === 0 ? (
                <p style={{ gridColumn: "span 2", textAlign: "center", color: "rgba(255,255,255,0.4)", padding: 20 }}>
                  No themes available. Admin can add from Admin Panel.
                </p>
              ) : (
                roomThemes.map(t => {
                  const active = (room.theme || "galaxy") === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={async () => {
                        if (!hasControl) { showToast("Admin only", "error"); return; }
                        try {
                          await updateRoomSettings(roomId, { theme: t.id } as any);
                          showToast(`Theme: ${t.name} applied!`, "success");
                          setShowThemePicker(false);
                        } catch {
                          showToast("Failed to update theme", "error");
                        }
                      }}
                      style={{
                        padding: 14, borderRadius: 12,
                        border: active ? "2px solid #a78bfa" : "1px solid rgba(255,255,255,0.1)",
                        background: t.preview || "rgba(255,255,255,0.03)",
                        color: "#fff", cursor: hasControl ? "pointer" : "not-allowed",
                        fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                        height: 80,
                        boxShadow: active ? "0 0 20px rgba(167,139,250,0.6)" : "none",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: 4,
                        opacity: hasControl ? 1 : 0.5,
                      }}
                    >
                      {t.imageUrl ? (
                        <img src={t.imageUrl} alt={t.name} style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 4 }} />
                      ) : (
                        <span style={{ fontSize: 24 }}>{t.icon}</span>
                      )}
                      <span style={{ fontSize: 11 }}>{t.name}</span>
                    </button>
                  );
                })
              )}
            </div>
            <button onClick={() => setShowThemePicker(false)} style={{
              marginTop: 14, width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
              background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)",
              fontFamily: "inherit", fontSize: 12, cursor: "pointer",
            }}>Close</button>
          </div>
        </div>
      )}

      {/* ── Rest of modals (RoomMode, Inbox, SeatSheet, etc.) ── */}
      {showRoomMode && (
        <div onClick={() => setShowRoomMode(false)} style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: 480,
            background: "linear-gradient(180deg, #1a0f2e, #0d0820)",
            borderRadius: "20px 20px 0 0", padding: "18px 16px 28px",
            border: "1px solid rgba(167,139,250,0.3)",
            boxShadow: "0 -10px 40px rgba(0,0,0,0.7)",
            animation: "slideUp 0.25s ease",
          }}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 14px" }} />
            <h3 style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 4, textAlign: "center" }}>
              🎮 Room Mode
            </h3>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textAlign: "center", marginBottom: 16 }}>
              Pick a game to launch in the room
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {[
                { id: "ludo",   name: "3D Ludo",         emoji: "🏰", grad: "linear-gradient(135deg,#8b5cf6,#ec4899)" },
                { id: "snake",  name: "Snake & Ladders", emoji: "🐍", grad: "linear-gradient(135deg,#10b981,#06b6d4)" },
                { id: "carrom", name: "Galaxy Carrom",   emoji: "🎱", grad: "linear-gradient(135deg,#7c3aed,#06b6d4)" },
                { id: "tod",    name: "Truth or Dare",   emoji: "🍾", grad: "linear-gradient(135deg,#f59e0b,#ef4444)" },
                { id: "dice",   name: "Dice Roll",       emoji: "🎲", grad: "linear-gradient(135deg,#6366f1,#3b82f6)" },
              ].map(g => (
                <button key={g.id} onClick={() => {
                  if (g.id !== "dice" && !hasControl) { showToast("Admin only", "error"); return; }
                  setShowRoomMode(false); setActiveGame(g.id);
                }} style={{
                  padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)", color: "#fff", cursor: "pointer",
                  fontFamily: "inherit", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 6,
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14, background: g.grad,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 30, boxShadow: `0 0 14px rgba(108,92,231,0.4)`,
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
                  }}>{g.emoji}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{g.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showInbox && (
        <div onClick={() => setShowInbox(false)} style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: "100%", maxWidth: 380, maxHeight: "75vh",
            background: "rgba(20,12,40,0.98)",
            border: "1px solid rgba(6,182,212,0.4)", borderRadius: 18, padding: 18,
            boxShadow: "0 16px 48px rgba(0,0,0,0.7)", animation: "popIn 0.2s ease",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>📥 Inbox</h3>
              <button onClick={() => setShowInbox(false)} style={{
                width: 28, height: 28, borderRadius: 14, border: "none",
                background: "rgba(255,255,255,0.07)", color: "#fff", cursor: "pointer", fontSize: 14,
              }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {inboxNotifs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                  📭 No notifications yet
                </div>
              ) : inboxNotifs.slice(0, 30).map(n => (
                <div key={n.id} style={{
                  padding: "10px 12px", borderRadius: 10,
                  background: n.read ? "rgba(255,255,255,0.03)" : "rgba(6,182,212,0.08)",
                  border: n.read ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(6,182,212,0.3)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#22d3ee", marginBottom: 2 }}>{(n as any).title || (n as any).type || "Notification"}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>{(n as any).message || (n as any).body || ""}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSeatSheet !== null && (
        <Overlay onClose={() => setShowSeatSheet(null)}>
          <div className="card" style={{ width: 280, padding: 24, animation: "popIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 12, textAlign: "center" }}>
              {"\u{1F3A4}"} Seat {showSeatSheet + 1}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {room.seats[showSeatSheet]?.userId === user.uid ? (
                <button className="btn btn-danger btn-full" onClick={async () => {
                  await disableMicForSeat();
                  await leaveSeat(roomId, showSeatSheet).catch(console.error);
                  if (mySeatIndex >= 0) toggleMuteSeat(roomId, mySeatIndex, true).catch(console.error);
                  showToast("Left seat, mic disabled", "info", "\u{1F3A4}");
                  sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F3A4}", text: `${cleanName(user.name)} left the mic`, type: "system" }).catch(console.error);
                  setShowSeatSheet(null);
                }}>
                  {"\u{1F6AA}"} Leave Seat
                </button>
              ) : (
                <button className="btn btn-primary btn-full" onClick={async () => {
                  if (room.micPermission === "admin_only" && !hasControl) {
                    showToast("Only owner/admins can take seats", "warning");
                    setShowSeatSheet(null);
                    return;
                  }
                  if (room.micPermission === "request" && !hasControl) {
                    showToast("Mic request sent to owner/admin", "info");
                    sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u270B", text: `${cleanName(user.name)} is requesting to speak`, type: "system" }).catch(console.error);
                    setShowSeatSheet(null);
                    return;
                  }
                  const wasOnSeat = room.seats.some(s => s.userId === user.uid);
                  if (wasOnSeat) await disableMicForSeat();
                  const ok = await joinSeat(roomId, showSeatSheet, user.uid, user.name, user.avatar);
                  if (ok) {
                    showToast("Joined seat! Enabling mic...", "success");
                    setShowSeatSheet(null);
                    await enableMicForSeat();
                  } else {
                    showToast("Seat not available", "warning");
                    setShowSeatSheet(null);
                  }
                }}>
                  {room.seats.some(s => s.userId === user.uid) ? "\u{1F504} Switch to This Seat" : "\u{1F3A4} Take This Seat"}
                </button>
              )}
              {hasControl && (
                <button className="btn btn-ghost btn-full" onClick={() => {
                  toggleLockSeat(roomId, showSeatSheet, !room.seats[showSeatSheet]?.isLocked).catch(console.error);
                  setShowSeatSheet(null);
                }}>
                  {room.seats[showSeatSheet]?.isLocked ? "\u{1F513} Unlock" : "\u{1F512} Lock"} Seat
                </button>
              )}
              <button className="btn btn-ghost btn-full" onClick={() => setShowSeatSheet(null)} style={{ color: "rgba(162,155,254,0.4)" }}>
                Cancel
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {showCloseMenu && (
        <Overlay onClose={() => setShowCloseMenu(false)}>
          <div className="card" style={{ width: 300, padding: 26, animation: "popIn 0.2s ease", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎙️</div>
            <h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 6 }}>Leave the room?</h3>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.55)", marginBottom: 22, lineHeight: 1.5 }}>
              Minimize to keep listening in the background, or exit the room completely.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setShowCloseMenu(false); if (onMinimize) onMinimize(); }}
                style={{
                  flex: 1, padding: "13px 0", borderRadius: 16,
                  background: "linear-gradient(135deg,#6C5CE7,#a78bfa)",
                  border: "none", color: "#fff", fontSize: 13, fontWeight: 800,
                  fontFamily: "inherit", cursor: "pointer",
                  boxShadow: "0 0 16px rgba(108,92,231,0.45)",
                }}
              >🔵 Minimize</button>
              <button
                onClick={() => { setShowCloseMenu(false); handleLeave(); }}
                style={{
                  flex: 1, padding: "13px 0", borderRadius: 16,
                  background: "rgba(255,100,130,0.12)", border: "1px solid rgba(255,100,130,0.45)",
                  color: "#ff6b8a", fontSize: 13, fontWeight: 800,
                  fontFamily: "inherit", cursor: "pointer",
                }}
              >Exit</button>
            </div>
          </div>
        </Overlay>
      )}

      {showHostControls && selectedSeat !== null && room.seats[selectedSeat]?.userId && (
        <Overlay onClose={() => { setShowHostControls(false); setSelectedSeat(null); }}>
          <div className="card" style={{ width: 280, padding: 20, animation: "popIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 22, fontSize: 22,
                background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {room.seats[selectedSeat].avatar?.startsWith?.("http")
                  ? <img src={room.seats[selectedSeat].avatar!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 22 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
                  : (room.seats[selectedSeat].avatar && room.seats[selectedSeat].avatar!.length <= 4 ? room.seats[selectedSeat].avatar : "\u{1F464}")}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800 }}>{room.seats[selectedSeat].username}</p>
                <RoleBadge role={getUserRole(room, room.seats[selectedSeat].userId!)} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }}
                onClick={() => handleSeatAction(room.seats[selectedSeat].isMuted ? "unmute" : "mute", selectedSeat)}>
                {room.seats[selectedSeat].isMuted ? "\u{1F50A} Unmute" : "\u{1F507} Mute"}
              </button>
              <button className="btn btn-danger btn-full" style={{ fontSize: 13 }}
                onClick={() => handleSeatAction("kick", selectedSeat)}>{"\u{1F6AB}"} Remove from Seat</button>
              <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }}
                onClick={() => handleSeatAction("lock", selectedSeat)}>
                {room.seats[selectedSeat].isLocked ? "\u{1F513} Unlock Seat" : "\u{1F512} Lock Seat"}
              </button>
              {isOwner && (
                <>
                  <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }}
                    onClick={() => handleSeatAction("admin", selectedSeat)}>
                    {(room.adminIds || []).includes(room.seats[selectedSeat].userId!) ? "\u274C Remove Admin" : "\u{1F6E1}\uFE0F Make Admin"}
                  </button>
                  <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }}
                    onClick={() => handleSeatAction("cohost", selectedSeat)}>
                    {room.seats[selectedSeat].isCoHost ? "\u274C Remove Co-Host" : "\u{1F451} Make Co-Host"}
                  </button>
                </>
              )}
            </div>
          </div>
        </Overlay>
      )}

      {showUsersPanel && (
        <Overlay onClose={() => { setShowUsersPanel(false); setSelectedUserUid(null); }}>
          <div className="card" style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 300,
            borderRadius: "20px 0 0 20px", padding: 0, animation: "slideFromRight 0.3s ease",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 900 }}>{"\u{1F465}"} Users ({roomUsers.length})</h3>
              <button onClick={() => setShowUsersPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
              {roomUsers.map(ru => (
                <div key={ru.uid} onClick={() => hasControl && ru.uid !== user.uid && ru.role !== "owner" ? setSelectedUserUid(selectedUserUid === ru.uid ? null : ru.uid) : null}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 6px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    cursor: hasControl && ru.uid !== user.uid && ru.role !== "owner" ? "pointer" : "default",
                    background: selectedUserUid === ru.uid ? "rgba(108,92,231,0.08)" : "transparent",
                    borderRadius: 12, transition: "background 0.2s",
                  }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 18, fontSize: 18,
                    background: "rgba(108,92,231,0.12)", border: `1.5px solid ${ru.role === "owner" ? "rgba(255,215,0,0.5)" : ru.role === "admin" ? "rgba(108,92,231,0.5)" : "rgba(108,92,231,0.2)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                  }}>
                    {ru.avatar?.startsWith?.("http")
                      ? <img src={ru.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
                      : (ru.avatar && ru.avatar.length <= 4 ? ru.avatar : "\u{1F464}")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ru.name}</span>
                      {ru.uid === user.uid && <span style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>(you)</span>}
                    </div>
                    {(ru as any).isSuperAdmin
                      ? <RoleBadge role={ru.role} />
                      : (ru as any).isOfficial
                      ? <span className="badge" style={{ fontSize: 8, padding: "1px 6px", background: "rgba(255,215,0,0.15)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.3)" }}>{"\u{1F6E1}\uFE0F"} Official</span>
                      : <RoleBadge role={ru.role} />
                    }
                  </div>
                  {ru.seatIndex !== null && ru.seatIndex !== undefined && (
                    <span style={{ fontSize: 9, color: "rgba(162,155,254,0.3)" }}>Seat {ru.seatIndex + 1}</span>
                  )}
                </div>
              ))}
              {selectedUserUid && (
                <div style={{ padding: "8px 4px", animation: "slide-up 0.2s ease" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {isOwner && !(room.adminIds || []).includes(selectedUserUid) && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}
                        onClick={() => handleUserAction("make_admin", selectedUserUid)}>{"\u{1F6E1}\uFE0F"} Admin</button>
                    )}
                    {isOwner && (room.adminIds || []).includes(selectedUserUid) && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}
                        onClick={() => handleUserAction("remove_admin", selectedUserUid)}>{"\u274C"} Remove Admin</button>
                    )}
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}
                      onClick={() => handleUserAction("mute", selectedUserUid)}>{"\u{1F507}"} Mute</button>
                    <button className="btn btn-danger btn-sm" style={{ fontSize: 10 }}
                      onClick={() => handleUserAction("kick", selectedUserUid)}>{"\u{1F6AB}"} Kick</button>
                    {(isOwner || userIsOfficial) && (
                      <button className="btn btn-danger btn-sm" style={{ fontSize: 10 }}
                        onClick={() => handleUserAction("ban", selectedUserUid)}>{"\u26D4"} Ban</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Overlay>
      )}


      {controlPanel && (() => {
        const followers = room.roomFollowers ? Object.values(room.roomFollowers) : [];
        const followerCount = followers.length;
        const bannedCount = (room.bannedUsers || []).length;
        const lvl = room.roomLevel || 1;
        const xpCur = (lvl - 1) * 3000 + Math.min(2999, Math.floor(followerCount * 60));
        const xpMax = lvl * 3000;
        const xpPct = Math.min(100, Math.max(2, (xpCur / xpMax) * 100));
        const enterPerm = room.enterPermission || "everyone";
        const micPerm = room.micPermission || "all";
        const modeVal = room.mode || "voice";
        const country = room.country || "Global";
        const closePanel = () => { setControlPanel(false); setCpSubView(null); };

        const Row = ({ label, value, onClick, icon, danger, badge }: { label: string; value?: React.ReactNode; onClick?: () => void; icon?: string; danger?: boolean; badge?: React.ReactNode }) => (
          <button onClick={onClick} disabled={!onClick}
            style={{
              display: "flex", alignItems: "center", gap: 12, width: "100%",
              padding: "14px 16px", background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14,
              cursor: onClick ? "pointer" : "default", fontFamily: "inherit",
              color: danger ? "#ff6b8a" : "#fff", textAlign: "left",
            }}>
            {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{label}</span>
            {badge}
            {value !== undefined && (
              <span style={{ fontSize: 13, color: "rgba(162,155,254,0.7)", fontWeight: 600 }}>{value}</span>
            )}
            {onClick && <span style={{ color: "rgba(162,155,254,0.4)", fontSize: 14 }}>{"\u203A"}</span>}
          </button>
        );

        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1900, maxWidth: 400, margin: "0 auto",
            background: "linear-gradient(160deg, #1A0F2E, #0F0F1A)",
            display: "flex", flexDirection: "column",
            animation: "slide-up 0.3s ease",
          }}>
            {/* Top close bar */}
            <div style={{
              display: "flex", alignItems: "center",
              padding: "52px 16px 8px",
            }}>
              <button onClick={cpSubView ? () => setCpSubView(null) : closePanel} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#A29BFE", padding: 4,
              }} aria-label="close">{cpSubView ? "\u2190" : "\u2715"}</button>
              {cpSubView && (
                <h2 style={{ flex: 1, textAlign: "center", marginRight: 30, fontSize: 16, fontWeight: 800 }}>
                  {cpSubView === "blocked" ? "Blocked List" : cpSubView === "advanced" ? "Advanced" : "Country"}
                </h2>
              )}
            </div>

            {!cpSubView && (
              <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 8px" }}>
                {([
                  { k: "profile" as const, label: "Profile" },
                  { k: "follower" as const, label: `Follower (${followerCount})` },
                  { k: "events" as const, label: "Events" },
                ]).map(t => (
                  <button key={t.k} onClick={() => setCpTab(t.k)} style={{
                    flex: 1, padding: "12px 0", border: "none", cursor: "pointer", background: "transparent",
                    color: cpTab === t.k ? "#fff" : "rgba(162,155,254,0.45)",
                    fontSize: 14, fontWeight: cpTab === t.k ? 800 : 600, fontFamily: "inherit",
                    position: "relative",
                  }}>
                    {t.label}
                    {cpTab === t.k && (
                      <span style={{
                        position: "absolute", bottom: -1, left: "30%", right: "30%",
                        height: 3, borderRadius: 2, background: "#6C5CE7",
                      }} />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {/* Sub-views */}
              {cpSubView === "blocked" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {bannedCount === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 20px" }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>{"\u2705"}</div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(162,155,254,0.5)" }}>No blocked users</p>
                    </div>
                  ) : (
                    (room.bannedUsers || []).map(uid => (
                      <div key={uid} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "12px 14px", borderRadius: 14, background: "rgba(255,100,130,0.04)",
                        border: "1px solid rgba(255,100,130,0.1)",
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 18, fontSize: 16,
                          background: "rgba(255,100,130,0.1)", border: "1.5px solid rgba(255,100,130,0.2)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>{"\u26D4"}</div>
                        <span style={{ flex: 1, fontSize: 12, color: "rgba(162,155,254,0.6)", fontFamily: "monospace" }}>{uid.slice(0, 18)}...</span>
                        {isOwner && (
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: "#00e676" }}
                            onClick={() => unbanUser(roomId, uid).then(() => showToast("User unbanned", "success")).catch(console.error)}>
                            Unban
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {cpSubView === "country" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
                  {["Global", "India", "Pakistan", "Bangladesh", "USA", "UK", "UAE", "Saudi Arabia", "Indonesia", "Turkey", "Egypt", "Nigeria"].map(c => (
                    <button key={c} onClick={() => hasControl && updateRoomSettings(roomId, { country: c }).then(() => { showToast("Country updated!", "success"); setCpSubView(null); }).catch(console.error)}
                      style={{
                        padding: "12px 14px", borderRadius: 12, fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                        border: country === c ? "1.5px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                        background: country === c ? "rgba(108,92,231,0.15)" : "rgba(255,255,255,0.03)",
                        color: country === c ? "#A29BFE" : "#fff", cursor: hasControl ? "pointer" : "default",
                      }}>{c}</button>
                  ))}
                </div>
              )}

              {cpSubView === "advanced" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ background: "rgba(108,92,231,0.06)", borderRadius: 16, padding: 14, border: "1px solid rgba(108,92,231,0.1)" }}>
                    <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 8, display: "block" }}>Theme</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {ROOM_THEMES.map(t => (
                        <button key={t.id} onClick={() => hasControl && updateRoomSettings(roomId, { theme: t.id }).then(() => showToast("Theme updated!", "success")).catch(console.error)}
                          style={{
                            padding: "7px 14px", borderRadius: 12, border: (room.theme || "galaxy") === t.id ? "1.5px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                            background: (room.theme || "galaxy") === t.id ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)",
                            cursor: hasControl ? "pointer" : "default", fontSize: 12, fontWeight: 600,
                            color: (room.theme || "galaxy") === t.id ? "#A29BFE" : "rgba(162,155,254,0.4)", fontFamily: "inherit",
                          }}>{t.name}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: "rgba(108,92,231,0.06)", borderRadius: 16, padding: 14, border: "1px solid rgba(108,92,231,0.1)" }}>
                    <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 8, display: "block" }}>Room Cover</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {ROOM_AVATARS.map(av => (
                        <button key={av} onClick={() => hasControl && updateRoomSettings(roomId, { coverEmoji: av }).then(() => showToast("Updated!", "success")).catch(console.error)}
                          style={{
                            width: 40, height: 40, borderRadius: 14, fontSize: 22, cursor: hasControl ? "pointer" : "default",
                            background: (room.coverEmoji || "\u{1F3A4}") === av ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.04)",
                            border: (room.coverEmoji || "\u{1F3A4}") === av ? "2px solid #6C5CE7" : "1px solid rgba(255,255,255,0.06)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>{av}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: "rgba(108,92,231,0.06)", borderRadius: 16, padding: 14, border: "1px solid rgba(108,92,231,0.1)" }}>
                    <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 6, display: "block" }}>Mic Seats</label>
                    {hasControl ? (
                      <select value={room.maxMics || room.seats.length}
                        onChange={e => updateRoomSettings(roomId, { maxMics: parseInt(e.target.value) }).then(() => showToast("Updated!", "success")).catch(console.error)}
                        style={{
                          width: "100%", padding: "8px 10px", borderRadius: 10, fontSize: 14, fontWeight: 800,
                          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(108,92,231,0.2)",
                          color: "#A29BFE", fontFamily: "inherit",
                        }}>
                        {[4, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n} seats</option>)}
                      </select>
                    ) : <p style={{ fontSize: 14, color: "#A29BFE", fontWeight: 700 }}>{room.maxMics || room.seats.length} seats</p>}
                  </div>
                  {hasControl && (
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      background: "rgba(108,92,231,0.06)", borderRadius: 16, padding: "12px 14px", border: "1px solid rgba(108,92,231,0.1)",
                    }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{"\u{1F512}"} Private Room</span>
                        <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)", marginTop: 2 }}>Only invited users can join</p>
                      </div>
                      <button onClick={() => updateRoomSettings(roomId, { isPrivate: !room.isPrivate }).then(() => showToast(room.isPrivate ? "Now Public" : "Now Private", "info")).catch(console.error)}
                        style={{
                          width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                          background: room.isPrivate ? "#6C5CE7" : "rgba(255,255,255,0.15)", position: "relative",
                        }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 3,
                          left: room.isPrivate ? 25 : 3, transition: "left 0.2s",
                        }} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Profile tab */}
              {!cpSubView && cpTab === "profile" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Avatar header card */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 4px" }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: 32, fontSize: 32, overflow: "hidden",
                      background: "rgba(108,92,231,0.12)", border: "2px solid rgba(108,92,231,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: userIsSuperAdmin ? "pointer" : "default", position: "relative",
                    }} onClick={() => userIsSuperAdmin && cpDpRef.current?.click()}>
                      {cpDpUploading ? (
                        <div style={{ width: 28, height: 28, borderRadius: 14, border: "3px solid rgba(108,92,231,0.2)", borderTopColor: "#6C5CE7", animation: "spin 0.8s linear infinite" }} />
                      ) : (room.roomAvatar || "").startsWith?.("http") ? (
                        <img src={room.roomAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 32 }} />
                      ) : (room.coverEmoji || "\u{1F3A4}")}
                      {userIsSuperAdmin && (
                        <span style={{
                          position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11,
                          background: "#6C5CE7", border: "2px solid #1A0F2E", color: "#fff",
                          fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
                        }}>{"\u{1F4F7}"}</span>
                      )}
                      {userIsSuperAdmin && (
                        <input ref={cpDpRef} type="file" accept="image/*" hidden onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !userIsSuperAdmin) return;
                          setCpDpUploading(true);
                          try {
                            const blob = new Blob([await file.arrayBuffer()], { type: file.type });
                            const result = await uploadWithAppCheck(blob, `rooms/${roomId}/avatar_${Date.now()}.jpg`);
                            await updateRoomSettings(roomId, { roomAvatar: result.url });
                            showToast("Room banner updated!", "success");
                          } catch (err) {
                            console.error("Upload error:", err);
                            showToast("Upload failed", "error");
                          }
                          setCpDpUploading(false);
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {hasControl ? (
                        <input value={cpEditName} onChange={e => setCpEditName(e.target.value)}
                          onBlur={() => { if (cpEditName.trim() && cpEditName.trim() !== room.name) updateRoomSettings(roomId, { name: cpEditName.trim() }).then(() => showToast("Name updated!", "success")).catch(console.error); }}
                          style={{ width: "100%", background: "none", border: "none", color: "#fff", fontSize: 18, fontWeight: 800, fontFamily: "inherit", outline: "none", padding: 0 }}
                        />
                      ) : (
                        <h2 style={{ fontSize: 18, fontWeight: 800 }}>{room.name}</h2>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 12, color: "rgba(162,155,254,0.6)" }}>ID:{room.id.slice(5, 21)}</span>
                        <button onClick={() => { try { navigator.clipboard.writeText(room.id); showToast("ID copied!", "success"); } catch { /* ignore */ } }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(162,155,254,0.6)", fontSize: 12, padding: 0 }}>
                          {"\u{1F4CB}"}
                        </button>
                      </div>
                    </div>
                    {hasControl && (
                      <button onClick={() => setCpSubView("advanced")} style={{
                        width: 36, height: 36, borderRadius: 10, background: "rgba(108,92,231,0.1)",
                        border: "1px solid rgba(108,92,231,0.2)", cursor: "pointer", color: "#A29BFE", fontSize: 16, fontFamily: "inherit",
                      }} title="Advanced settings">{"\u270F\uFE0F"}</button>
                    )}
                  </div>

                  {/* Level bar */}
                  <div style={{ background: "rgba(255,255,255,0.025)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Level</span>
                      <span style={{ fontSize: 11, color: "rgba(162,155,254,0.5)" }}>{xpCur}/{xpMax}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#A29BFE", fontStyle: "italic" }}>LV.{lvl}</span>
                      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(108,92,231,0.12)", overflow: "hidden", position: "relative" }}>
                        <div style={{
                          width: `${xpPct}%`, height: "100%",
                          background: "linear-gradient(90deg, #6C5CE7, #d946ef)",
                          borderRadius: 4, transition: "width 0.4s ease",
                        }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(162,155,254,0.5)", fontStyle: "italic" }}>LV.{lvl + 1}</span>
                    </div>
                  </div>

                  {/* Settings rows */}
                  <Row label="Bonus" onClick={() => showToast("Bonus rewards coming soon!", "info")} />
                  <Row label="Date data" onClick={() => showToast("Date data coming soon!", "info")} />

                  {/* Announcement */}
                  <div style={{ background: "rgba(255,255,255,0.025)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Announcement</span>
                      {hasControl && (
                        <button onClick={() => updateRoomSettings(roomId, { announcement: cpAnnouncement.trim() }).then(() => showToast("Saved!", "success")).catch(console.error)}
                          style={{ background: "rgba(108,92,231,0.15)", color: "#A29BFE", border: "none", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Save</button>
                      )}
                    </div>
                    {hasControl ? (
                      <textarea value={cpAnnouncement} onChange={e => setCpAnnouncement(e.target.value)}
                        placeholder="Welcome everyone! Let's chat and have fun together!"
                        rows={2}
                        style={{
                          width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(108,92,231,0.15)",
                          borderRadius: 10, padding: "8px 10px", color: "#fff", fontSize: 12,
                          fontFamily: "inherit", resize: "none", outline: "none",
                        }} />
                    ) : (
                      <p style={{ fontSize: 12, color: "rgba(162,155,254,0.7)", lineHeight: 1.5 }}>{room.announcement || "No announcement"}</p>
                    )}
                  </div>

                  <Row label="Follower" value={followerCount} onClick={() => setCpTab("follower")} />

                  <Row label="Country" value={country}
                    onClick={hasControl ? () => setCpSubView("country") : undefined} />

                  <Row label="Room enter permission"
                    value={enterPerm === "everyone" ? "Everyone" : "Invite Only"}
                    onClick={hasControl ? () => updateRoomSettings(roomId, { enterPermission: enterPerm === "everyone" ? "invite_only" : "everyone" }).then(() => showToast("Updated!", "success")).catch(console.error) : undefined} />

                  <Row label="Mode" badge={
                    <span style={{
                      background: "rgba(108,92,231,0.18)", color: "#A29BFE",
                      padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}>{modeVal === "voice" ? "\u{1F3A4} voice" : "\u{1F4AC} chat"}</span>
                  }
                    onClick={hasControl ? () => updateRoomSettings(roomId, { mode: modeVal === "voice" ? "chat" : "voice" }).then(() => showToast("Mode updated!", "success")).catch(console.error) : undefined} />

                  <Row label="Mic permission"
                    value={micPerm === "all" ? "Everyone" : micPerm === "request" ? "Request" : "Admin Only"}
                    onClick={hasControl ? () => {
                      const next = micPerm === "all" ? "request" : micPerm === "request" ? "admin_only" : "all";
                      updateRoomSettings(roomId, { micPermission: next }).then(() => showToast("Mic permission updated!", "success")).catch(console.error);
                    } : undefined} />

                  <Row label="Blocked list" badge={bannedCount > 0 ? (
                    <span style={{ background: "rgba(255,107,138,0.15)", color: "#ff6b8a", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{bannedCount}</span>
                  ) : undefined} onClick={() => setCpSubView("blocked")} />

                  {!isOwner && (
                    <button className="btn btn-ghost btn-full" style={{ fontSize: 13, padding: "12px 0", marginTop: 8 }}
                      onClick={async () => {
                        try {
                          const isFollowing = room.roomFollowers?.[user.uid];
                          if (isFollowing) {
                            await unfollowRoom(roomId, user.uid);
                            showToast("Unfollowed room", "info");
                          } else {
                            await followRoom(roomId, user.uid, user.name, user.avatar);
                            showToast("Following room!", "success");
                          }
                        } catch { showToast("Action failed", "error"); }
                      }}>
                      {room.roomFollowers?.[user.uid] ? "\u2705 Following Room" : "\u2795 Follow Room"}
                    </button>
                  )}
                </div>
              )}

              {/* Follower tab */}
              {!cpSubView && cpTab === "follower" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input className="input-field" placeholder="Search followers..."
                    value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                    style={{ borderRadius: 14, padding: "10px 14px", fontSize: 12 }} />
                  {(() => {
                    const q = memberSearch.toLowerCase();
                    const list = (q ? followers.filter(f => f.name.toLowerCase().includes(q)) : followers).sort((a, b) => b.followedAt - a.followedAt);
                    if (list.length === 0) return (
                      <div style={{ textAlign: "center", padding: "60px 20px" }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>{"\u{1F31F}"}</div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(162,155,254,0.5)" }}>No followers yet</p>
                      </div>
                    );
                    return list.map(f => (
                      <div key={f.uid} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                        borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
                      }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 19, fontSize: 18, overflow: "hidden",
                          background: "rgba(108,92,231,0.12)", border: "1.5px solid rgba(108,92,231,0.3)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {f.avatar?.startsWith?.("http")
                            ? <img src={f.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 19 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
                            : (f.avatar && f.avatar.length <= 4 ? f.avatar : "\u{1F464}")}
                        </div>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{f.name}</span>
                        <span style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>{new Date(f.followedAt).toLocaleDateString()}</span>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Events tab */}
              {!cpSubView && cpTab === "events" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", gap: 16 }}>
                  <div style={{ fontSize: 56, animation: "float 3s ease-in-out infinite" }}>{"\u{1F389}"}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 900 }}>Events Coming Soon</h3>
                  <p style={{ fontSize: 13, color: "rgba(162,155,254,0.5)", textAlign: "center", lineHeight: 1.6 }}>
                    Host exciting events in your room like karaoke nights, talent shows, Q&A sessions and more!
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 }}>
                    {["\u{1F3A4} Karaoke Night", "\u{1F3AD} Talent Show", "\u{1F4AC} Q&A", "\u{1F3B6} Music Battle", "\u{1F3C6} Tournament"].map(e => (
                      <span key={e} style={{
                        padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: "rgba(108,92,231,0.08)", border: "1px solid rgba(108,92,231,0.15)",
                        color: "rgba(162,155,254,0.5)",
                      }}>{e}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {showLeaderboard && (
        <Overlay onClose={() => setShowLeaderboard(false)}>
          <div className="card" style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            borderRadius: "24px 24px 0 0", padding: 20, animation: "slide-up 0.3s ease",
            maxHeight: "60vh", display: "flex", flexDirection: "column",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 17, fontWeight: 900 }}>{"\u{1F3C6}"} Gift Leaderboard</h2>
              <button onClick={() => setShowLeaderboard(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {(["daily", "weekly", "monthly"] as LeaderboardPeriod[]).map(p => (
                <button key={p} onClick={() => loadLeaderboard(p)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 12, fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                  border: lbPeriod === p ? "1.5px solid #FFD700" : "1px solid rgba(255,255,255,0.08)",
                  background: lbPeriod === p ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.03)",
                  color: lbPeriod === p ? "#FFD700" : "rgba(162,155,254,0.4)", cursor: "pointer",
                  textTransform: "capitalize",
                }}>{p}</button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {lbEntries.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>{"\u{1F3C6}"}</div>
                  <p style={{ fontSize: 13, color: "rgba(162,155,254,0.4)" }}>No gifts sent yet this period</p>
                </div>
              ) : lbEntries.map((entry, idx) => (
                <div key={entry.uid} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 8px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <span style={{ fontSize: idx < 3 ? 20 : 14, fontWeight: 900, color: idx === 0 ? "#FFD700" : idx === 1 ? "#C0C0C0" : idx === 2 ? "#CD7F32" : "rgba(162,155,254,0.4)", width: 28, textAlign: "center" }}>
                    {idx < 3 ? ["\u{1F947}", "\u{1F948}", "\u{1F949}"][idx] : idx + 1}
                  </span>
                  <div style={{
                    width: 36, height: 36, borderRadius: 18, fontSize: 18,
                    background: "rgba(108,92,231,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
                    border: `1.5px solid ${idx === 0 ? "rgba(255,215,0,0.5)" : "rgba(108,92,231,0.2)"}`,
                    overflow: "hidden",
                  }}>
                    {entry.avatar?.startsWith?.("http")
                      ? <img src={entry.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
                      : (entry.avatar && entry.avatar.length <= 4 ? entry.avatar : "\u{1F464}")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{entry.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#FFD700" }}>{entry.totalCoins}</span>
                </div>
              ))}
            </div>
          </div>
        </Overlay>
      )}

      {showProfileCard && (
        <Overlay onClose={() => setShowProfileCard(null)}>
          <div className="card" style={{
            width: 300, padding: 20, animation: "popIn 0.2s ease",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 28, fontSize: 28,
                background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
              }}>
                {showProfileCard.avatar?.startsWith?.("http")
                  ? <img src={showProfileCard.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 28 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
                  : (showProfileCard.avatar && showProfileCard.avatar.length <= 4 ? showProfileCard.avatar : "\u{1F464}")}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 900 }}>{showProfileCard.name}</p>
                <RoleBadge role={getUserRole(room, showProfileCard.uid)} />
                <p style={{ fontSize: 10, color: "rgba(162,155,254,0.3)", marginTop: 3 }}>Seat {showProfileCard.seatIdx + 1}</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1, fontSize: 13, padding: "12px 0", borderRadius: 14 }}
                onClick={async () => {
                  try {
                    const isFollowing = (user.followingList || []).includes(showProfileCard!.uid);
                    if (isFollowing) { showToast("Already following!", "info"); }
                    else {
                      const res = await followUser(user.uid, showProfileCard!.uid);
                      showToast(res.isMutual ? "You're now friends!" : "Followed!", "success");
                    }
                  } catch { showToast("Follow failed", "error"); }
                  setShowProfileCard(null);
                }}>
                {(user.followingList || []).includes(showProfileCard.uid) ? "\u2705 Following" : "\u2795 Follow"}
              </button>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13, padding: "12px 0", borderRadius: 14 }}
                onClick={async () => {
                  const pc = showProfileCard!;
                  setShowProfileCard(null);
                  try {
                    const otherProfile = await getUser(pc.uid);
                    await getOrCreateConversation(
                      user.uid, user.name, user.avatar,
                      pc.uid, otherProfile?.name || pc.name, otherProfile?.avatar || pc.avatar
                    );
                    if (onMessage) onMessage(pc.uid);
                    else showToast("Opening chat...", "info");
                  } catch { showToast("Could not open chat", "error"); }
                }}>
                {"\u{1F4AC}"} Chat
              </button>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13, padding: "12px 0", borderRadius: 14 }}
                onClick={() => {
                  setShowProfileCard(null);
                  handleGift({ emoji: "\u{1F381}", name: "Gift Box", cost: 10 }, 1);
                }}>
                {"\u{1F381}"} Gift
              </button>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: hasControl ? 10 : 0, flexWrap: "wrap" }}>
              {hasControl && (
                <>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 11, borderRadius: 12 }}
                    onClick={() => {
                      const pc = showProfileCard;
                      setShowProfileCard(null);
                      const mxM2 = room?.maxMics || 12;
                      const emptySeat = room?.seats.findIndex((s, si) => si < mxM2 && !s.userId && !s.isLocked);
                      if (emptySeat !== undefined && emptySeat >= 0) handleInviteToSeat(pc!.uid, emptySeat);
                      else showToast("No empty seats", "warning");
                    }}>
                    {"\u{1F3A4}"} Invite Mic
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 11, borderRadius: 12 }}
                    onClick={() => {
                      const pc = showProfileCard;
                      setShowProfileCard(null);
                      setSelectedSeat(pc!.seatIdx);
                      setShowHostControls(true);
                    }}>
                    {"\u2699\uFE0F"} Manage
                  </button>
                </>
              )}
              <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 11, borderRadius: 12, color: "rgba(255,100,130,0.7)" }}
                onClick={() => {
                  setShowReportModal(showProfileCard!.uid);
                  setShowProfileCard(null);
                }}>
                {"\u26A0\uFE0F"} Report
              </button>
            </div>

            {hasControl && (
              <div style={{ display: "flex", gap: 6 }}>
                {isOwner && (
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 11, borderRadius: 12 }}
                    onClick={async () => {
                      const uid = showProfileCard!.uid;
                      const isAdm = (room?.adminIds || []).includes(uid);
                      if (isAdm) { await removeAdmin(roomId, uid); showToast("Admin removed", "info"); }
                      else { await setAdmin(roomId, uid); showToast("Admin set!", "success"); }
                      setShowProfileCard(null);
                    }}>
                    {(room?.adminIds || []).includes(showProfileCard.uid) ? "\u274C Remove Admin" : "\u{1F6E1}\uFE0F Make Admin"}
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 11, borderRadius: 12 }}
                  onClick={() => { handleSeatAction("mute", showProfileCard!.seatIdx); setShowProfileCard(null); }}>
                  {"\u{1F507}"} Mute
                </button>
                <button className="btn btn-danger btn-sm" style={{ flex: 1, fontSize: 11, borderRadius: 12 }}
                  onClick={() => { handleSeatAction("kick", showProfileCard!.seatIdx); setShowProfileCard(null); }}>
                  {"\u{1F6AB}"} Kick
                </button>
              </div>
            )}
          </div>
        </Overlay>
      )}

      {showReportModal && (
        <Overlay onClose={() => { setShowReportModal(null); setReportReason(""); }}>
          <div className="card" style={{ width: 300, padding: 24, animation: "popIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 4, textAlign: "center" }}>{"\u26A0\uFE0F"} Report User</h3>
            <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", textAlign: "center", marginBottom: 16 }}>Select a reason for reporting</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {["Harassment", "Spam", "Inappropriate Content", "Fake Profile", "Other"].map(r => (
                <button key={r} onClick={() => setReportReason(r)} style={{
                  padding: "10px 14px", borderRadius: 12, border: reportReason === r ? "1.5px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                  background: reportReason === r ? "rgba(108,92,231,0.12)" : "rgba(255,255,255,0.03)",
                  color: reportReason === r ? "#A29BFE" : "rgba(162,155,254,0.5)", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                }}>{r}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }}
                onClick={() => { setShowReportModal(null); setReportReason(""); }}>Cancel</button>
              <button className="btn btn-danger btn-full" style={{ fontSize: 13 }}
                disabled={!reportReason}
                onClick={async () => {
                  if (showReportModal && reportReason) {
                    try {
                      await reportUser(user.uid, showReportModal, reportReason, "");
                      showToast("Report submitted. Thank you!", "success");
                    } catch {
                      showToast("Failed to submit report", "error");
                    }
                    setShowReportModal(null);
                    setReportReason("");
                  }
                }}>Submit Report</button>
            </div>
          </div>
        </Overlay>
      )}

      {pkBattle && pkBattle.status === "active" && (
        <div style={{
          position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
          zIndex: 500, width: "90%", maxWidth: 380,
          background: "linear-gradient(135deg, rgba(255,50,50,0.15), rgba(255,200,0,0.1))",
          border: "1.5px solid rgba(255,100,50,0.4)", borderRadius: 16, padding: "10px 16px",
          backdropFilter: "blur(10px)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: "#FF6B35" }}>⚔️ PK BATTLE</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#FFD700", fontFamily: "monospace" }}>{pkTimer}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>{pkBattle.room1Name}</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: "#FF6B35" }}>{pkBattle.room1Score.toLocaleString()}</p>
            </div>
            <span style={{ fontSize: 20, color: "rgba(255,255,255,0.3)" }}>⚡</span>
            <div style={{ flex: 1, textAlign: "center" }}>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>{pkBattle.room2Name}</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: "#4FC3F7" }}>{pkBattle.room2Score.toLocaleString()}</p>
            </div>
          </div>
          <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2, transition: "width 0.5s ease",
              width: `${pkBattle.room1Score + pkBattle.room2Score > 0 ? (pkBattle.room1Score / (pkBattle.room1Score + pkBattle.room2Score)) * 100 : 50}%`,
              background: "linear-gradient(90deg, #FF6B35, #FFD700)",
            }} />
          </div>
        </div>
      )}

      {pkInvites.length > 0 && isOwner && (
        <div style={{ position: "fixed", top: 120, right: 12, zIndex: 500 }}>
          {pkInvites.map(inv => (
            <div key={inv.id} className="card" style={{ padding: 12, marginBottom: 8, width: 220, animation: "popIn 0.2s ease" }}>
              <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>⚔️ PK Challenge from <span style={{ color: "#FFD700" }}>{inv.fromRoomName}</span></p>
              <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)", marginBottom: 8 }}>Duration: {inv.duration / 60000} min</p>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: 10 }}
                  onClick={async () => {
                    await respondPKInvite(inv.id, true, room?.name || "", user.avatar);
                    showToast("PK Battle started!", "success");
                  }}>Accept</button>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 10 }}
                  onClick={async () => {
                    await respondPKInvite(inv.id, false, "", "");
                    showToast("PK declined", "info");
                  }}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PK battle button hidden from UI — feature accessible via admin panel only */}

      {showPKPanel && isOwner && (
        <Overlay onClose={() => setShowPKPanel(false)}>
          <div className="card" style={{ width: 300, padding: 20, animation: "popIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 900, textAlign: "center", marginBottom: 12 }}>⚔️ Start PK Battle</h3>
            <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", textAlign: "center", marginBottom: 16 }}>Challenge another room to a gift battle!</p>
            <p style={{ fontSize: 10, color: "rgba(162,155,254,0.3)", marginBottom: 8, textAlign: "center" }}>Pick a duration to send a PK challenge to a random active room:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {getPKDurations().map(d => (
                <button key={d.value} className="btn btn-primary btn-sm" style={{ fontSize: 11 }}
                  onClick={async () => {
                    try {
                      const { fetchRooms: fetchAllRooms } = await import("../lib/roomService");
                      const allRooms = await fetchAllRooms();
                      const otherRooms = allRooms.filter((r: any) => r.id !== roomId && r.isLive);
                      if (otherRooms.length === 0) {
                        showToast("No other active rooms to challenge!", "warning");
                        return;
                      }
                      const target = otherRooms[Math.floor(Math.random() * otherRooms.length)];
                      await sendPKInvite(roomId, room?.name || "Room", user.uid, user.name || "Host", target.id, target.hostId, d.value);
                      showToast(`PK challenge sent to ${target.name}! (${d.label})`, "success");
                    } catch {
                      showToast("Failed to send PK invite", "error");
                    }
                    setShowPKPanel(false);
                  }}>{d.label}</button>
              ))}
            </div>
          </div>
        </Overlay>
      )}

      {/* ── Left-side utility buttons – only waitlist button remains (⏳) ── */}
      <div style={{ position: "fixed", bottom: 160, left: 12, zIndex: 450, display: "flex", flexDirection: "column", gap: 8 }}>
        {waitlist.length > 0 && hasControl && (
          <button onClick={() => setShowWaitlist(!showWaitlist)} style={{
            width: 40, height: 40, borderRadius: 20, position: "relative",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
          }} title="Waitlist">
            ⏳
            <span style={{
              position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8,
              background: "#6C5CE7", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            }}>{waitlist.length}</span>
          </button>
        )}
      </div>

      {showWaitlist && hasControl && (
        <Overlay onClose={() => setShowWaitlist(false)}>
          <div className="card" style={{ width: 300, padding: 20, animation: "popIn 0.2s ease", maxHeight: "60vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 900, textAlign: "center", marginBottom: 12 }}>⏳ Waitlist ({waitlist.length})</h3>
            {waitlist.length === 0 ? (
              <p style={{ textAlign: "center", fontSize: 13, color: "rgba(162,155,254,0.4)", padding: 16 }}>No one waiting</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {waitlist.map((w, i) => (
                  <div key={w.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 12, background: "rgba(255,255,255,0.03)" }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: "rgba(162,155,254,0.4)", width: 20 }}>#{i + 1}</span>
                    <div style={{ width: 28, height: 28, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "rgba(108,92,231,0.12)" }}>
                      {w.avatar?.length <= 2 ? w.avatar : "👤"}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{w.name}</span>
                    <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: "4px 10px" }}
                      onClick={async () => {
                        await admitFromWaitlist(roomId, w.uid);
                        showToast(`${w.name} admitted`, "success");
                      }}>Admit</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(5,1,18,0.82)", backdropFilter: "blur(5px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600,
    }} onClick={onClose}>
      {children}
    </div>
  );
}

function RoleBadge({ role }: { role: "owner" | "admin" | "user" }) {
  if (role === "owner") return <span className="badge badge-gold" style={{ fontSize: 8, padding: "1px 6px" }}>{"\u{1F451}"} Owner</span>;
  if (role === "admin") return <span className="badge badge-accent" style={{ fontSize: 8, padding: "1px 6px" }}>{"\u{1F6E1}\uFE0F"} Admin</span>;
  return null;
}