import { ref, push, set, get } from "firebase/database";
import { db } from "./firebase";

export interface GiftRecord {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  giftEmoji: string;
  coins: number;
  timestamp: number;
}

export async function recordGift(gift: Omit<GiftRecord, "id">): Promise<void> {
  const gRef = push(ref(db, "gifts"));
  await set(gRef, { ...gift, id: gRef.key });
}

export async function getGiftHistory(uid: string, limit = 50): Promise<GiftRecord[]> {
  const snap = await get(ref(db, "gifts"));
  if (!snap.exists()) return [];
  const val = snap.val();
  const gifts: GiftRecord[] = Object.keys(val)
    .map(k => ({ ...val[k], id: k }))
    .filter((g: GiftRecord) => g.senderId === uid || g.receiverId === uid)
    .sort((a: GiftRecord, b: GiftRecord) => b.timestamp - a.timestamp)
    .slice(0, limit);
  return gifts;
}

export type LeaderboardPeriod = "daily" | "weekly" | "monthly";

function getPeriodStart(period: LeaderboardPeriod): number {
  const now = new Date();
  if (period === "daily") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  } else if (period === "weekly") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff).getTime();
  } else {
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  avatar: string;
  totalCoins: number;
}

export interface MysteryBoxReward {
  emoji: string;
  name: string;
  coins: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}

const MYSTERY_BOX_POOL: MysteryBoxReward[] = [
  { emoji: "🌟", name: "Stardust", coins: 10, rarity: "common" },
  { emoji: "💫", name: "Sparkle", coins: 25, rarity: "common" },
  { emoji: "✨", name: "Glitter", coins: 50, rarity: "common" },
  { emoji: "🎵", name: "Music Note", coins: 75, rarity: "common" },
  { emoji: "🌙", name: "Moon", coins: 100, rarity: "rare" },
  { emoji: "🔮", name: "Crystal Ball", coins: 200, rarity: "rare" },
  { emoji: "🦋", name: "Butterfly", coins: 300, rarity: "rare" },
  { emoji: "🌈", name: "Rainbow", coins: 500, rarity: "epic" },
  { emoji: "👑", name: "Crown", coins: 750, rarity: "epic" },
  { emoji: "🐉", name: "Dragon", coins: 1000, rarity: "epic" },
  { emoji: "💎", name: "Diamond", coins: 2000, rarity: "legendary" },
  { emoji: "🏆", name: "Trophy", coins: 3000, rarity: "legendary" },
  { emoji: "🔱", name: "Trident", coins: 5000, rarity: "legendary" },
];

const RARITY_WEIGHTS: Record<string, number> = {
  common: 50,
  rare: 30,
  epic: 15,
  legendary: 5,
};

export const MYSTERY_BOX_COST = 100;

export function openMysteryBox(): MysteryBoxReward {
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let rand = Math.random() * totalWeight;

  let selectedRarity = "common";
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    rand -= weight;
    if (rand <= 0) { selectedRarity = rarity; break; }
  }

  const pool = MYSTERY_BOX_POOL.filter(r => r.rarity === selectedRarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getMysteryBoxPool(): MysteryBoxReward[] {
  return MYSTERY_BOX_POOL;
}

export async function getGiftLeaderboard(period: LeaderboardPeriod, type: "senders" | "receivers" = "senders"): Promise<LeaderboardEntry[]> {
  const snap = await get(ref(db, "gifts"));
  if (!snap.exists()) return [];
  const val = snap.val();
  const periodStart = getPeriodStart(period);
  const gifts: GiftRecord[] = Object.values(val);

  const map = new Map<string, { name: string; avatar: string; total: number }>();

  for (const g of gifts) {
    if (g.timestamp < periodStart) continue;
    const key = type === "senders" ? g.senderId : g.receiverId;
    const name = type === "senders" ? g.senderName : g.receiverName;
    const avatar = type === "senders" ? g.senderAvatar : g.receiverAvatar;
    const existing = map.get(key);
    if (existing) {
      existing.total += g.coins;
    } else {
      map.set(key, { name, avatar, total: g.coins });
    }
  }

  return Array.from(map.entries())
    .map(([uid, data]) => ({ uid, name: data.name, avatar: data.avatar, totalCoins: data.total }))
    .sort((a, b) => b.totalCoins - a.totalCoins)
    .slice(0, 20);
}
