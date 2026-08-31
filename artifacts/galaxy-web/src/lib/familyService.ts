import { ref, push, set, get, update, remove, onValue, off, runTransaction } from "firebase/database";
import { db } from "./firebase";

export interface FamilyMember {
  uid: string;
  name: string;
  avatar: string;
  role: "leader" | "elder" | "member";
  joinedAt: number;
  contribution: number;
}

export interface Family {
  id: string;
  name: string;
  icon: string;
  description: string;
  leaderId: string;
  leaderName: string;
  level: number;
  xp: number;
  maxMembers: number;
  memberCount: number;
  members: Record<string, FamilyMember>;
  totalGifts: number;
  weeklyGifts: number;
  createdAt: number;
  isRecruiting: boolean;
  minLevel: number;
  badge?: string;
  announcement?: string;
}

const FAMILY_ICONS = ["👑", "⭐", "🔥", "💎", "🌟", "🦁", "🐉", "🦅", "⚡", "🌙", "🎭", "🏆"];

export function getFamilyIcons(): string[] {
  return FAMILY_ICONS;
}

export function getFamilyMaxMembers(level: number): number {
  if (level >= 10) return 100;
  if (level >= 7) return 75;
  if (level >= 5) return 50;
  if (level >= 3) return 30;
  return 20;
}

export async function createFamily(
  leaderId: string, leaderName: string, leaderAvatar: string,
  name: string, icon: string, description: string
): Promise<string> {
  const existing = await getUserFamily(leaderId);
  if (existing) throw new Error("You are already in a family");

  const fRef = push(ref(db, "families"));
  const family: Family = {
    id: fRef.key!,
    name,
    icon,
    description,
    leaderId,
    leaderName,
    level: 1,
    xp: 0,
    maxMembers: 20,
    memberCount: 1,
    members: {
      [leaderId]: {
        uid: leaderId,
        name: leaderName,
        avatar: leaderAvatar,
        role: "leader",
        joinedAt: Date.now(),
        contribution: 0,
      },
    },
    totalGifts: 0,
    weeklyGifts: 0,
    createdAt: Date.now(),
    isRecruiting: true,
    minLevel: 1,
  };

  await set(fRef, family);
  await update(ref(db, `users/${leaderId}`), { familyId: fRef.key });
  return fRef.key!;
}

export async function joinFamily(familyId: string, uid: string, name: string, avatar: string, userLevel: number): Promise<void> {
  const existing = await getUserFamily(uid);
  if (existing) throw new Error("You are already in a family");

  const fSnap = await get(ref(db, `families/${familyId}`));
  if (!fSnap.exists()) throw new Error("Family not found");

  const family = fSnap.val() as Family;
  if (!family.isRecruiting) throw new Error("Family is not recruiting");
  if (family.memberCount >= family.maxMembers) throw new Error("Family is full");
  if (userLevel < family.minLevel) throw new Error(`Minimum level ${family.minLevel} required`);

  await update(ref(db, `families/${familyId}/members/${uid}`), {
    uid, name, avatar, role: "member", joinedAt: Date.now(), contribution: 0,
  });
  await runTransaction(ref(db, `families/${familyId}/memberCount`), (c: number | null) => (c || 0) + 1);
  await update(ref(db, `users/${uid}`), { familyId });
}

export async function leaveFamily(familyId: string, uid: string): Promise<void> {
  const fSnap = await get(ref(db, `families/${familyId}`));
  if (!fSnap.exists()) return;

  const family = fSnap.val() as Family;
  if (family.leaderId === uid) throw new Error("Leader cannot leave. Transfer leadership first.");

  await remove(ref(db, `families/${familyId}/members/${uid}`));
  await runTransaction(ref(db, `families/${familyId}/memberCount`), (c: number | null) => Math.max(0, (c || 1) - 1));
  await update(ref(db, `users/${uid}`), { familyId: null });
}

export async function promoteMember(familyId: string, uid: string, role: "elder" | "member"): Promise<void> {
  await update(ref(db, `families/${familyId}/members/${uid}`), { role });
}

export async function transferLeadership(familyId: string, currentLeaderId: string, newLeaderId: string): Promise<void> {
  const fSnap = await get(ref(db, `families/${familyId}`));
  if (!fSnap.exists()) return;
  const family = fSnap.val() as Family;
  if (family.leaderId !== currentLeaderId) throw new Error("Only the leader can transfer");

  const newLeader = family.members[newLeaderId];
  if (!newLeader) throw new Error("User is not a member");

  await update(ref(db, `families/${familyId}`), {
    leaderId: newLeaderId,
    leaderName: newLeader.name,
    [`members/${currentLeaderId}/role`]: "elder",
    [`members/${newLeaderId}/role`]: "leader",
  });
}

export async function kickMember(familyId: string, leaderId: string, uid: string): Promise<void> {
  const fSnap = await get(ref(db, `families/${familyId}`));
  if (!fSnap.exists()) return;
  const family = fSnap.val() as Family;
  if (family.leaderId !== leaderId && family.members[leaderId]?.role !== "elder") {
    throw new Error("Only leader/elder can kick");
  }
  if (uid === family.leaderId) throw new Error("Cannot kick the leader");

  await remove(ref(db, `families/${familyId}/members/${uid}`));
  await runTransaction(ref(db, `families/${familyId}/memberCount`), (c: number | null) => Math.max(0, (c || 1) - 1));
  await update(ref(db, `users/${uid}`), { familyId: null });
}

export async function addFamilyContribution(familyId: string, uid: string, coins: number): Promise<void> {
  await runTransaction(ref(db, `families/${familyId}/members/${uid}/contribution`), (c: number | null) => (c || 0) + coins);
  await runTransaction(ref(db, `families/${familyId}/totalGifts`), (c: number | null) => (c || 0) + coins);
  await runTransaction(ref(db, `families/${familyId}/weeklyGifts`), (c: number | null) => (c || 0) + coins);

  const xpRef = ref(db, `families/${familyId}/xp`);
  const xpSnap = await get(xpRef);
  const newXp = (xpSnap.val() || 0) + Math.floor(coins / 10);
  const levelRef = ref(db, `families/${familyId}/level`);
  const levelSnap = await get(levelRef);
  let level = levelSnap.val() || 1;
  let xp = newXp;
  const xpPerLevel = 5000;
  while (xp >= xpPerLevel && level < 20) { xp -= xpPerLevel; level++; }
  await update(ref(db, `families/${familyId}`), { xp, level, maxMembers: getFamilyMaxMembers(level) });
}

export async function getUserFamily(uid: string): Promise<Family | null> {
  const userSnap = await get(ref(db, `users/${uid}/familyId`));
  if (!userSnap.exists() || !userSnap.val()) return null;
  const familyId = userSnap.val();
  const fSnap = await get(ref(db, `families/${familyId}`));
  return fSnap.exists() ? (fSnap.val() as Family) : null;
}

export function subscribeFamily(familyId: string, cb: (f: Family | null) => void): () => void {
  const r = ref(db, `families/${familyId}`);
  onValue(r, snap => cb(snap.exists() ? snap.val() : null));
  return () => off(r);
}

export async function getAllFamilies(): Promise<Family[]> {
  const snap = await get(ref(db, "families"));
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.values(val) as Family[];
}

export async function searchFamilies(q: string): Promise<Family[]> {
  const all = await getAllFamilies();
  const lower = q.toLowerCase();
  return all.filter(f => f.name.toLowerCase().includes(lower) || f.description.toLowerCase().includes(lower));
}

export async function updateFamilySettings(familyId: string, leaderId: string, settings: Partial<Pick<Family, "name" | "icon" | "description" | "isRecruiting" | "minLevel" | "announcement">>): Promise<void> {
  const fSnap = await get(ref(db, `families/${familyId}`));
  if (!fSnap.exists()) return;
  if (fSnap.val().leaderId !== leaderId) throw new Error("Only leader can update settings");
  await update(ref(db, `families/${familyId}`), settings);
}

export async function deleteFamily(familyId: string, leaderId: string): Promise<void> {
  const fSnap = await get(ref(db, `families/${familyId}`));
  if (!fSnap.exists()) return;
  const family = fSnap.val() as Family;
  if (family.leaderId !== leaderId) throw new Error("Only leader can delete");

  const memberUids = Object.keys(family.members || {});
  for (const uid of memberUids) {
    await update(ref(db, `users/${uid}`), { familyId: null });
  }
  await remove(ref(db, `families/${familyId}`));
}

export async function getFamilyLeaderboard(): Promise<Family[]> {
  const all = await getAllFamilies();
  return all.sort((a, b) => b.weeklyGifts - a.weeklyGifts).slice(0, 50);
}
