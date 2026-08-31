import { ref, set, get, update, push, onValue, off, remove } from "firebase/database";
import { db, uploadWithAppCheck } from "./firebase";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  senderDP?: string;
  text: string;
  timestamp: number;
  type?: "text" | "image" | "emoji" | "voice" | "system";
  imageUrl?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  status?: "sent" | "delivered" | "seen";
  reactions?: Record<string, string>;
  replyTo?: { id: string; text: string; senderName: string };
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: string[];
  participantAvatars: string[];
  participantIsSystem?: Record<number, boolean>;
  lastMessage: string;
  lastTime: number;
  unread: Record<string, number>;
  typing?: Record<string, boolean>;
  lastSeen?: Record<string, number>;
}

export function subscribeConversations(userId: string, cb: (convs: Conversation[]) => void): () => void {
  if (!userId) {
    cb([]);
    return () => {};
  }

  const r = ref(db, `userConvs/${userId}`);
  let convUnsubs: (() => void)[] = [];
  let currentConvs: Conversation[] = [];

  onValue(r, async snap => {
    convUnsubs.forEach(u => u());
    convUnsubs = [];

    if (!snap.exists()) { currentConvs = []; cb([]); return; }
    const convIds = Object.keys(snap.val());
    const convs: Conversation[] = [];

    for (const cid of convIds) {
      const cSnap = await get(ref(db, `conversations/${cid}`));
      if (cSnap.exists()) {
        convs.push({ ...cSnap.val(), id: cid });
      }
    }
    convs.sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
    currentConvs = convs;
    cb(convs);

    for (const cid of convIds) {
      const cRef = ref(db, `conversations/${cid}`);
      onValue(cRef, cSnap => {
        if (!cSnap.exists()) return;
        const updated = { ...cSnap.val(), id: cid };
        const idx = currentConvs.findIndex(c => c.id === cid);
        if (idx >= 0) {
          const n = [...currentConvs];
          n[idx] = updated;
          n.sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
          currentConvs = n;
        } else {
          currentConvs = [...currentConvs, updated].sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
        }
        cb(currentConvs);
      });
      convUnsubs.push(() => off(cRef));
    }
  });

  return () => {
    off(r);
    convUnsubs.forEach(u => u());
  };
}

export function subscribeMessages(convId: string, cb: (msgs: ChatMessage[]) => void): () => void {
  const r = ref(db, `messages/${convId}`);
  onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val();
    const msgs: ChatMessage[] = Object.keys(val).map(k => ({ ...val[k], id: k }));
    msgs.sort((a, b) => a.timestamp - b.timestamp);
    cb(msgs);
  });
  return () => off(r);
}

async function checkMutualFollow(senderUid: string, convId: string): Promise<boolean> {
  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (!convSnap.exists()) return false;
  const conv = convSnap.val();
  const participants: string[] = conv.participants || [];
  const otherUid = participants.find((p: string) => p !== senderUid);
  if (!otherUid) return false;

  const [senderSnap, otherSnap] = await Promise.all([
    get(ref(db, `users/${senderUid}/followingList`)),
    get(ref(db, `users/${otherUid}/followingList`)),
  ]);
  const senderFollowing: string[] = senderSnap.val() || [];
  const otherFollowing: string[] = otherSnap.val() || [];
  return senderFollowing.includes(otherUid) && otherFollowing.includes(senderUid);
}

export async function sendMessage(convId: string, senderId: string, text: string, type: "text" | "emoji" | "system" = "text", replyTo?: { id: string; text: string; senderName: string }): Promise<void> {
  if (type === "system") {
    const senderSnap = await get(ref(db, `users/${senderId}`));
    const sData = senderSnap.exists() ? senderSnap.val() : {};
    const isSA = String(sData.userId) === "306623582" || String(senderId) === "306623582";
    const hasGiftContext = text.startsWith("sent ");
    if (!isSA && !hasGiftContext) throw new Error("Unauthorized system message");
  } else {
    const allowed = await checkMutualFollow(senderId, convId);
    if (!allowed) throw new Error("Chat locked: mutual follow required");
  }

  const senderSnap = await get(ref(db, `users/${senderId}`));
  const senderData = senderSnap.exists() ? senderSnap.val() : {};

  const msgRef = push(ref(db, `messages/${convId}`));
  const msgData: Record<string, unknown> = {
    senderId,
    senderName: senderData.name || "User",
    senderDP: senderData.avatar || "",
    text,
    timestamp: Date.now(),
    type,
    status: "sent",
  };
  if (replyTo) msgData.replyTo = replyTo;
  await set(msgRef, msgData);

  setTimeout(async () => {
    try {
      await update(ref(db, `messages/${convId}/${msgRef.key}`), { status: "delivered" });
    } catch (e) { console.warn("Status update error:", e); }
  }, 800);

  await update(ref(db, `conversations/${convId}`), {
    lastMessage: type === "emoji" ? text : text.slice(0, 60),
    lastTime: Date.now(),
  });

  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (convSnap.exists()) {
    const conv = convSnap.val();
    const otherId = conv.participants.find((p: string) => p !== senderId);
    if (otherId) {
      const unread = conv.unread || {};
      unread[otherId] = (unread[otherId] || 0) + 1;
      await update(ref(db, `conversations/${convId}`), { unread });
    }
  }
}

export async function sendImageMessage(convId: string, senderId: string, file: File): Promise<void> {
  const allowed = await checkMutualFollow(senderId, convId);
  if (!allowed) throw new Error("Chat locked: mutual follow required");

  const senderSnap = await get(ref(db, `users/${senderId}`));
  const senderData = senderSnap.exists() ? senderSnap.val() : {};

  const path = `chatImages/${convId}/${Date.now()}_${file.name}`;
  const { url } = await uploadWithAppCheck(file, path);

  const msgRef = push(ref(db, `messages/${convId}`));
  await set(msgRef, {
    senderId,
    senderName: senderData.name || "User",
    senderDP: senderData.avatar || "",
    text: "📷 Image",
    imageUrl: url,
    timestamp: Date.now(),
    type: "image",
    status: "sent",
  });

  await update(ref(db, `conversations/${convId}`), {
    lastMessage: "📷 Image",
    lastTime: Date.now(),
  });

  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (convSnap.exists()) {
    const conv = convSnap.val();
    const otherId = conv.participants.find((p: string) => p !== senderId);
    if (otherId) {
      const unread = conv.unread || {};
      unread[otherId] = (unread[otherId] || 0) + 1;
      await update(ref(db, `conversations/${convId}`), { unread });
    }
  }
}

export async function getOrCreateConversation(uid1: string, uid2: string): Promise<string> {
  const existing = await get(ref(db, `userConvs/${uid1}`));
  if (existing.exists()) {
    const convIds = Object.keys(existing.val());
    for (const cid of convIds) {
      const cSnap = await get(ref(db, `conversations/${cid}`));
      if (cSnap.exists()) {
        const c = cSnap.val();
        if (c.participants?.includes(uid2)) return cid;
      }
    }
  }

  const [u1Snap, u2Snap] = await Promise.all([
    get(ref(db, `users/${uid1}`)),
    get(ref(db, `users/${uid2}`)),
  ]);
  const u1 = u1Snap.exists() ? u1Snap.val() : {};
  const u2 = u2Snap.exists() ? u2Snap.val() : {};

  const newConvRef = push(ref(db, "conversations"));
  const convId = newConvRef.key!;
  await set(newConvRef, {
    participants: [uid1, uid2],
    participantNames: [u1.name || "User", u2.name || "User"],
    participantAvatars: [u1.avatar || "", u2.avatar || ""],
    lastMessage: "",
    lastTime: Date.now(),
    unread: { [uid1]: 0, [uid2]: 0 },
  });
  await Promise.all([
    set(ref(db, `userConvs/${uid1}/${convId}`), true),
    set(ref(db, `userConvs/${uid2}/${convId}`), true),
  ]);
  return convId;
}

/**
 * Send a message from "Galaxy Official" system bot to a user's chat.
 * Creates the conversation if it doesn't exist.
 * Bypasses mutual-follow restriction since it's a system bot.
 */
const GALAXY_BOT_UID  = "galaxy_official_system";
const GALAXY_BOT_NAME = "Galaxy Official";
const GALAXY_BOT_AVATAR = "https://i.imgur.com/7FMSHuH.png"; // Galaxy app icon

export async function sendGalaxyOfficialDM(toUid: string, message: string): Promise<void> {
  try {
    const convId = `galaxy_official_${toUid}`;
    const convRef = ref(db, `conversations/${convId}`);
    const convSnap = await get(convRef);

    if (!convSnap.exists()) {
      const userSnap = await get(ref(db, `users/${toUid}`));
      const userData = userSnap.exists() ? userSnap.val() : {};
      await set(convRef, {
        participants: [GALAXY_BOT_UID, toUid],
        participantNames: [GALAXY_BOT_NAME, userData.name || "User"],
        participantAvatars: [GALAXY_BOT_AVATAR, userData.avatar || ""],
        participantIsSystem: { "0": true },
        lastMessage: "",
        lastTime: Date.now(),
        unread: { [toUid]: 0 },
      });
      await set(ref(db, `userConvs/${toUid}/${convId}`), true);
    }

    const msgRef = push(ref(db, `messages/${convId}`));
    await set(msgRef, {
      senderId: GALAXY_BOT_UID,
      senderName: GALAXY_BOT_NAME,
      senderDP: GALAXY_BOT_AVATAR,
      text: message,
      timestamp: Date.now(),
      type: "system",
      status: "delivered",
    });

    const conv = convSnap.exists() ? convSnap.val() : {};
    const unread = conv.unread || {};
    unread[toUid] = (unread[toUid] || 0) + 1;
    await update(convRef, {
      lastMessage: message.slice(0, 80),
      lastTime: Date.now(),
      unread,
    });
  } catch (e) {
    console.warn("[GalaxyBot] DM send failed:", e);
  }
}

export async function markConversationRead(convId: string, userId: string): Promise<void> {
  await update(ref(db, `conversations/${convId}`), {
    [`unread/${userId}`]: 0,
  });
}

// ─── ✅ Added: markRead (alias for markConversationRead) ─────
export async function markRead(convId: string, userId: string): Promise<void> {
  return markConversationRead(convId, userId);
}

// ─── ✅ Added: updateLastSeen ──────────────────────────────
export async function updateLastSeen(convId: string, userId: string): Promise<void> {
  await update(ref(db, `conversations/${convId}/lastSeen`), { [userId]: Date.now() });
}

export async function deleteConversation(convId: string, userId: string): Promise<void> {
  await remove(ref(db, `userConvs/${userId}/${convId}`));
}

export async function setTyping(convId: string, userId: string, isTyping: boolean): Promise<void> {
  await update(ref(db, `conversations/${convId}/typing`), { [userId]: isTyping });
}

export function subscribeTyping(convId: string, cb: (typing: Record<string, boolean>) => void): () => void {
  const r = ref(db, `conversations/${convId}/typing`);
  onValue(r, snap => { cb(snap.exists() ? snap.val() : {}); });
  return () => off(r);
}

export async function sendVoiceMessage(convId: string, senderId: string, file: Blob, duration: number): Promise<void> {
  const allowed = await checkMutualFollow(senderId, convId);
  if (!allowed) throw new Error("Chat locked: mutual follow required");

  const senderSnap = await get(ref(db, `users/${senderId}`));
  const senderData = senderSnap.exists() ? senderSnap.val() : {};

  const path = `voiceMessages/${convId}/${Date.now()}.webm`;
  const { url } = await uploadWithAppCheck(file, path);

  const msgRef = push(ref(db, `messages/${convId}`));
  await set(msgRef, {
    senderId,
    senderName: senderData.name || "User",
    senderDP: senderData.avatar || "",
    text: "🎤 Voice message",
    voiceUrl: url,
    voiceDuration: duration,
    timestamp: Date.now(),
    type: "voice",
    status: "sent",
  });

  await update(ref(db, `conversations/${convId}`), {
    lastMessage: "🎤 Voice message",
    lastTime: Date.now(),
  });

  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (convSnap.exists()) {
    const conv = convSnap.val();
    const otherId = conv.participants.find((p: string) => p !== senderId);
    if (otherId) {
      const unread = conv.unread || {};
      unread[otherId] = (unread[otherId] || 0) + 1;
      await update(ref(db, `conversations/${convId}`), { unread });
    }
  }
}

export async function addReaction(convId: string, msgId: string, userId: string, emoji: string): Promise<void> {
  await update(ref(db, `messages/${convId}/${msgId}/reactions`), { [userId]: emoji });
}

export async function getUserConversationCount(userId: string): Promise<number> {
  const snap = await get(ref(db, `userConvs/${userId}`));
  return snap.exists() ? Object.keys(snap.val()).length : 0;
}

// ─── clearChat (for room messages) ────────────────────────────
export async function clearChat(roomId: string): Promise<void> {
  await remove(ref(db, `roomMessages/${roomId}`));
}