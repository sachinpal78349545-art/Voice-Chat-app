import { ref, set, get, update, onValue, off, onDisconnect, runTransaction, push } from "firebase/database";
import { db } from "./firebase";

export interface Transaction {
  id: string;
  type: "recharge" | "gift_sent" | "gift_received" | "daily_reward" | "xp_reward" | "task_reward" | "earnings";
  amount: number;
  description: string;
  timestamp: number;
}

export interface Achievement {
  id: string;
  title: string;
  icon: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromName: string;
  fromAvatar: string;
  toUid: string;
  status: "pending" | "accepted" | "rejected";
  timestamp: number;
}

export interface Report {
  id: string;
  reporterUid: string;
  reportedUid: string;
  reason: string;
  details: string;
  attachmentUrl?: string;
  timestamp: number;
}

export interface DailyTask {
  id: string;
  title: string;
  icon: string;
  reward: number;
  target: number;
  field: string;
}

export const SUPER_ADMIN_USER_ID = "306623582";

export interface UserProfile {
  uid: string;
  userId: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  gender: string;
  birthday: string;
  coins: number;
  followers: number;
  following: number;
  friends: number;
  level: number;
  xp: number;
  // === ADDED FOR WEALTH & CHARM LEVELS ===
  wealthLevel: number;
  wealthXp: number;
  charmLevel: number;
  charmXp: number;
  // ======================================
  vip: boolean;
  verified?: boolean;
  isVerified?: boolean;
  online: boolean;
  lastSeen: number;
  createdAt: number;
  isSuperAdmin?: boolean;
  globalRole?: "official" | "officialHost" | "user";
  hostStatus?: "pending" | "approved" | "rejected";
  hostApprovedAt?: number | null;
  kycStatus?: "pending" | "approved" | "rejected";
  agencyId?: string | null;
  agencyRole?: "owner" | "host" | null;
  agencyCode?: string | null;
  frame?: string;
  friendsCount?: number;
  fansCount?: number;
  visitorsCount?: number;
  dailyReward?: {
    lastClaimed: number;
    streak: number;
  };
  followingList?: string[];
  followersList?: string[];
  friendsList?: string[];
  blockedList?: string[];
  transactions?: Record<string, Transaction>;
  achievements?: Record<string, Achievement>;
  roomsJoined?: number;
  messagesSent?: number;
  giftsGiven?: number;
  totalEarnings?: number;
  visitors?: number;
  privacy?: {
    profileVisible: boolean;
    showOnline: boolean;
    allowMessages: "everyone" | "friends" | "nobody";
    allowGifts: boolean;
    pushNotifications?: boolean;
    messageNotifications?: boolean;
    giftNotifications?: boolean;
    roomInviteNotifications?: boolean;
  };
  dailyTasks?: Record<string, { progress: number; completed: boolean; claimedAt?: number }>;
  lastTaskReset?: number;
  inventory?: Record<string, { itemId: string; purchasedAt: number; equipped: boolean }>;
  equippedFrame?: string;
  equippedEntry?: string;
  equippedTheme?: string;
  isBanned?: boolean;
  banUntil?: number | null;
  bannedBy?: string;
  banReason?: string;
  deviceBanned?: boolean;
  deviceId?: string;
  shadowBanned?: boolean;
  ghostMode?: boolean;
  customBadges?: Record<string, { id: string; name: string; icon: string; imageUrl?: string }>;
  hasRoom?: boolean;
  myRoomId?: string;
  profileCompleted?: boolean;
  country?: string;
}

export const DEFAULT_PROFILE: Partial<UserProfile> = {
  bio: "Hi there! I'm on Galaxy Voice Chat \u{1F31F}",
  gender: "Male",
  birthday: "",
  coins: 500,
  followers: 0,
  following: 0,
  friends: 0,
  level: 1,
  xp: 0,
  // === ADDED DEFAULT VALUES ===
  wealthLevel: 1,
  wealthXp: 0,
  charmLevel: 1,
  charmXp: 0,
  // ============================
  vip: false,
  online: true,
  lastSeen: Date.now(),
  roomsJoined: 0,
  messagesSent: 0,
  giftsGiven: 0,
  totalEarnings: 0,
  visitors: 0,
  privacy: {
    profileVisible: true,
    showOnline: true,
    allowMessages: "everyone",
    allowGifts: true,
  },
};

export const AVATAR_LIST = [
  "\u{1F31F}","\u{1F319}","\u{1F680}","\u2B50","\u{1F4AB}","\u{1F3B5}","\u{1F3A4}","\u{1F989}","\u{1F30C}","\u26A1",
  "\u{1F525}","\u{1F451}","\u{1F48E}","\u{1F3AD}","\u{1F3C6}","\u{1F981}","\u{1F409}","\u{1F98A}","\u{1F308}","\u{1F3AF}",
];

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_room", title: "First Steps", icon: "\u{1F680}", description: "Join your first voice room", unlocked: false },
  { id: "level_5", title: "Rising Star", icon: "\u2B50", description: "Reach Level 5", unlocked: false },
  { id: "level_10", title: "VIP Status", icon: "\u{1F451}", description: "Reach Level 10 and unlock VIP", unlocked: false },
  { id: "level_25", title: "Galaxy Legend", icon: "\u{1F30C}", description: "Reach Level 25", unlocked: false },
  { id: "coins_1000", title: "Rich!", icon: "\u{1F4B0}", description: "Accumulate 1,000 coins", unlocked: false },
  { id: "coins_10000", title: "Millionaire", icon: "\u{1F48E}", description: "Accumulate 10,000 coins", unlocked: false },
  { id: "messages_50", title: "Chatterbox", icon: "\u{1F4AC}", description: "Send 50 messages", unlocked: false },
  { id: "messages_500", title: "Social Butterfly", icon: "\u{1F98B}", description: "Send 500 messages", unlocked: false },
  { id: "rooms_10", title: "Room Hopper", icon: "\u{1F3A4}", description: "Join 10 rooms", unlocked: false },
  { id: "streak_7", title: "Dedicated", icon: "\u{1F525}", description: "7-day login streak", unlocked: false },
  { id: "gift_sender", title: "Generous", icon: "\u{1F381}", description: "Send your first gift", unlocked: false },
  { id: "follower_10", title: "Popular", icon: "\u{1F31F}", description: "Get 10 followers", unlocked: false },
];

export const DAILY_TASKS: DailyTask[] = [
  { id: "join_room", title: "Join a Voice Room", icon: "\u{1F3A4}", reward: 30, target: 1, field: "roomsJoined" },
  { id: "send_messages", title: "Send 10 Messages", icon: "\u{1F4AC}", reward: 25, target: 10, field: "messagesSent" },
  { id: "send_gift", title: "Send a Gift", icon: "\u{1F381}", reward: 40, target: 1, field: "giftsGiven" },
  { id: "login_daily", title: "Daily Login", icon: "\u2705", reward: 20, target: 1, field: "loginToday" },
];

export async function generateUserId(): Promise<string> {
  const min = 100000000;
  const max = 999999999;
  let attempts = 0;
  while (attempts < 20) {
    const id = String(Math.floor(Math.random() * (max - min + 1)) + min);
    const idRef = ref(db, `userIds/${id}`);
    const result = await runTransaction(idRef, (current) => {
      if (current === null) return "__reserving__";
      return undefined;
    });
    if (result.committed) return id;
    attempts++;
  }
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

function generateDeviceFingerprint(): string {
  const nav = navigator;
  const screen = window.screen;
  const raw = [nav.userAgent, nav.language, screen.width, screen.height, screen.colorDepth, new Date().getTimezoneOffset()].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash) + raw.charCodeAt(i); hash |= 0; }
  return "dev_" + Math.abs(hash).toString(36);
}

export async function initUser(uid: string, name: string, email: string, avatar: string): Promise<UserProfile> {
  const existing = await getUser(uid);
  const deviceId = generateDeviceFingerprint();
  const loginMeta = { online: true, lastSeen: Date.now(), lastLoginAt: Date.now(), userAgent: navigator.userAgent, deviceId };
  if (existing) {
    if (!existing.userId) {
      const userId = await generateUserId();
      await update(ref(db, `users/${uid}`), { userId, ...loginMeta });
      await set(ref(db, `userIds/${userId}`), uid);
      return { ...existing, userId, ...loginMeta };
    }
    await update(ref(db, `users/${uid}`), loginMeta);
    return { ...existing, ...loginMeta };
  }
  const userId = await generateUserId();
  const achievements: Record<string, Achievement> = {};
  ALL_ACHIEVEMENTS.forEach(a => { achievements[a.id] = { ...a }; });
  const profile: UserProfile = {
    uid, userId, name, email,
    avatar: avatar || AVATAR_LIST[Math.floor(Math.random() * AVATAR_LIST.length)],
    ...DEFAULT_PROFILE,
    createdAt: Date.now(),
    achievements,
    profileCompleted: false,
  } as UserProfile;
  await set(ref(db, `users/${uid}`), profile);
  await set(ref(db, `userIds/${userId}`), uid);
  return profile;
}

export async function getUser(uid: string): Promise<UserProfile | null> {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? (snap.val() as UserProfile) : null;
}

export async function updateUser(uid: string, data: Partial<UserProfile>): Promise<void> {
  await update(ref(db, `users/${uid}`), data);
}

export function subscribeUser(uid: string, cb: (u: UserProfile | null) => void): () => void {
  const r = ref(db, `users/${uid}`);
  onValue(r, snap => cb(snap.exists() ? snap.val() : null));
  return () => off(r);
}

export async function addCoins(uid: string, amount: number): Promise<void> {
  const coinsRef = ref(db, `users/${uid}/coins`);
  await runTransaction(coinsRef, (current: number | null) => {
    return (current ?? 0) + amount;
  });
}

export async function gainXP(uid: string, amount: number, currentXP: number, currentLevel: number): Promise<void> {
  let xp = currentXP + amount;
  let level = currentLevel;
  const xpPerLevel = 1000;
  while (xp >= xpPerLevel && level < 100) { xp -= xpPerLevel; level += 1; }
  await update(ref(db, `users/${uid}`), { xp, level, vip: level >= 10 });
}

export function setupOnlinePresence(uid: string): () => void {
  const userStatusRef = ref(db, `users/${uid}`);
  const presenceData = { online: false, lastSeen: Date.now() };
  onDisconnect(userStatusRef).update(presenceData);
  update(userStatusRef, { online: true, lastSeen: Date.now() });
  return () => {
    update(userStatusRef, presenceData);
  };
}

export async function followUser(myUid: string, targetUid: string): Promise<{ isMutual: boolean }> {
  const mySnap = await get(ref(db, `users/${myUid}`));
  const targetSnap = await get(ref(db, `users/${targetUid}`));
  if (!mySnap.exists() || !targetSnap.exists()) return { isMutual: false };

  const myData = mySnap.val();
  const targetData = targetSnap.val();

  const myFollowing = myData.followingList || [];
  if (myFollowing.includes(targetUid)) return { isMutual: (targetData.followingList || []).includes(myUid) };
  myFollowing.push(targetUid);

  const targetFollowers = targetData.followersList || [];
  targetFollowers.push(myUid);

  await update(ref(db, `users/${myUid}`), {
    followingList: myFollowing,
    following: myFollowing.length,
  });
  await update(ref(db, `users/${targetUid}`), {
    followersList: targetFollowers,
    followers: targetFollowers.length,
  });

  const isMutual = (targetData.followingList || []).includes(myUid);
  return { isMutual };
}

export async function unfollowUser(myUid: string, targetUid: string): Promise<void> {
  const mySnap = await get(ref(db, `users/${myUid}`));
  const targetSnap = await get(ref(db, `users/${targetUid}`));
  if (!mySnap.exists() || !targetSnap.exists()) return;

  const myData = mySnap.val();
  const targetData = targetSnap.val();

  const myFollowing = (myData.followingList || []).filter((id: string) => id !== targetUid);
  const targetFollowers = (targetData.followersList || []).filter((id: string) => id !== myUid);

  await update(ref(db, `users/${myUid}`), {
    followingList: myFollowing,
    following: myFollowing.length,
  });
  await update(ref(db, `users/${targetUid}`), {
    followersList: targetFollowers,
    followers: targetFollowers.length,
  });
}

export async function blockUser(myUid: string, targetUid: string): Promise<void> {
  const snap = await get(ref(db, `users/${myUid}/blockedList`));
  const blocked: string[] = snap.exists() ? snap.val() : [];
  if (blocked.includes(targetUid)) return;
  blocked.push(targetUid);
  await update(ref(db, `users/${myUid}`), { blockedList: blocked });
  await unfollowUser(myUid, targetUid);
  await unfollowUser(targetUid, myUid);
}

export async function unblockUser(myUid: string, targetUid: string): Promise<void> {
  const snap = await get(ref(db, `users/${myUid}/blockedList`));
  const blocked: string[] = snap.exists() ? snap.val() : [];
  await update(ref(db, `users/${myUid}`), { blockedList: blocked.filter(id => id !== targetUid) });
}

export function isBlocked(profile: UserProfile, targetUid: string): boolean {
  return (profile.blockedList || []).includes(targetUid);
}

export async function sendFriendRequest(fromUid: string, fromName: string, fromAvatar: string, toUid: string): Promise<void> {
  const reqRef = push(ref(db, `friendRequests/${toUid}`));
  await set(reqRef, {
    id: reqRef.key,
    fromUid,
    fromName,
    fromAvatar,
    toUid,
    status: "pending",
    timestamp: Date.now(),
  });
}

export function subscribeFriendRequests(uid: string, cb: (reqs: FriendRequest[]) => void): () => void {
  const r = ref(db, `friendRequests/${uid}`);
  onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val();
    const reqs: FriendRequest[] = Object.keys(val).map(k => ({ ...val[k], id: k }));
    reqs.sort((a, b) => b.timestamp - a.timestamp);
    cb(reqs.filter(r => r.status === "pending"));
  });
  return () => off(r);
}

export async function respondFriendRequest(myUid: string, reqId: string, accept: boolean): Promise<void> {
  const reqSnap = await get(ref(db, `friendRequests/${myUid}/${reqId}`));
  if (!reqSnap.exists()) return;
  const req = reqSnap.val() as FriendRequest;

  await update(ref(db, `friendRequests/${myUid}/${reqId}`), { status: accept ? "accepted" : "rejected" });

  if (accept) {
    const mySnap = await get(ref(db, `users/${myUid}/friendsList`));
    const theirSnap = await get(ref(db, `users/${req.fromUid}/friendsList`));
    const myFriends: string[] = mySnap.exists() ? mySnap.val() : [];
    const theirFriends: string[] = theirSnap.exists() ? theirSnap.val() : [];

    if (!myFriends.includes(req.fromUid)) myFriends.push(req.fromUid);
    if (!theirFriends.includes(myUid)) theirFriends.push(myUid);

    await update(ref(db, `users/${myUid}`), { friendsList: myFriends, friends: myFriends.length });
    await update(ref(db, `users/${req.fromUid}`), { friendsList: theirFriends, friends: theirFriends.length });
    await followUser(myUid, req.fromUid);
    await followUser(req.fromUid, myUid);
  }
}

export async function removeFriend(myUid: string, friendUid: string): Promise<void> {
  const mySnap = await get(ref(db, `users/${myUid}/friendsList`));
  const theirSnap = await get(ref(db, `users/${friendUid}/friendsList`));
  const myFriends: string[] = mySnap.exists() ? mySnap.val().filter((id: string) => id !== friendUid) : [];
  const theirFriends: string[] = theirSnap.exists() ? theirSnap.val().filter((id: string) => id !== myUid) : [];

  await update(ref(db, `users/${myUid}`), { friendsList: myFriends, friends: myFriends.length });
  await update(ref(db, `users/${friendUid}`), { friendsList: theirFriends, friends: theirFriends.length });
}

// Updated reportUser with attachmentUrl support
export async function reportUser(reporterUid: string, reportedUid: string, reason: string, details: string, attachmentUrl?: string): Promise<void> {
  const rRef = push(ref(db, "reports"));
  await set(rRef, {
    id: rRef.key,
    reporterUid,
    reportedUid,
    reason,
    details,
    attachmentUrl,
    timestamp: Date.now(),
  });
}

export async function updatePrivacy(uid: string, privacy: UserProfile["privacy"]): Promise<void> {
  await update(ref(db, `users/${uid}`), { privacy });
}

export function getDailyTaskProgress(profile: UserProfile): Array<DailyTask & { progress: number; completed: boolean }> {
  const today = new Date().toDateString();
  const lastReset = profile.lastTaskReset ? new Date(profile.lastTaskReset).toDateString() : "";
  const tasks = profile.dailyTasks || {};

  return DAILY_TASKS.map(task => {
    if (lastReset !== today) {
      return { ...task, progress: task.id === "login_daily" ? 1 : 0, completed: false };
    }
    const t = tasks[task.id];
    return {
      ...task,
      progress: t?.progress ?? (task.id === "login_daily" ? 1 : 0),
      completed: t?.completed ?? false,
    };
  });
}

export async function updateDailyTaskProgress(uid: string, taskId: string, increment: number = 1): Promise<void> {
  const today = new Date().toDateString();
  const snap = await get(ref(db, `users/${uid}`));
  if (!snap.exists()) return;
  const profile = snap.val() as UserProfile;

  const lastReset = profile.lastTaskReset ? new Date(profile.lastTaskReset).toDateString() : "";
  let tasks = profile.dailyTasks || {};

  if (lastReset !== today) {
    tasks = {};
    await update(ref(db, `users/${uid}`), { lastTaskReset: Date.now(), dailyTasks: tasks });
  }

  const task = DAILY_TASKS.find(t => t.id === taskId);
  if (!task) return;

  const current = tasks[taskId] || { progress: 0, completed: false };
  if (current.completed) return;

  const newProgress = Math.min(current.progress + increment, task.target);
  const completed = newProgress >= task.target;

  const updateData: Record<string, unknown> = { progress: newProgress, completed };
  if (completed) updateData.claimedAt = Date.now();

  await update(ref(db, `users/${uid}/dailyTasks/${taskId}`), updateData);

  if (completed && !current.completed) {
    const coinsRef = ref(db, `users/${uid}/coins`);
    await runTransaction(coinsRef, (c: number | null) => (c ?? 0) + task.reward);
    await addTransaction(uid, { type: "task_reward", amount: task.reward, description: `Task: ${task.title}` });
  }
}

export async function claimDailyReward(uid: string, _profile: UserProfile): Promise<{ coins: number; streak: number } | null> {
  const now = Date.now();

  const freshSnap = await get(ref(db, `users/${uid}`));
  if (!freshSnap.exists()) return null;
  const freshProfile = freshSnap.val() as UserProfile;

  const daily = freshProfile.dailyReward || { lastClaimed: 0, streak: 0 };
  const lastDate = new Date(daily.lastClaimed).toDateString();
  const todayDate = new Date(now).toDateString();

  if (lastDate === todayDate) return null;

  const yesterday = new Date(now - 86400000).toDateString();
  const streak = lastDate === yesterday ? daily.streak + 1 : 1;
  const baseCoins = 50;
  const bonusCoins = Math.min(streak * 10, 100);
  const totalCoins = baseCoins + bonusCoins;

  const coinsRef = ref(db, `users/${uid}/coins`);
  await runTransaction(coinsRef, (currentCoins: number | null) => {
    return (currentCoins ?? 0) + totalCoins;
  });
  await update(ref(db, `users/${uid}`), {
    dailyReward: { lastClaimed: now, streak },
  });

  await addTransaction(uid, {
    type: "daily_reward",
    amount: totalCoins,
    description: `Day ${streak} reward (+${bonusCoins} streak bonus)`,
  });

  await updateDailyTaskProgress(uid, "login_daily");

  const updatedSnap = await get(ref(db, `users/${uid}`));
  if (updatedSnap.exists()) {
    await checkAchievements(uid, { ...updatedSnap.val(), uid });
  }

  return { coins: totalCoins, streak };
}

export async function addTransaction(uid: string, tx: Omit<Transaction, "id" | "timestamp">): Promise<void> {
  const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const transaction: Transaction = { ...tx, id, timestamp: Date.now() };
  await set(ref(db, `users/${uid}/transactions/${id}`), transaction);
}

export async function sendGift(senderUid: string, _senderProfile: UserProfile, recipientUid: string, giftEmoji: string, cost: number): Promise<boolean> {
  const senderCoinsRef = ref(db, `users/${senderUid}/coins`);
  const result = await runTransaction(senderCoinsRef, (currentCoins: number | null) => {
    const coins = currentCoins ?? 0;
    if (coins < cost) return undefined;
    return coins - cost;
  });

  if (!result.committed) return false;

  await addTransaction(senderUid, { type: "gift_sent", amount: -cost, description: `Sent ${giftEmoji} gift` });

  const giftsRef = ref(db, `users/${senderUid}/giftsGiven`);
  await runTransaction(giftsRef, (c: number | null) => (c ?? 0) + 1);

  if (recipientUid) {
    const recipientCoinsRef = ref(db, `users/${recipientUid}/coins`);
    const creditAmount = Math.floor(cost * 0.8);
    await runTransaction(recipientCoinsRef, (currentCoins: number | null) => {
      return (currentCoins ?? 0) + creditAmount;
    });
    await addTransaction(recipientUid, { type: "gift_received", amount: creditAmount, description: `Received ${giftEmoji} gift` });

    const earningsRef = ref(db, `users/${recipientUid}/totalEarnings`);
    await runTransaction(earningsRef, (c: number | null) => (c ?? 0) + creditAmount);
  }

  await updateDailyTaskProgress(senderUid, "send_gift");

  const freshSnap = await get(ref(db, `users/${senderUid}`));
  if (freshSnap.exists()) {
    await checkAchievements(senderUid, { ...freshSnap.val(), uid: senderUid });
  }
  return true;
}

export async function incrementStat(uid: string, stat: "roomsJoined" | "messagesSent"): Promise<void> {
  const statRef = ref(db, `users/${uid}/${stat}`);
  await runTransaction(statRef, (current: number | null) => {
    return (current ?? 0) + 1;
  });

  if (stat === "roomsJoined") {
    await updateDailyTaskProgress(uid, "join_room");
  } else if (stat === "messagesSent") {
    await updateDailyTaskProgress(uid, "send_messages");
  }
}

export async function checkAchievements(uid: string, profile: UserProfile): Promise<string[]> {
  const unlocked: string[] = [];
  const now = Date.now();
  const checks: Record<string, boolean> = {
    first_room: (profile.roomsJoined || 0) >= 1,
    level_5: profile.level >= 5,
    level_10: profile.level >= 10,
    level_25: profile.level >= 25,
    coins_1000: profile.coins >= 1000,
    coins_10000: profile.coins >= 10000,
    messages_50: (profile.messagesSent || 0) >= 50,
    messages_500: (profile.messagesSent || 0) >= 500,
    rooms_10: (profile.roomsJoined || 0) >= 10,
    streak_7: (profile.dailyReward?.streak || 0) >= 7,
    gift_sender: (profile.giftsGiven || 0) >= 1,
    follower_10: (profile.followers || 0) >= 10,
  };

  const achievements = profile.achievements || {};
  for (const [id, condition] of Object.entries(checks)) {
    if (condition && achievements[id] && !achievements[id].unlocked) {
      await update(ref(db, `users/${uid}/achievements/${id}`), { unlocked: true, unlockedAt: now });
      unlocked.push(id);
    }
  }
  return unlocked;
}

export function getAchievementsList(profile: UserProfile): Achievement[] {
  if (!profile.achievements) return ALL_ACHIEVEMENTS;
  return ALL_ACHIEVEMENTS.map(a => profile.achievements?.[a.id] || a);
}

export async function searchUsers(query: string): Promise<UserProfile[]> {
  const snap = await get(ref(db, "users"));
  if (!snap.exists()) return [];
  const val = snap.val();
  const q = query.toLowerCase().trim();
  const isNumeric = /^\d+$/.test(q);
  return Object.values(val)
    .filter((u: any) => {
      if (isNumeric) {
        return (u.userId || "").includes(q) || u.name?.toLowerCase().includes(q);
      }
      return u.name?.toLowerCase().includes(q);
    })
    .slice(0, 20) as UserProfile[];
}

export async function canChat(userAUid: string, userBUid: string): Promise<boolean> {
  const aSnap = await get(ref(db, `users/${userAUid}/followingList`));
  const bSnap = await get(ref(db, `users/${userBUid}/followingList`));
  const aFollowing: string[] = aSnap.exists() ? aSnap.val() : [];
  const bFollowing: string[] = bSnap.exists() ? bSnap.val() : [];
  return aFollowing.includes(userBUid) && bFollowing.includes(userAUid);
}

export function canChatSync(profileA: UserProfile, profileB: UserProfile): boolean {
  const aFollowing = profileA.followingList || [];
  const bFollowing = profileB.followingList || [];
  const mutualFollow = aFollowing.includes(profileB.uid) && bFollowing.includes(profileA.uid);
  const areFriends = (profileA.friendsList || []).includes(profileB.uid);
  return mutualFollow || areFriends;
}

export function isSuperAdmin(user: UserProfile): boolean {
  return user.userId === SUPER_ADMIN_USER_ID;
}

export function isOfficialOrAdmin(user: UserProfile): boolean {
  return isSuperAdmin(user) || user.globalRole === "official";
}

export async function setOfficialRole(targetUid: string): Promise<void> {
  await update(ref(db, `users/${targetUid}`), {
    globalRole: "official",
    frame: "assets/frames/official_frame.png",
  });
}

export async function removeOfficialRole(targetUid: string): Promise<void> {
  await update(ref(db, `users/${targetUid}`), {
    globalRole: "user",
    frame: null,
  });
}

export async function ensureSuperAdmin(uid: string): Promise<void> {
  await update(ref(db, `users/${uid}`), { isSuperAdmin: true });
}

export type BanDuration = "4h" | "24h" | "7d" | "permanent";

export async function banUser(targetUid: string, duration: BanDuration, bannedByUid: string): Promise<void> {
  const caller = await getUser(bannedByUid);
  if (!caller || caller.userId !== SUPER_ADMIN_USER_ID) {
    throw new Error("Unauthorized: only Super Admin can ban users");
  }
  let banUntil: number | null = null;
  const now = Date.now();
  switch (duration) {
    case "4h": banUntil = now + 4 * 60 * 60 * 1000; break;
    case "24h": banUntil = now + 24 * 60 * 60 * 1000; break;
    case "7d": banUntil = now + 7 * 24 * 60 * 60 * 1000; break;
    case "permanent": banUntil = null; break;
  }
  await update(ref(db, `users/${targetUid}`), {
    isBanned: true,
    banUntil,
    bannedBy: bannedByUid,
    banReason: duration === "permanent" ? "Permanent ID Ban" : `Banned for ${duration}`,
  });
}

export async function unbanUser(targetUid: string, callerUid?: string): Promise<void> {
  if (callerUid) {
    const caller = await getUser(callerUid);
    if (!caller || caller.userId !== SUPER_ADMIN_USER_ID) {
      throw new Error("Unauthorized: only Super Admin can unban users");
    }
  }
  await update(ref(db, `users/${targetUid}`), {
    isBanned: false,
    banUntil: null,
    bannedBy: null,
    banReason: null,
  });
}

export function isUserBanned(user: UserProfile): boolean {
  if (!user.isBanned) return false;
  if (user.banUntil === null || user.banUntil === undefined) return true;
  if (Date.now() < user.banUntil) return true;
  return false;
}

export function getBanTimeRemaining(user: UserProfile): string {
  if (!user.isBanned) return "";
  if (user.banUntil === null || user.banUntil === undefined) return "Permanent Ban";
  const remaining = user.banUntil - Date.now();
  if (remaining <= 0) return "";
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h ${minutes}m remaining`;
  }
  return `${hours}h ${minutes}m remaining`;
}

export async function setUserCoins(targetUid: string, newBalance: number): Promise<void> {
  await update(ref(db, `users/${targetUid}`), { coins: newBalance });
}

export async function deleteUserAvatar(targetUid: string): Promise<void> {
  await update(ref(db, `users/${targetUid}`), { avatar: "\u{1F30C}" });
}

export async function resetUserName(targetUid: string): Promise<void> {
  await update(ref(db, `users/${targetUid}`), { name: "Galaxy User" });
}

export async function getUserByUserId(userId: string): Promise<UserProfile | null> {
  const snap = await get(ref(db, "users"));
  if (!snap.exists()) return null;
  const val = snap.val();
  for (const uid of Object.keys(val)) {
    if (val[uid].userId === userId) return { ...val[uid], uid } as UserProfile;
  }
  return null;
}

export async function deviceBanUser(targetUid: string, bannedByUid: string): Promise<void> {
  const caller = await getUser(bannedByUid);
  if (!caller || caller.userId !== SUPER_ADMIN_USER_ID) {
    throw new Error("Unauthorized: only Super Admin can device ban users");
  }
  await update(ref(db, `users/${targetUid}`), {
    isBanned: true,
    banUntil: null,
    bannedBy: bannedByUid,
    banReason: "Device ID Ban",
    deviceBanned: true,
  });
  const targetUser = await getUser(targetUid);
  if (targetUser?.deviceId) {
    await set(ref(db, `bannedDevices/${targetUser.deviceId}`), {
      uid: targetUid,
      bannedAt: Date.now(),
      bannedBy: bannedByUid,
    });
  }
}

export async function isDeviceBanned(deviceId: string): Promise<boolean> {
  const snap = await get(ref(db, `bannedDevices/${deviceId}`));
  return snap.exists();
}

export async function saveDeviceId(uid: string, deviceId: string): Promise<void> {
  await update(ref(db, `users/${uid}`), { deviceId });
}

export async function shadowBanUser(targetUid: string, callerUid?: string): Promise<void> {
  if (callerUid) {
    const caller = await getUser(callerUid);
    if (!caller || caller.userId !== SUPER_ADMIN_USER_ID) {
      throw new Error("Unauthorized: only Super Admin can shadow ban users");
    }
  }
  await update(ref(db, `users/${targetUid}`), { shadowBanned: true });
}

export async function removeShadowBan(targetUid: string, callerUid?: string): Promise<void> {
  if (callerUid) {
    const caller = await getUser(callerUid);
    if (!caller || caller.userId !== SUPER_ADMIN_USER_ID) {
      throw new Error("Unauthorized: only Super Admin can remove shadow bans");
    }
  }
  await update(ref(db, `users/${targetUid}`), { shadowBanned: false });
}

// === MODIFIED: setUserLevelXP now supports active, wealth, and charm ===
export async function setUserLevelXP(
  targetUid: string,
  level: number,
  xp: number,
  type: "active" | "wealth" | "charm" = "active"
): Promise<void> {
  const updateData: any = {};
  if (type === "active") {
    updateData.level = level;
    updateData.xp = xp;
    updateData.vip = level >= 10;
  } else if (type === "wealth") {
    updateData.wealthLevel = level;
    updateData.wealthXp = xp;
  } else if (type === "charm") {
    updateData.charmLevel = level;
    updateData.charmXp = xp;
  }
  await update(ref(db, `users/${targetUid}`), updateData);
}
// =================================================================

export async function transferAccountData(fromUid: string, toUid: string): Promise<void> {
  const fromUser = await getUser(fromUid);
  const toUser = await getUser(toUid);
  if (!fromUser || !toUser) throw new Error("User not found");
  await update(ref(db, `users/${toUid}`), {
    coins: (toUser.coins || 0) + (fromUser.coins || 0),
    level: Math.max(toUser.level || 1, fromUser.level || 1),
    xp: fromUser.xp || 0,
    vip: (fromUser.level || 1) >= 10 || (toUser.level || 1) >= 10,
    inventory: { ...(toUser.inventory || {}), ...(fromUser.inventory || {}) },
    equippedFrame: fromUser.equippedFrame || toUser.equippedFrame,
    equippedEntry: fromUser.equippedEntry || toUser.equippedEntry,
    equippedTheme: fromUser.equippedTheme || toUser.equippedTheme,
  });
  await update(ref(db, `users/${fromUid}`), { coins: 0, inventory: null, equippedFrame: null, equippedEntry: null, equippedTheme: null });
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await get(ref(db, "users"));
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.keys(val).map(uid => ({ ...val[uid], uid }));
}

export async function createVipUserId(customId: string, uid: string): Promise<boolean> {
  const idRef = ref(db, `userIds/${customId}`);
  const result = await runTransaction(idRef, (current) => {
    if (current === null) return uid;
    return undefined;
  });
  if (result.committed) {
    const user = await getUser(uid);
    if (user?.userId) {
      await set(ref(db, `userIds/${user.userId}`), null);
    }
    await update(ref(db, `users/${uid}`), { userId: customId });
    return true;
  }
  return false;
}

export async function addCustomBadge(targetUid: string, badge: { id: string; name: string; icon: string; imageUrl?: string }): Promise<void> {
  await update(ref(db, `users/${targetUid}/customBadges/${badge.id}`), badge);
}

export async function removeCustomBadge(targetUid: string, badgeId: string): Promise<void> {
  await set(ref(db, `users/${targetUid}/customBadges/${badgeId}`), null);
}

export async function getUserTransactions(targetUid: string): Promise<Transaction[]> {
  const snap = await get(ref(db, `users/${targetUid}/transactions`));
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.values(val) as Transaction[];
}

// Visitor count increment – prevents duplicate counting per session
export async function incrementVisitor(profileUid: string, viewerUid: string): Promise<void> {
  const sessionKey = `visited_${profileUid}_${viewerUid}`;
  if (typeof window !== "undefined" && sessionStorage.getItem(sessionKey)) return;
  if (typeof window !== "undefined") sessionStorage.setItem(sessionKey, "1");
  const visitorsRef = ref(db, `users/${profileUid}/visitors`);
  await runTransaction(visitorsRef, (current: number | null) => {
    return (current ?? 0) + 1;
  });
}