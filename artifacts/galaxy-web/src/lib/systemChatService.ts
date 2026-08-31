// lib/systemChatService.ts
import { db } from "./firebase";
import { ref, set, push, update, get } from "firebase/database";

// ----- Galaxy Assistant (Chalotalk Style) -----
export const ASSISTANT_UID = "00008";
export const ASSISTANT_NAME = "Galaxy Assistant";
export const ASSISTANT_AVATAR = "✨"; // या अपनी DP का URL

// अगर आपके पास पहले से SYSTEM_USERS है, तो उसमें यह जोड़ें या replace करें
export const SYSTEM_USERS = {
  GALAXY_OFFICIAL: {
    uid: "00008",        // ← Assistant UID
    name: "Galaxy Assistant",
    avatar: "✨",        // ← यही DP use होगी
    role: "system",
    isOfficial: true,
  },
  REWARD_ASSISTANT: {
    uid: "system_reward_assistant",
    name: "Reward Assistant",
    avatar: "https://i.imgur.com/3ZQ8bKq.png", // अपनी DP से बदलें
    role: "system",
  },
};

// ----- नया function – किसी specific system user से conversation ID लाना/बनाना -----
export async function getOrCreateSystemConversation(
  userId: string,
  systemUserId: string,
  userName?: string,
  userAvatar?: string
): Promise<string> {
  // कौन सा system user है?
  let sysUser = null;
  for (const key in SYSTEM_USERS) {
    const su = (SYSTEM_USERS as Record<string, typeof SYSTEM_USERS[keyof typeof SYSTEM_USERS]>)[key];
    if (su.uid === systemUserId) {
      sysUser = su;
      break;
    }
  }
  if (!sysUser) throw new Error("System user not found");

  const convId = [userId, systemUserId].sort().join("_");
  const convRef = ref(db, `conversations/${userId}/${convId}`);
  const snap = await get(convRef);
  
  if (!snap.exists()) {
    // नई conversation बनाएँ
    const conversation = {
      id: convId,
      participants: [userId, systemUserId],
      participantNames: { [userId]: userName || "User", [systemUserId]: sysUser.name },
      participantAvatars: { [userId]: userAvatar || "", [systemUserId]: sysUser.avatar },
      participantIsSystem: { [userId]: false, [systemUserId]: true },
      lastMessage: `👋 Welcome! I'm ${sysUser.name}. How can I help you?`,
      lastTime: Date.now(),
      unread: { [userId]: 1 },
      createdAt: Date.now(),
    };
    await set(convRef, conversation);
    
    // स्वागत संदेश भेजें (system type)
    const msgRef = push(ref(db, `conversations/${convId}/messages`));
    await set(msgRef, {
      id: msgRef.key,
      text: conversation.lastMessage,
      senderId: systemUserId,
      senderName: sysUser.name,
      senderAvatar: sysUser.avatar,
      timestamp: Date.now(),
      type: "system",
      readBy: { [userId]: false },
    });
    
    // system user की तरफ से भी conversation बनाएँ (optional)
    const sysConvRef = ref(db, `conversations/${systemUserId}/${convId}`);
    await set(sysConvRef, {
      id: convId,
      participants: [userId, systemUserId],
      participantNames: { [userId]: userName || "User", [systemUserId]: sysUser.name },
      participantAvatars: { [userId]: userAvatar || "", [systemUserId]: sysUser.avatar },
      lastMessage: conversation.lastMessage,
      lastTime: Date.now(),
    });
  }
  return convId;
}

// ----- आपका पुराना ensureSystemConversations – अब नए function को call करेगा -----
export async function ensureSystemConversations(userId: string, userName: string, userAvatar?: string) {
  for (const sysUser of Object.values(SYSTEM_USERS)) {
    await getOrCreateSystemConversation(userId, sysUser.uid, userName, userAvatar);
  }
}

// ----- किसी system user से message भेजने का helper (पुराना) -----
export async function sendSystemMessage(userId: string, systemKey: keyof typeof SYSTEM_USERS, text: string) {
  const sysUser = SYSTEM_USERS[systemKey];
  if (!sysUser) return;
  const convId = await getOrCreateSystemConversation(userId, sysUser.uid);
  const convRef = ref(db, `conversations/${userId}/${convId}`);
  const msgRef = push(ref(db, `conversations/${convId}/messages`));
  const msg = {
    id: msgRef.key,
    text,
    senderId: sysUser.uid,
    senderName: sysUser.name,
    senderAvatar: sysUser.avatar,
    timestamp: Date.now(),
    type: "system",
    readBy: { [userId]: false },
  };
  await set(msgRef, msg);
  const snap = await get(convRef);
  if (snap.exists()) {
    await update(convRef, {
      lastMessage: text,
      lastTime: msg.timestamp,
      [`unread/${userId}`]: (snap.val()?.unread?.[userId] || 0) + 1,
    });
  }
}