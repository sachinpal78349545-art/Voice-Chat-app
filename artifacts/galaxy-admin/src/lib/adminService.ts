import {
  ref, get, set, update, remove, push, onValue, off, runTransaction,
} from "firebase/database";
import { db } from "./firebase";

export const SUPER_ADMIN_USER_ID = "306623582";

export interface UserProfile {
  uid: string;
  userId: string;
  name: string;
  email: string;
  avatar: string;
  coins: number;
  level: number;
  xp: number;
  vip: boolean;
  online: boolean;
  lastSeen: number;
  createdAt: number;
  isBanned?: boolean;
  banUntil?: number | null;
  banReason?: string;
  bannedBy?: string;
  deviceBanned?: boolean;
  shadowBanned?: boolean;
  globalRole?: "official" | "user";
  isSuperAdmin?: boolean;
  followers?: number;
  following?: number;
  friends?: number;
  roomsJoined?: number;
  messagesSent?: number;
  giftsGiven?: number;
  totalEarnings?: number;
  customBadges?: Record<string, { id: string; name: string; icon: string; imageUrl?: string }>;
}

export interface RechargeRequest {
  id: string;
  uid: string;
  userName: string;
  userAvatar: string;
  userId: string;
  transactionId: string;
  packageId: string;
  inrPaid: number;
  coinsRequested: number;
  totalCoins: number;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  processedAt?: number;
  processedBy?: string;
  rejectReason?: string;
}

export interface Room {
  id: string;
  name: string;
  topic: string;
  host: string;
  hostId: string;
  listeners: number;
  isLive: boolean;
  createdAt: number;
  category: string;
  coverEmoji?: string;
  isPrivate?: boolean;
  announcement?: string;
}

export interface GlobalAlert {
  id: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  createdAt: number;
  active: boolean;
}

// ─── Updated getAllUsers with error handling ──────────────────
export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const snap = await get(ref(db, "users"));
    if (!snap.exists()) return [];
    const val = snap.val() as Record<string, UserProfile>;
    return Object.entries(val)
      .map(([uid, u]) => ({ ...u, uid }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error: any) {
    console.error("Error fetching users:", error);
    if (error.message?.includes("permission_denied")) {
      throw new Error("Permission denied: You are not authorized to view users. Please check Firebase security rules.");
    }
    throw error;
  }
}

// ─── Updated searchUsers with error propagation ──────────────────
export async function searchUsers(query: string): Promise<UserProfile[]> {
  try {
    const all = await getAllUsers();
    const q = query.toLowerCase();
    return all.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.userId?.includes(q) ||
      u.uid?.includes(q)
    );
  } catch (error) {
    // re-throw so caller can handle it
    throw error;
  }
}

// ─── Rest of the functions (unchanged) ──────────────────────────

export async function getUser(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await get(ref(db, `users/${uid}`));
    return snap.exists() ? { ...snap.val(), uid } : null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export async function setUserCoins(uid: string, coins: number): Promise<void> {
  await update(ref(db, `users/${uid}`), { coins });
}

export async function addCoins(uid: string, amount: number): Promise<void> {
  const coinsRef = ref(db, `users/${uid}/coins`);
  await runTransaction(coinsRef, (current: number | null) => (current ?? 0) + amount);
}

export async function banUser(uid: string, adminUid: string, reason: string, durationHours?: number): Promise<void> {
  const banUntil = durationHours ? Date.now() + durationHours * 3600 * 1000 : null;
  await update(ref(db, `users/${uid}`), {
    isBanned: true,
    banUntil,
    banReason: reason,
    bannedBy: adminUid,
  });
}

export async function unbanUser(uid: string): Promise<void> {
  await update(ref(db, `users/${uid}`), {
    isBanned: false,
    banUntil: null,
    banReason: null,
    bannedBy: null,
  });
}

export async function shadowBanUser(uid: string, enabled: boolean): Promise<void> {
  await update(ref(db, `users/${uid}`), { shadowBanned: enabled });
}

export async function deviceBanUser(uid: string, enabled: boolean): Promise<void> {
  await update(ref(db, `users/${uid}`), { deviceBanned: enabled });
}

export async function setOfficialRole(uid: string, isOfficial: boolean): Promise<void> {
  await update(ref(db, `users/${uid}`), {
    globalRole: isOfficial ? "official" : "user",
  });
}

export async function setCustomBadge(
  uid: string,
  badge: { id: string; name: string; icon: string; imageUrl?: string }
): Promise<void> {
  await update(ref(db, `users/${uid}/customBadges/${badge.id}`), badge);
}

export async function removeCustomBadge(uid: string, badgeId: string): Promise<void> {
  await remove(ref(db, `users/${uid}/customBadges/${badgeId}`));
}

export function subscribeRechargeRequests(cb: (requests: RechargeRequest[]) => void): () => void {
  const r = ref(db, "rechargeRequests");
  const listener = onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val() as Record<string, Omit<RechargeRequest, "id">>;
    const list = Object.entries(val)
      .map(([id, data]) => ({ ...data, id }))
      .sort((a, b) => b.createdAt - a.createdAt);
    cb(list);
  });
  return () => off(r, "value", listener);
}

export async function approveRechargeRequest(
  requestId: string,
  adminUid: string,
  request: RechargeRequest,
): Promise<void> {
  await update(ref(db, `rechargeRequests/${requestId}`), {
    status: "approved",
    processedAt: Date.now(),
    processedBy: adminUid,
  });
  await addCoins(request.uid, request.totalCoins);
  const id = `tx_${Date.now()}_admin`;
  await set(ref(db, `users/${request.uid}/transactions/${id}`), {
    id,
    type: "recharge",
    amount: request.totalCoins,
    description: `UPI Recharge ₹${request.inrPaid} → ${request.totalCoins} coins (Txn: ${request.transactionId})`,
    timestamp: Date.now(),
  });
}

export async function rejectRechargeRequest(
  requestId: string,
  adminUid: string,
  reason: string,
): Promise<void> {
  await update(ref(db, `rechargeRequests/${requestId}`), {
    status: "rejected",
    processedAt: Date.now(),
    processedBy: adminUid,
    rejectReason: reason || "Not approved",
  });
}

export function subscribeRooms(cb: (rooms: Room[]) => void): () => void {
  const r = ref(db, "rooms");
  onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val();
    const rooms: Room[] = Object.keys(val).map(k => ({ ...val[k], id: k }));
    rooms.sort((a, b) => b.createdAt - a.createdAt);
    cb(rooms);
  });
  return () => off(r);
}

export async function deleteRoom(roomId: string): Promise<void> {
  const roomSnap = await get(ref(db, `rooms/${roomId}`));
  if (roomSnap.exists()) {
    const hostId = roomSnap.val().hostId;
    if (hostId) {
      await update(ref(db, `users/${hostId}`), { hasRoom: false, myRoomId: null });
    }
  }
  await remove(ref(db, `rooms/${roomId}`));
  await remove(ref(db, `roomMessages/${roomId}`));
}

export async function wipeDummyRooms(): Promise<number> {
  const snap = await get(ref(db, "rooms"));
  if (!snap.exists()) return 0;
  const val = snap.val();
  let count = 0;
  const batch: Record<string, null> = {};
  for (const id of Object.keys(val)) {
    const room = val[id];
    const listeners = room.listeners || 0;
    if (listeners === 0) {
      batch[`rooms/${id}`] = null;
      batch[`roomMessages/${id}`] = null;
      count++;
    }
  }
  if (Object.keys(batch).length > 0) {
    await update(ref(db), batch);
  }
  return count;
}

export async function setMaintenanceMode(enabled: boolean, message?: string): Promise<void> {
  await set(ref(db, "appConfig/maintenance"), {
    enabled,
    message: message || "App is under maintenance. Please try again later.",
    updatedAt: Date.now(),
  });
}

export function subscribeMaintenanceMode(cb: (data: { enabled: boolean; message: string } | null) => void): () => void {
  const r = ref(db, "appConfig/maintenance");
  onValue(r, snap => {
    if (!snap.exists()) { cb(null); return; }
    cb(snap.val());
  });
  return () => off(r);
}

export async function setAutoEntryRoom(roomId: string | null): Promise<void> {
  await set(ref(db, "appConfig/autoEntryRoom"), roomId);
}

export async function getAutoEntryRoom(): Promise<string | null> {
  const snap = await get(ref(db, "appConfig/autoEntryRoom"));
  return snap.exists() ? snap.val() : null;
}

export async function sendGlobalAlert(message: string, type: GlobalAlert["type"]): Promise<void> {
  const id = `alert_${Date.now()}`;
  await set(ref(db, `appConfig/globalAlerts/${id}`), {
    id,
    message,
    type,
    createdAt: Date.now(),
    active: true,
  });
}

export function subscribeGlobalAlerts(cb: (alerts: GlobalAlert[]) => void): () => void {
  const r = ref(db, "appConfig/globalAlerts");
  onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val() as Record<string, GlobalAlert>;
    const list = Object.values(val).sort((a, b) => b.createdAt - a.createdAt);
    cb(list);
  });
  return () => off(r);
}

export async function deleteGlobalAlert(alertId: string): Promise<void> {
  await remove(ref(db, `appConfig/globalAlerts/${alertId}`));
}

export async function toggleGlobalAlert(alertId: string, active: boolean): Promise<void> {
  await update(ref(db, `appConfig/globalAlerts/${alertId}`), { active });
}

export async function setOfficialRoom(roomId: string, isOfficial: boolean): Promise<void> {
  await update(ref(db, `rooms/${roomId}`), { isOfficial });
  if (isOfficial) {
    await set(ref(db, `appConfig/officialRooms/${roomId}`), { roomId, addedAt: Date.now() });
  } else {
    await remove(ref(db, `appConfig/officialRooms/${roomId}`));
  }
}

export async function getAdminStats(): Promise<{
  totalUsers: number;
  onlineUsers: number;
  totalRooms: number;
  liveRooms: number;
  pendingRecharges: number;
  totalRecharges: number;
}> {
  const [usersSnap, roomsSnap, rechargesSnap] = await Promise.all([
    get(ref(db, "users")),
    get(ref(db, "rooms")),
    get(ref(db, "rechargeRequests")),
  ]);

  let totalUsers = 0, onlineUsers = 0;
  if (usersSnap.exists()) {
    const users = Object.values(usersSnap.val() as Record<string, UserProfile>);
    totalUsers = users.length;
    onlineUsers = users.filter(u => u.online).length;
  }

  let totalRooms = 0, liveRooms = 0;
  if (roomsSnap.exists()) {
    const rooms = Object.values(roomsSnap.val() as Record<string, Room>);
    totalRooms = rooms.length;
    liveRooms = rooms.filter(r => r.isLive).length;
  }

  let pendingRecharges = 0, totalRecharges = 0;
  if (rechargesSnap.exists()) {
    const recharges = Object.values(rechargesSnap.val() as Record<string, RechargeRequest>);
    totalRecharges = recharges.length;
    pendingRecharges = recharges.filter(r => r.status === "pending").length;
  }

  return { totalUsers, onlineUsers, totalRooms, liveRooms, pendingRecharges, totalRecharges };
}
