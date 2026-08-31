import { ref, push, set, get, update, onValue, off, runTransaction } from "firebase/database";
import { db } from "./firebase";

export interface PKBattle {
  id: string;
  room1Id: string;
  room1Name: string;
  room1Score: number;
  room1Host: string;
  room1HostName: string;
  room1HostAvatar: string;
  room2Id: string;
  room2Name: string;
  room2Score: number;
  room2Host: string;
  room2HostName: string;
  room2HostAvatar: string;
  status: "pending" | "active" | "completed";
  duration: number;
  startedAt: number;
  endsAt: number;
  winnerId?: string;
  winnerName?: string;
  createdBy: string;
  topGifters1: PKGifter[];
  topGifters2: PKGifter[];
}

export interface PKGifter {
  uid: string;
  name: string;
  avatar: string;
  coins: number;
}

export interface PKInvite {
  id: string;
  fromRoomId: string;
  fromRoomName: string;
  fromHostId: string;
  fromHostName: string;
  toRoomId: string;
  toHostId: string;
  duration: number;
  status: "pending" | "accepted" | "rejected";
  timestamp: number;
}

const PK_DURATIONS = [
  { label: "3 min", value: 3 * 60 * 1000 },
  { label: "5 min", value: 5 * 60 * 1000 },
  { label: "10 min", value: 10 * 60 * 1000 },
  { label: "15 min", value: 15 * 60 * 1000 },
];

export function getPKDurations() { return PK_DURATIONS; }

export async function sendPKInvite(
  fromRoomId: string, fromRoomName: string, fromHostId: string, fromHostName: string,
  toRoomId: string, toHostId: string, duration: number
): Promise<string> {
  const iRef = push(ref(db, "pkInvites"));
  const invite: PKInvite = {
    id: iRef.key!,
    fromRoomId, fromRoomName, fromHostId, fromHostName,
    toRoomId, toHostId, duration,
    status: "pending",
    timestamp: Date.now(),
  };
  await set(iRef, invite);
  return iRef.key!;
}

export function subscribePKInvites(roomId: string, hostId: string, cb: (invites: PKInvite[]) => void): () => void {
  const r = ref(db, "pkInvites");
  onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val();
    const invites: PKInvite[] = Object.values(val);
    cb(invites.filter(i => i.toRoomId === roomId && i.toHostId === hostId && i.status === "pending"));
  });
  return () => off(r);
}

export async function respondPKInvite(inviteId: string, accept: boolean, room2Name: string, room2HostAvatar: string): Promise<string | null> {
  const iSnap = await get(ref(db, `pkInvites/${inviteId}`));
  if (!iSnap.exists()) return null;
  const invite = iSnap.val() as PKInvite;

  await update(ref(db, `pkInvites/${inviteId}`), { status: accept ? "accepted" : "rejected" });

  if (!accept) return null;

  const fromSnap = await get(ref(db, `rooms/${invite.fromRoomId}`));
  const fromRoom = fromSnap.exists() ? fromSnap.val() : null;

  const bRef = push(ref(db, "pkBattles"));
  const now = Date.now();
  const battle: PKBattle = {
    id: bRef.key!,
    room1Id: invite.fromRoomId,
    room1Name: invite.fromRoomName,
    room1Score: 0,
    room1Host: invite.fromHostId,
    room1HostName: invite.fromHostName,
    room1HostAvatar: fromRoom?.roomAvatar || "⭐",
    room2Id: invite.toRoomId,
    room2Name: room2Name,
    room2Score: 0,
    room2Host: invite.toHostId,
    room2HostName: "",
    room2HostAvatar: room2HostAvatar || "⭐",
    status: "active",
    duration: invite.duration,
    startedAt: now,
    endsAt: now + invite.duration,
    createdBy: invite.fromHostId,
    topGifters1: [],
    topGifters2: [],
  };

  await set(bRef, battle);
  await update(ref(db, `rooms/${invite.fromRoomId}`), { pkBattleId: bRef.key });
  await update(ref(db, `rooms/${invite.toRoomId}`), { pkBattleId: bRef.key });

  return bRef.key!;
}

export async function addPKScore(battleId: string, roomSide: 1 | 2, coins: number, gifterUid: string, gifterName: string, gifterAvatar: string): Promise<void> {
  const scoreField = roomSide === 1 ? "room1Score" : "room2Score";
  await runTransaction(ref(db, `pkBattles/${battleId}/${scoreField}`), (c: number | null) => (c || 0) + coins);

  const giftersField = roomSide === 1 ? "topGifters1" : "topGifters2";
  const snap = await get(ref(db, `pkBattles/${battleId}/${giftersField}`));
  const gifters: PKGifter[] = snap.exists() ? snap.val() : [];

  const existing = gifters.find(g => g.uid === gifterUid);
  if (existing) {
    existing.coins += coins;
  } else {
    gifters.push({ uid: gifterUid, name: gifterName, avatar: gifterAvatar, coins });
  }

  gifters.sort((a, b) => b.coins - a.coins);
  await set(ref(db, `pkBattles/${battleId}/${giftersField}`), gifters.slice(0, 10));
}

export async function endPKBattle(battleId: string): Promise<PKBattle | null> {
  const snap = await get(ref(db, `pkBattles/${battleId}`));
  if (!snap.exists()) return null;

  const battle = snap.val() as PKBattle;
  const winnerId = battle.room1Score > battle.room2Score ? battle.room1Id :
                   battle.room2Score > battle.room1Score ? battle.room2Id : "tie";
  const winnerName = winnerId === battle.room1Id ? battle.room1Name :
                     winnerId === battle.room2Id ? battle.room2Name : "Tie";

  await update(ref(db, `pkBattles/${battleId}`), {
    status: "completed", winnerId, winnerName,
  });

  await update(ref(db, `rooms/${battle.room1Id}`), { pkBattleId: null });
  await update(ref(db, `rooms/${battle.room2Id}`), { pkBattleId: null });

  return { ...battle, status: "completed", winnerId, winnerName };
}

export function subscribePKBattle(battleId: string, cb: (b: PKBattle | null) => void): () => void {
  const r = ref(db, `pkBattles/${battleId}`);
  onValue(r, snap => cb(snap.exists() ? snap.val() : null));
  return () => off(r);
}

export async function getActivePKBattles(): Promise<PKBattle[]> {
  const snap = await get(ref(db, "pkBattles"));
  if (!snap.exists()) return [];
  const battles: PKBattle[] = Object.values(snap.val());
  return battles.filter(b => b.status === "active");
}

export async function getRoomPKBattle(roomId: string): Promise<PKBattle | null> {
  const snap = await get(ref(db, "pkBattles"));
  if (!snap.exists()) return null;
  const battles: PKBattle[] = Object.values(snap.val());
  return battles.find(b => b.status === "active" && (b.room1Id === roomId || b.room2Id === roomId)) || null;
}
