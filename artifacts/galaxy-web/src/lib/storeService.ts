// storeService.ts
import { ref, get, update, runTransaction } from "firebase/database";
import { db } from "./firebase";
import { addTransaction } from "./userService";

const basePath = import.meta.env.BASE_URL || "/";
const frameUr1 = `${basePath}ur.1.png`;
const frameUr2 = `${basePath}ur.2.png`;

export interface StoreItem {
  id: string;
  name: string;
  icon: string;
  category: "frame" | "entry" | "theme";
  price: number;
  preview: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  imageUrl?: string; // ✅ New field for theme images
}

export interface OwnedItem {
  itemId: string;
  purchasedAt: number;
  equipped: boolean;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#8B8B8B",
  rare: "#4FC3F7",
  epic: "#AB47BC",
  legendary: "#FFD700",
};

export function getRarityColor(rarity: string): string {
  return RARITY_COLORS[rarity] || RARITY_COLORS.common;
}

export const ANIMATED_FRAME_IDS = [
  "frame_golden_crown",
  "frame_neon_glow",
  "frame_fire",
  "frame_ice_crystal",
  "frame_angel_wings",
  "frame_dark_aura",
  "frame_pink_love",
  "frame_electric",
  "frame_galaxy",
  "frame_diamond_royal",
  "fantasy_gold_frame",
] as const;

export function isAnimatedFrame(frameId: string): boolean {
  return (ANIMATED_FRAME_IDS as readonly string[]).includes(frameId);
}

export const STORE_ITEMS: StoreItem[] = [
  { id: "frame_divine_wing", name: "Divine Wing", icon: "\u{1F451}", category: "frame", price: 500000, preview: "radial-gradient(circle, #FFD700, #4169E1, #1A0F2E)", rarity: "legendary" },
  { id: "frame_crystal_pink", name: "Crystal Pink", icon: "\u{1F338}", category: "frame", price: 250000, preview: "radial-gradient(circle, #FF69B4, #C0C0C0, #1A0F2E)", rarity: "epic" },

  { id: "frame_golden_crown", name: "Golden Crown", icon: "\u{1F451}", category: "frame", price: 1000, preview: "conic-gradient(from 0deg, #FFD700, #FFA500, #FF8C00, #FFD700)", rarity: "legendary" },
  { id: "frame_neon_glow", name: "Neon Glow", icon: "\u{1F4A0}", category: "frame", price: 1000, preview: "conic-gradient(from 0deg, #00ff88, #00ffff, #8a2be2, #00ff88)", rarity: "epic" },
  { id: "frame_fire", name: "Inferno Blaze", icon: "\u{1F525}", category: "frame", price: 1000, preview: "conic-gradient(from 0deg, #ff4500, #ff8c00, #ff0000, #ff4500)", rarity: "epic" },
  { id: "frame_ice_crystal", name: "Ice Crystal", icon: "\u2744\uFE0F", category: "frame", price: 1000, preview: "conic-gradient(from 0deg, #00bfff, #e0f7fa, #4fc3f7, #00bfff)", rarity: "rare" },
  { id: "frame_angel_wings", name: "Angel Wings", icon: "\u{1F47C}", category: "frame", price: 1000, preview: "conic-gradient(from 0deg, #fff8e1, #ffe082, #ffffff, #fff8e1)", rarity: "legendary" },
  { id: "frame_dark_aura", name: "Dark Aura", icon: "\u{1F480}", category: "frame", price: 1000, preview: "conic-gradient(from 0deg, #4a0080, #1a0033, #8b00ff, #4a0080)", rarity: "epic" },
  { id: "frame_pink_love", name: "Pink Love", icon: "\u{1F495}", category: "frame", price: 1000, preview: "conic-gradient(from 0deg, #ff69b4, #ff1493, #ff85c8, #ff69b4)", rarity: "rare" },
  { id: "frame_electric", name: "Electric Storm", icon: "\u26A1", category: "frame", price: 1000, preview: "conic-gradient(from 0deg, #00e5ff, #2979ff, #651fff, #00e5ff)", rarity: "epic" },
  { id: "frame_galaxy", name: "Galaxy Vortex", icon: "\u{1F30C}", category: "frame", price: 1000, preview: "conic-gradient(from 0deg, #6a0dad, #1e90ff, #ff00ff, #6a0dad)", rarity: "legendary" },
  { id: "frame_diamond_royal", name: "Diamond Royal", icon: "\u{1F48E}", category: "frame", price: 1000, preview: "conic-gradient(from 0deg, #b9f2ff, #e0e0e0, #80deea, #b9f2ff)", rarity: "legendary" },

  // Fantasy Gold frame
  { id: "fantasy_gold_frame", name: "Fantasy Gold", icon: "👑", category: "frame", price: 800, preview: "linear-gradient(145deg, #FFD700, #FFA500)", rarity: "legendary" },

  // Entry FX
  { id: "entry_lightning", name: "Lightning Strike", icon: "\u26A1", category: "entry", price: 300, preview: "linear-gradient(135deg, #FFD700, #FF6B35)", rarity: "common" },
  { id: "entry_stars", name: "Starfall", icon: "\u2B50", category: "entry", price: 600, preview: "linear-gradient(135deg, #6C5CE7, #A29BFE)", rarity: "rare" },
  { id: "entry_phoenix", name: "Phoenix Rise", icon: "\u{1F985}", category: "entry", price: 1000, preview: "linear-gradient(135deg, #FF6B35, #FF1744)", rarity: "epic" },
  { id: "entry_galaxy", name: "Galaxy Portal", icon: "\u{1F300}", category: "entry", price: 1800, preview: "linear-gradient(135deg, #0D47A1, #6C5CE7, #E040FB)", rarity: "legendary" },

  // Themes
  { id: "theme_midnight", name: "Midnight Blue", icon: "\u{1F319}", category: "theme", price: 400, preview: "linear-gradient(180deg, #0D1B2A, #1B2838)", rarity: "common" },
  { id: "theme_sakura", name: "Sakura Garden", icon: "\u{1F338}", category: "theme", price: 700, preview: "linear-gradient(180deg, #2D1B38, #1A0F2E)", rarity: "rare" },
  { id: "theme_ocean", name: "Deep Ocean", icon: "\u{1F30A}", category: "theme", price: 700, preview: "linear-gradient(180deg, #0A1628, #0D2137)", rarity: "rare" },
  { id: "theme_volcano", name: "Volcano", icon: "\u{1F30B}", category: "theme", price: 1200, preview: "linear-gradient(180deg, #2D0A0A, #1A0505)", rarity: "epic" },
  { id: "theme_aurora", name: "Aurora Borealis", icon: "\u{1F30C}", category: "theme", price: 2500, preview: "linear-gradient(180deg, #0A2E1A, #1A0F2E, #0D1B4A)", rarity: "legendary" },

  // ✅ NEW: Cosmic Galaxy theme
  {
    id: "theme_galaxy_cosmic",
    name: "Cosmic Galaxy",
    icon: "🌌",
    category: "theme",
    price: 190,
    preview: "linear-gradient(135deg, #1a0f2e, #0a0614)",
    rarity: "rare",
    imageUrl: "https://res.cloudinary.com/dz1bhfpkc/image/upload/v1782285782/Screenshot_20260623_125325_ChatGPT_nusel5.jpg"
  },
  // ✅ NEW: Celestial Wave theme
  {
    id: "theme_celestial_wave",
    name: "Celestial Wave",
    icon: "🌊",
    category: "theme",
    price: 1440,
    preview: "linear-gradient(135deg, #0d47a1, #6c5ce7)",
    rarity: "epic",
    imageUrl: "https://res.cloudinary.com/dz1bhfpkc/image/upload/v1782285782/Screenshot_20260623_125351_ChatGPT_lg7hbl.jpg"
  },
];

export function getStoreItem(itemId: string): StoreItem | undefined {
  return STORE_ITEMS.find(i => i.id === itemId);
}

const PNG_FRAME_MAP: Record<string, string> = {
  frame_divine_wing: frameUr1,
  frame_crystal_pink: frameUr2,
};

export const DEFAULT_FRAME_ID = "frame_divine_wing";

export function getPngFramePath(frameId: string): string | null {
  return PNG_FRAME_MAP[frameId] || null;
}

export function isPngFrame(frameId: string): boolean {
  return frameId in PNG_FRAME_MAP;
}

export const FRAME_COLORS: Record<string, { primary: string; secondary: string; tertiary: string }> = {
  frame_golden_crown:  { primary: "#FFD700", secondary: "#FFA500", tertiary: "#FF8C00" },
  frame_neon_glow:     { primary: "#00ff88", secondary: "#00ffff", tertiary: "#8a2be2" },
  frame_fire:          { primary: "#ff4500", secondary: "#ff8c00", tertiary: "#ff0000" },
  frame_ice_crystal:   { primary: "#00bfff", secondary: "#e0f7fa", tertiary: "#4fc3f7" },
  frame_angel_wings:   { primary: "#fff8e1", secondary: "#ffe082", tertiary: "#ffffff" },
  frame_dark_aura:     { primary: "#8b00ff", secondary: "#4a0080", tertiary: "#1a0033" },
  frame_pink_love:     { primary: "#ff69b4", secondary: "#ff1493", tertiary: "#ff85c8" },
  frame_electric:      { primary: "#00e5ff", secondary: "#2979ff", tertiary: "#651fff" },
  frame_galaxy:        { primary: "#ff00ff", secondary: "#6a0dad", tertiary: "#1e90ff" },
  frame_diamond_royal: { primary: "#b9f2ff", secondary: "#e0e0e0", tertiary: "#80deea" },
  fantasy_gold_frame:  { primary: "#FFD700", secondary: "#FFF8C4", tertiary: "#B8860B" },
};

export function getFrameColors(frameId: string) {
  return FRAME_COLORS[frameId] || null;
}

export async function getEffectivePrice(itemId: string): Promise<number> {
  const item = getStoreItem(itemId);
  if (!item) return 0;
  try {
    const overSnap = await get(ref(db, `appConfig/storeOverrides/${itemId}`));
    if (overSnap.exists()) {
      const ov = overSnap.val();
      if (ov.price !== undefined) return ov.price;
    }
  } catch {}
  return item.price;
}

export async function isItemDisabled(itemId: string): Promise<boolean> {
  try {
    const overSnap = await get(ref(db, `appConfig/storeOverrides/${itemId}`));
    if (overSnap.exists()) {
      const ov = overSnap.val();
      return !!ov.disabled;
    }
  } catch {}
  return false;
}

export async function purchaseItem(uid: string, itemId: string, currentCoins: number): Promise<boolean> {
  const item = getStoreItem(itemId);
  if (!item) return false;

  const disabled = await isItemDisabled(itemId);
  if (disabled) return false;

  const effectivePrice = await getEffectivePrice(itemId);
  if (currentCoins < effectivePrice) return false;

  const owned = await getInventory(uid);
  if (owned.some(o => o.itemId === itemId)) return false;

  const coinsRef = ref(db, `users/${uid}/coins`);
  const result = await runTransaction(coinsRef, (c: number | null) => {
    const coins = c ?? 0;
    if (coins < effectivePrice) return undefined;
    return coins - effectivePrice;
  });

  if (!result.committed) return false;

  await update(ref(db, `users/${uid}/inventory/${itemId}`), {
    itemId,
    purchasedAt: Date.now(),
    equipped: false,
  });

  await addTransaction(uid, {
    type: "gift_sent",
    amount: -effectivePrice,
    description: `Bought ${item.name}`,
  });

  return true;
}

export async function getInventory(uid: string): Promise<OwnedItem[]> {
  const snap = await get(ref(db, `users/${uid}/inventory`));
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.values(val);
}

export async function equipItem(uid: string, itemId: string): Promise<void> {
  const item = getStoreItem(itemId);
  if (!item) return;

  const snap = await get(ref(db, `users/${uid}/inventory`));
  if (!snap.exists()) return;
  const inventory = snap.val() as Record<string, OwnedItem>;

  const updates: Record<string, unknown> = {};

  for (const [key, owned] of Object.entries(inventory)) {
    const si = getStoreItem(owned.itemId);
    if (si && si.category === item.category && owned.equipped) {
      updates[`inventory/${key}/equipped`] = false;
    }
  }

  updates[`inventory/${itemId}/equipped`] = true;

  if (item.category === "frame") {
    updates["equippedFrame"] = itemId;
  } else if (item.category === "entry") {
    updates["equippedEntry"] = itemId;
  } else if (item.category === "theme") {
    updates["equippedTheme"] = itemId;
  }

  await update(ref(db, `users/${uid}`), updates);
}

export async function unequipItem(uid: string, itemId: string): Promise<void> {
  const item = getStoreItem(itemId);
  if (!item) return;

  const updates: Record<string, unknown> = {
    [`inventory/${itemId}/equipped`]: false,
  };

  if (item.category === "frame") {
    updates["equippedFrame"] = null;
  } else if (item.category === "entry") {
    updates["equippedEntry"] = null;
  } else if (item.category === "theme") {
    updates["equippedTheme"] = null;
  }

  await update(ref(db, `users/${uid}`), updates);
}