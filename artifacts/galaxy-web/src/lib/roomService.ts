import { ref, set, get, update, remove, push, onValue, off, runTransaction, onDisconnect } from "firebase/database";
import { db } from "./firebase";

export interface RoomSeat {
  index: number;
  userId: string | null;
  username: string | null;
  avatar: string | null;
  isMuted: boolean;
  isLocked: boolean;
  isSpeaking: boolean;
  handRaised?: boolean;
  isCoHost?: boolean;
}

export interface RoomUser {
  uid: string;
  name: string;
  avatar: string;
  role: "owner" | "admin" | "user";
  joinedAt: number;
  seatIndex: number | null;
  isOfficial?: boolean;
  isSuperAdmin?: boolean;
}

export interface RoomMessage {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: number;
  type?: "text" | "emoji" | "gift" | "system" | "join" | "leave" | "welcome";
}

export interface Room {
  id: string;
  name: string;
  topic: string;
  host: string;
  hostId: string;
  adminIds?: string[];
  coHostIds?: string[];
  seats: RoomSeat[];
  createdAt: number;
  isLive: boolean;
  listeners: number;
  category: string;
  tags?: string[];
  coverEmoji?: string;
  roomAvatar?: string;
  isPrivate?: boolean;
  password?: string;
  micPermission?: "all" | "request" | "admin_only";
  roomLevel?: number;
  theme?: string;
  bannedUsers?: string[];
  roomUsers?: Record<string, RoomUser>;
  roomFollowers?: Record<string, { uid: string; name: string; avatar: string; followedAt: number }>;
  announcement?: string;
  enterPermission?: "everyone" | "invite_only";
  maxMics?: number;
  mode?: "voice" | "chat";
  initialGame?: string;
  country?: string;
  chatClearedAt?: number;
}

const ROOM_COVERS: Record<string, string> = {
  Chill: "\u{1F319}", Music: "\u{1F3B5}", Talk: "\u{1F4AC}", Gaming: "\u{1F3AE}",
  Comedy: "\u{1F602}", Study: "\u{1F4DA}", Debate: "\u26A1", News: "\u{1F4F0}", Sports: "\u26BD",
};

const ROOM_THEMES = [
  { id: "galaxy", name: "Galaxy", bg: "linear-gradient(160deg, #1A0F2E 0%, #0F0F1A 100%)" },
  { id: "ocean", name: "Ocean", bg: "linear-gradient(160deg, #0a192f 0%, #0d1b2a 100%)" },
  { id: "sunset", name: "Sunset", bg: "linear-gradient(160deg, #2d1b3d 0%, #1a0f1e 100%)" },
  { id: "forest", name: "Forest", bg: "linear-gradient(160deg, #0f2618 0%, #0a1a10 100%)" },
  { id: "crimson", name: "Crimson", bg: "linear-gradient(160deg, #2d0f1e 0%, #1a0a12 100%)" },
  { id: "midnight", name: "Midnight", bg: "linear-gradient(160deg, #0d0d2b 0%, #060614 100%)" },
];

export { ROOM_THEMES };

const ROOM_AVATARS = ["\u{1F3A4}", "\u{1F3B5}", "\u{1F31F}", "\u{1F680}", "\u{1F30C}", "\u{1F525}", "\u{1F3AE}", "\u{1F4AC}", "\u{1F319}", "\u{1F48E}", "\u26A1", "\u{1F451}", "\u{1F389}", "\u{1F3B6}", "\u{1F984}", "\u{1F30A}"];
export { ROOM_AVATARS };


export async function fetchRooms(): Promise<Room[]> {
  const snap = await get(ref(db, "rooms"));
  if (!snap.exists()) return [];
  const val = snap.val();
  const rooms: Room[] = Object.keys(val).map(k => {
    const room = { ...val[k], id: k };
    if (room.password) room.password = "***";
    return room;
  });
  rooms.sort((a, b) => b.createdAt - a.createdAt);
  return rooms;
}

export function subscribeRooms(cb: (rooms: Room[]) => void): () => void {
  const r = ref(db, "rooms");
  onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val();
    const rooms: Room[] = Object.keys(val).map(k => {
      const room = { ...val[k], id: k };
      if (room.password) {
        room.password = "***";
      }
      return room;
    });
    rooms.sort((a, b) => b.createdAt - a.createdAt);
    cb(rooms);
  }, err => {
    console.error("Subscribe rooms error:", err);
    cb([]);
  });
  return () => off(r);
}

export function subscribeRoom(roomId: string, cb: (room: Room | null) => void): () => void {
  const r = ref(db, `rooms/${roomId}`);
  onValue(r, snap => {
    cb(snap.exists() ? { ...snap.val(), id: roomId } : null);
  });
  return () => off(r);
}

export async function createRoom(
  userId: string, username: string, avatar: string, name: string, topic: string,
  options?: { isPrivate?: boolean; password?: string; roomAvatar?: string; micPermission?: "all" | "request" | "admin_only"; initialGame?: string }
): Promise<Room> {
  const userSnap = await get(ref(db, `users/${userId}`));
  if (userSnap.exists()) {
    const userData = userSnap.val();
    if (userData.hasRoom && userData.myRoomId) {
      const existingSnap = await get(ref(db, `rooms/${userData.myRoomId}`));
      if (existingSnap.exists()) {
        throw new Error("ALREADY_HAS_ROOM");
      }
      await update(ref(db, `users/${userId}`), { hasRoom: false, myRoomId: null });
    }
  }
  const id = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const seats: RoomSeat[] = Array.from({ length: 12 }, (_, i) => ({
    index: i,
    userId: i === 0 ? userId : null,
    username: i === 0 ? username : null,
    avatar: i === 0 ? avatar : null,
    isMuted: false,
    isLocked: false,
    isSpeaking: false,
  }));
  const ownerUser: RoomUser = { uid: userId, name: username, avatar, role: "owner", joinedAt: Date.now(), seatIndex: 0 };
  const room: Room = {
    id, name, topic, host: username, hostId: userId,
    adminIds: [], coHostIds: [], bannedUsers: [],
    seats, createdAt: Date.now(), isLive: true,
    listeners: 1, category: topic,
    coverEmoji: ROOM_COVERS[topic] || "\u{1F3A4}",
    roomAvatar: options?.roomAvatar || ROOM_COVERS[topic] || "\u{1F3A4}",
    tags: [topic.toLowerCase()],
    isPrivate: options?.isPrivate || false,
    ...(options?.password ? { password: options.password } : {}),
    micPermission: options?.micPermission || "all",
    roomLevel: 1,
    theme: "galaxy",
    ...(options?.initialGame ? { initialGame: options.initialGame } : {}),
    roomUsers: { [userId]: ownerUser },
  };
  await set(ref(db, `rooms/${id}`), room);
  await update(ref(db, `users/${userId}`), { hasRoom: true, myRoomId: id });
  return room;
}

export async function joinRoom(roomId: string, uid: string, name: string, avatar: string, password?: string, isOfficial?: boolean, isSuperAdmin?: boolean, ghostMode?: boolean): Promise<{ joined: boolean; reason?: string; needsPassword?: boolean }> {
  const roomSnap = await get(ref(db, `rooms/${roomId}`));
  if (!roomSnap.exists()) return { joined: false, reason: "Room not found" };
  const room = roomSnap.val();
  if ((room.bannedUsers || []).includes(uid) && !isSuperAdmin) return { joined: false, reason: "You are banned from this room" };
  if (!isSuperAdmin) {
    if (room.password && room.hostId !== uid && !(room.adminIds || []).includes(uid)) {
      if (!password) return { joined: false, reason: "This room requires a password", needsPassword: true };
      if (password !== room.password) return { joined: false, reason: "Incorrect password" };
    }
    if (room.isPrivate && !room.password && room.hostId !== uid && !(room.adminIds || []).includes(uid)) return { joined: false, reason: "This room is private" };
    if (room.enterPermission === "invite_only" && room.hostId !== uid && !(room.adminIds || []).includes(uid)) {
      const inv = await get(ref(db, `rooms/${roomId}/invitedUsers/${uid}`));
      if (!inv.exists()) return { joined: false, reason: "This room is invite only" };
    }
  }
  const existing = await get(ref(db, `rooms/${roomId}/roomUsers/${uid}`));
  if (existing.exists()) return { joined: true };
  const roomUser: RoomUser = { uid, name, avatar, role: "user", joinedAt: Date.now(), seatIndex: null, isOfficial: isOfficial || false, isSuperAdmin: isSuperAdmin || false, ghostMode: ghostMode || false } as any;
  if (room.hostId === uid) roomUser.role = "owner";
  else if ((room.adminIds || []).includes(uid)) roomUser.role = "admin";
  await update(ref(db, `rooms/${roomId}/roomUsers/${uid}`), roomUser);
  await runTransaction(ref(db, `rooms/${roomId}/listeners`), (c: number | null) => (c ?? 0) + 1);
  return { joined: true };
}

export async function leaveRoom(roomId: string, uid: string): Promise<void> {
  await remove(ref(db, `rooms/${roomId}/roomUsers/${uid}`));
  await runTransaction(ref(db, `rooms/${roomId}/listeners`), (c: number | null) => Math.max(0, (c ?? 0) - 1));
}

export async function joinSeat(roomId: string, seatIndex: number, userId: string, username: string, avatar: string): Promise<boolean> {
  const roomSnap = await get(ref(db, `rooms/${roomId}`));
  if (roomSnap.exists()) {
    const room = roomSnap.val();
    const maxMics = room.maxMics || 12;
    if (seatIndex >= maxMics) return false;
    const seats: RoomSeat[] = room.seats || [];
    for (let i = 0; i < seats.length; i++) {
      if (seats[i]?.userId === userId && i !== seatIndex) {
        await update(ref(db, `rooms/${roomId}/seats/${i}`), {
          userId: null, username: null, avatar: null, isMuted: false, isSpeaking: false, handRaised: false, isCoHost: false,
        });
      }
    }
    const targetSeat = seats[seatIndex];
    if (targetSeat?.userId && targetSeat.userId !== userId) return false;
    if (targetSeat?.isLocked) return false;
  }
  await update(ref(db, `rooms/${roomId}/seats/${seatIndex}`), {
    userId, username, avatar, isMuted: false, isLocked: false, isSpeaking: false, handRaised: false,
  });
  await update(ref(db, `rooms/${roomId}/roomUsers/${userId}`), { seatIndex });
  return true;
}

export async function leaveSeat(roomId: string, seatIndex: number): Promise<void> {
  const seatSnap = await get(ref(db, `rooms/${roomId}/seats/${seatIndex}`));
  const uid = seatSnap.exists() ? seatSnap.val().userId : null;
  await update(ref(db, `rooms/${roomId}/seats/${seatIndex}`), {
    userId: null, username: null, avatar: null, isMuted: false, isSpeaking: false, handRaised: false, isCoHost: false,
  });
  if (uid) {
    await update(ref(db, `rooms/${roomId}/roomUsers/${uid}`), { seatIndex: null }).catch(() => {});
  }
}

export async function toggleMuteSeat(roomId: string, seatIndex: number, muted: boolean): Promise<void> {
  await update(ref(db, `rooms/${roomId}/seats/${seatIndex}`), { isMuted: muted, isSpeaking: false });
}

export async function toggleLockSeat(roomId: string, seatIndex: number, locked: boolean): Promise<void> {
  if (locked) {
    const seatSnap = await get(ref(db, `rooms/${roomId}/seats/${seatIndex}`));
    const uid = seatSnap.exists() ? seatSnap.val().userId : null;
    await update(ref(db, `rooms/${roomId}/seats/${seatIndex}`), {
      isLocked: true, userId: null, username: null, avatar: null, isCoHost: false,
    });
    if (uid) {
      await update(ref(db, `rooms/${roomId}/roomUsers/${uid}`), { seatIndex: null }).catch(() => {});
    }
  } else {
    await update(ref(db, `rooms/${roomId}/seats/${seatIndex}`), {
      isLocked: false,
    });
  }
}

export async function raiseHand(roomId: string, seatIndex: number, raised: boolean): Promise<void> {
  await update(ref(db, `rooms/${roomId}/seats/${seatIndex}`), { handRaised: raised });
}

export async function kickFromSeat(roomId: string, seatIndex: number): Promise<void> {
  await leaveSeat(roomId, seatIndex);
}

export async function muteUserSeat(roomId: string, seatIndex: number): Promise<void> {
  await toggleMuteSeat(roomId, seatIndex, true);
}

export async function setCoHost(roomId: string, seatIndex: number, isCoHost: boolean): Promise<void> {
  const seatSnap = await get(ref(db, `rooms/${roomId}/seats/${seatIndex}`));
  if (!seatSnap.exists()) return;
  const seat = seatSnap.val();
  if (!seat.userId) return;
  await update(ref(db, `rooms/${roomId}/seats/${seatIndex}`), { isCoHost });
  const roomSnap = await get(ref(db, `rooms/${roomId}/coHostIds`));
  let coHostIds: string[] = roomSnap.exists() ? roomSnap.val() : [];
  if (isCoHost && !coHostIds.includes(seat.userId)) coHostIds.push(seat.userId);
  else if (!isCoHost) coHostIds = coHostIds.filter((id: string) => id !== seat.userId);
  await update(ref(db, `rooms/${roomId}`), { coHostIds });
}

export async function setAdmin(roomId: string, uid: string): Promise<void> {
  const roomSnap = await get(ref(db, `rooms/${roomId}/adminIds`));
  const adminIds: string[] = roomSnap.exists() ? roomSnap.val() : [];
  if (!adminIds.includes(uid)) {
    adminIds.push(uid);
    await update(ref(db, `rooms/${roomId}`), { adminIds });
  }
  await update(ref(db, `rooms/${roomId}/roomUsers/${uid}`), { role: "admin" }).catch(() => {});
}

export async function removeAdmin(roomId: string, uid: string): Promise<void> {
  const roomSnap = await get(ref(db, `rooms/${roomId}/adminIds`));
  let adminIds: string[] = roomSnap.exists() ? roomSnap.val() : [];
  adminIds = adminIds.filter((id: string) => id !== uid);
  await update(ref(db, `rooms/${roomId}`), { adminIds });
  await update(ref(db, `rooms/${roomId}/roomUsers/${uid}`), { role: "user" }).catch(() => {});
}

export async function banUser(roomId: string, uid: string): Promise<void> {
  const roomSnap = await get(ref(db, `rooms/${roomId}/bannedUsers`));
  const banned: string[] = roomSnap.exists() ? roomSnap.val() : [];
  if (!banned.includes(uid)) {
    banned.push(uid);
    await update(ref(db, `rooms/${roomId}`), { bannedUsers: banned });
  }
  const seats = (await get(ref(db, `rooms/${roomId}/seats`))).val() || [];
  for (let i = 0; i < seats.length; i++) {
    if (seats[i]?.userId === uid) {
      await leaveSeat(roomId, i);
      break;
    }
  }
  const wasPresent = await get(ref(db, `rooms/${roomId}/roomUsers/${uid}`));
  await remove(ref(db, `rooms/${roomId}/roomUsers/${uid}`));
  if (wasPresent.exists()) {
    await runTransaction(ref(db, `rooms/${roomId}/listeners`), (c: number | null) => Math.max(0, (c ?? 0) - 1));
  }
}

export async function unbanUser(roomId: string, uid: string): Promise<void> {
  const roomSnap = await get(ref(db, `rooms/${roomId}/bannedUsers`));
  let banned: string[] = roomSnap.exists() ? roomSnap.val() : [];
  banned = banned.filter((id: string) => id !== uid);
  await update(ref(db, `rooms/${roomId}`), { bannedUsers: banned });
}

export async function kickUserFromRoom(roomId: string, uid: string): Promise<void> {
  const seats = (await get(ref(db, `rooms/${roomId}/seats`))).val() || [];
  for (let i = 0; i < seats.length; i++) {
    if (seats[i]?.userId === uid) {
      await leaveSeat(roomId, i);
      break;
    }
  }
  await remove(ref(db, `rooms/${roomId}/roomUsers/${uid}`));
  await runTransaction(ref(db, `rooms/${roomId}/listeners`), (c: number | null) => Math.max(0, (c ?? 0) - 1));
}

export async function updateRoomSettings(roomId: string, settings: Partial<Pick<Room, "name" | "roomAvatar" | "coverEmoji" | "isPrivate" | "micPermission" | "theme" | "announcement" | "enterPermission" | "maxMics" | "mode" | "country">>): Promise<void> {
  await update(ref(db, `rooms/${roomId}`), settings);
}

export function isHostOrCoHost(room: Room, userId: string): boolean {
  return room.hostId === userId || (room.coHostIds || []).includes(userId);
}

export function isOwnerOrAdmin(room: Room, userId: string): boolean {
  return room.hostId === userId || (room.adminIds || []).includes(userId);
}

export function getUserRole(room: Room, userId: string): "owner" | "admin" | "user" {
  if (room.hostId === userId) return "owner";
  if ((room.adminIds || []).includes(userId)) return "admin";
  return "user";
}

export function subscribeRoomMessages(roomId: string, cb: (msgs: RoomMessage[]) => void, since = 0): () => void {
  const r = ref(db, `roomMessages/${roomId}`);
  onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val();
    const msgs: RoomMessage[] = Object.keys(val).map(k => ({ ...val[k], id: k }));
    msgs.sort((a, b) => a.timestamp - b.timestamp);
    const filtered = since > 0 ? msgs.filter(m => m.timestamp >= since) : msgs;
    cb(filtered.slice(-100));
  });
  return () => off(r);
}

export async function sendRoomMessage(roomId: string, msg: Omit<RoomMessage, "id" | "timestamp">): Promise<void> {
  const newRef = push(ref(db, `roomMessages/${roomId}`));
  await set(newRef, { ...msg, timestamp: Date.now() });
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

export async function followRoom(roomId: string, uid: string, name: string, avatar: string): Promise<void> {
  const roomSnap = await get(ref(db, `rooms/${roomId}`));
  if (!roomSnap.exists()) throw new Error("Room not found");
  await update(ref(db, `rooms/${roomId}/roomFollowers/${uid}`), { uid, name, avatar, followedAt: Date.now() });
}

export async function unfollowRoom(roomId: string, uid: string): Promise<void> {
  await remove(ref(db, `rooms/${roomId}/roomFollowers/${uid}`));
}

export function setupPresence(roomId: string, uid: string): () => void {
  const userRef = ref(db, `rooms/${roomId}/roomUsers/${uid}`);
  const listenersRef = ref(db, `rooms/${roomId}/listeners`);

  onDisconnect(userRef).remove();
  onDisconnect(listenersRef).set(null);

  const seatsCleanup: (() => void)[] = [];
  const seatsRef = ref(db, `rooms/${roomId}/seats`);
  const handler = onValue(seatsRef, snap => {
    if (!snap.exists()) return;
    const seats = snap.val();
    seatsCleanup.forEach(fn => fn());
    seatsCleanup.length = 0;
    for (let i = 0; i < 12; i++) {
      if (seats[i]?.userId === uid) {
        const seatRef = ref(db, `rooms/${roomId}/seats/${i}`);
        onDisconnect(seatRef).update({
          userId: null, username: null, avatar: null, isMuted: false, isSpeaking: false, handRaised: false, isCoHost: false,
        });
        seatsCleanup.push(() => onDisconnect(seatRef).cancel());
      }
    }
  });

  return () => {
    off(seatsRef, "value", handler);
    seatsCleanup.forEach(fn => fn());
    onDisconnect(userRef).cancel();
  };
}

export async function endRoom(roomId: string): Promise<void> {
  const roomSnap = await get(ref(db, `rooms/${roomId}`));
  if (roomSnap.exists()) {
    const hostId = roomSnap.val().hostId;
    if (hostId) {
      await update(ref(db, `users/${hostId}`), { hasRoom: false, myRoomId: null });
    }
  }
  await sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F6D1}", text: "Room has been ended by the owner", type: "system" });
  await remove(ref(db, `rooms/${roomId}`));
  await remove(ref(db, `roomMessages/${roomId}`));
}

export async function clearRoomChat(roomId: string): Promise<void> {
  await remove(ref(db, `roomMessages/${roomId}`));
  await update(ref(db, `rooms/${roomId}`), { chatClearedAt: Date.now() });
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

export async function setStoreOverrides(overrides: Record<string, { price?: number; disabled?: boolean }>): Promise<void> {
  await set(ref(db, "appConfig/storeOverrides"), overrides);
}

export async function getStoreOverrides(): Promise<Record<string, { price?: number; disabled?: boolean }>> {
  const snap = await get(ref(db, "appConfig/storeOverrides"));
  return snap.exists() ? snap.val() : {};
}

export async function setRoomSeatCount(roomId: string, count: number): Promise<void> {
  const snap = await get(ref(db, `rooms/${roomId}/seats`));
  const currentSeats: RoomSeat[] = snap.exists() ? snap.val() : [];
  if (count > currentSeats.length) {
    const newSeats = [...currentSeats];
    for (let i = currentSeats.length; i < count; i++) {
      newSeats.push({ index: i, userId: null, username: null, avatar: null, isMuted: false, isLocked: false, isSpeaking: false });
    }
    await set(ref(db, `rooms/${roomId}/seats`), newSeats);
  } else if (count < currentSeats.length) {
    const trimmed = currentSeats.slice(0, count);
    await set(ref(db, `rooms/${roomId}/seats`), trimmed);
  }
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
    if (listeners === 0 && id !== "11111") {
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

export async function joinWaitlist(roomId: string, uid: string, name: string, avatar: string): Promise<number> {
  const wRef = ref(db, `roomWaitlist/${roomId}`);
  const snap = await get(wRef);
  const list: Array<{ uid: string; name: string; avatar: string; joinedAt: number }> = snap.exists() ? Object.values(snap.val()) : [];

  if (list.find(w => w.uid === uid)) {
    return list.findIndex(w => w.uid === uid) + 1;
  }

  const entry = { uid, name, avatar, joinedAt: Date.now() };
  const newRef = push(ref(db, `roomWaitlist/${roomId}`));
  await set(newRef, entry);
  return list.length + 1;
}

export async function leaveWaitlist(roomId: string, uid: string): Promise<void> {
  const snap = await get(ref(db, `roomWaitlist/${roomId}`));
  if (!snap.exists()) return;
  const val = snap.val();
  for (const key of Object.keys(val)) {
    if (val[key].uid === uid) {
      await remove(ref(db, `roomWaitlist/${roomId}/${key}`));
      break;
    }
  }
}

export function subscribeWaitlist(roomId: string, cb: (list: Array<{ uid: string; name: string; avatar: string; joinedAt: number }>) => void): () => void {
  const r = ref(db, `roomWaitlist/${roomId}`);
  onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val();
    const list = Object.values(val) as Array<{ uid: string; name: string; avatar: string; joinedAt: number }>;
    list.sort((a: any, b: any) => a.joinedAt - b.joinedAt);
    cb(list);
  });
  return () => off(r);
}

export async function admitFromWaitlist(roomId: string, uid: string): Promise<void> {
  await leaveWaitlist(roomId, uid);
}

export async function clearWaitlist(roomId: string): Promise<void> {
  await remove(ref(db, `roomWaitlist/${roomId}`));
}

export async function setAutoEntryRoom(roomId: string, enabled: boolean): Promise<void> {
  await set(ref(db, "appConfig/autoEntryRoom"), enabled ? roomId : null);
}

export async function getAutoEntryRoom(): Promise<string | null> {
  const snap = await get(ref(db, "appConfig/autoEntryRoom"));
  return snap.exists() ? snap.val() : null;
}

export async function ensureOfficialRoom(hostUid: string, hostName: string, hostAvatar: string): Promise<Room> {
  const snap = await get(ref(db, "rooms/11111"));
  if (snap.exists()) return { ...snap.val(), id: "11111" };
  const seats: RoomSeat[] = Array.from({ length: 12 }, (_, i) => ({
    index: i, userId: i === 0 ? hostUid : null,
    username: i === 0 ? hostName : null, avatar: i === 0 ? hostAvatar : null,
    isMuted: false, isLocked: false, isSpeaking: false,
  }));
  const room: Room = {
    id: "11111", name: "New Friends Zone \u{1F91D}", topic: "Talk",
    host: hostName, hostId: hostUid, adminIds: [], coHostIds: [], bannedUsers: [],
    seats, createdAt: Date.now(), isLive: true, listeners: 0,
    category: "Talk", coverEmoji: "\u{1F91D}",
    roomAvatar: "\u{1F91D}", tags: ["official"],
    isPrivate: false, micPermission: "all",
    roomLevel: 99, theme: "galaxy",
    roomUsers: {},
  };
  await set(ref(db, "rooms/11111"), room);
  return room;
}
