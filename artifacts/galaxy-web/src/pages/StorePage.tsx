/**
 * StorePage – Premium ChaloTalk-style store
 * Sections: Entry Messages · Frames · Themes
 * 
 * 🔥 All items (entry, frames, themes) loaded from Firebase
 * 🔥 Uses 💎 Diamonds (falls back to coins)
 * 🔥 Items expire after 24 hours (or custom validity)
 * 🔥 Expired items auto-removed & unequipped
 * 🔥 Purchase uses direct Firebase update (reliable)
 * 🔥 Entries support imageUrl (shows image instead of emoji)
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../lib/toastContext";
import { UserProfile } from "../lib/userService";
import {
  STORE_ITEMS, StoreItem, getStoreItem,
  equipItem, unequipItem,
  getRarityColor, isAnimatedFrame, getFrameColors, getPngFramePath,
} from "../lib/storeService";
import AvatarFrame from "../components/frames/AvatarFrame";
import { ref as dbRef, onValue, off, update } from "firebase/database";
import { db } from "../lib/firebase";

// ─── Types ──────────────────────────────────────────────────
interface InventoryItem {
  itemId: string;
  purchasedAt: number;
  expiresAt: number;
  equipped: boolean;
}

interface ExtendedStoreItem extends StoreItem {
  validity?: number;
  validityType?: "day" | "month" | "year";
  gradient?: string;      // for entries
  desc?: string;          // for entries
}

interface Props {
  user: UserProfile;        // must have `diamonds` or `coins`
  onBack: () => void;
  onUpdate: (u: UserProfile) => void;
}

type Category = "entry" | "frame" | "theme";

const RARITY_LABEL: Record<string, string> = {
  common: "COMMON", rare: "RARE", epic: "EPIC", legendary: "LEGENDARY",
};

// Default entry meta (fallback if not in DB)
const DEFAULT_ENTRY_META: Record<string, { gradient: string; desc: string }> = {
  entry_lightning: { gradient: "linear-gradient(135deg,#FFD700,#FF6B35)", desc: "Electrifying entrance!" },
  entry_stars:     { gradient: "linear-gradient(135deg,#6C5CE7,#A29BFE)", desc: "Rain of stars follows you" },
  entry_phoenix:   { gradient: "linear-gradient(135deg,#FF6B35,#FF1744)", desc: "Rise from the ashes" },
  entry_galaxy:    { gradient: "linear-gradient(135deg,#0D47A1,#6C5CE7,#E040FB)", desc: "Galaxy portal opens" },
};

const computeExpiry = (validity: number = 1, type: "day" | "month" | "year" = "day"): number => {
  const now = Date.now();
  const ms = type === "day" ? validity * 24 * 60 * 60 * 1000 :
             type === "month" ? validity * 30 * 24 * 60 * 60 * 1000 :
             validity * 365 * 24 * 60 * 60 * 1000;
  return now + ms;
};

// ─── Main Component ────────────────────────────────────────
export default function StorePage({ user, onBack, onUpdate }: Props) {
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<Category>("frame");
  const [loading, setLoading] = useState<string | null>(null);
  const [preview, setPreview] = useState<StoreItem | null>(null);

  // ── Static items (only frames that are NOT dynamic?) ──
  // We combine static frames with dynamic frames.
  // For entries and themes, we only use dynamic.
  const staticFrames = STORE_ITEMS.filter(i => i.category === "frame");
  // staticEntries not used anymore because we load from DB

  // ── Dynamic items from Firebase ──
  const [dynamicEntries, setDynamicEntries] = useState<ExtendedStoreItem[]>([]);
  const [dynamicFrames, setDynamicFrames] = useState<ExtendedStoreItem[]>([]);
  const [dynamicThemes, setDynamicThemes] = useState<StoreItem[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [framesLoading, setFramesLoading] = useState(true);
  const [themesLoading, setThemesLoading] = useState(true);

  // ── Load entries ──
  useEffect(() => {
    const ref = dbRef(db, "appConfig/entries");
    const unsub = onValue(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const items: ExtendedStoreItem[] = Object.values(data).map((e: any) => ({
          id: e.id,
          name: e.name,
          category: "entry",
          rarity: e.rarity || "common",
          price: e.price || 0,
          icon: e.icon || "🎉",
          imageUrl: e.imageUrl || undefined,
          preview: e.gradient || "rgba(0,0,0,0.2)",
          enabled: e.enabled !== undefined ? e.enabled : true,
          gradient: e.gradient || "linear-gradient(135deg,#6C5CE7,#A29BFE)",
          desc: e.desc || "Special entry effect",
          validity: e.validity || 1,
          validityType: e.validityType || "day",
        }));
        setDynamicEntries(items);
      } else {
        setDynamicEntries([]);
      }
      setEntriesLoading(false);
    });
    return () => off(ref, "value", unsub);
  }, []);

  // ── Load frames ──
  useEffect(() => {
    const ref = dbRef(db, "appConfig/frames");
    const unsub = onValue(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const items: ExtendedStoreItem[] = Object.values(data).map((f: any) => ({
          id: f.id,
          name: f.name,
          category: "frame",
          rarity: f.rarity || "rare",
          price: f.price || 0,
          icon: "🖼️",
          imageUrl: f.imageUrl || undefined,
          preview: f.imageUrl || "rgba(0,0,0,0.2)",
          enabled: f.enabled !== undefined ? f.enabled : true,
          validity: f.validity || 1,
          validityType: f.validityType || "day",
        }));
        setDynamicFrames(items);
      } else {
        setDynamicFrames([]);
      }
      setFramesLoading(false);
    });
    return () => off(ref, "value", unsub);
  }, []);

  // ── Load themes ──
  useEffect(() => {
    const ref = dbRef(db, "appConfig/themes");
    const unsub = onValue(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const items: StoreItem[] = Object.values(data).map((t: any) => ({
          id: t.id,
          name: t.name,
          category: "theme",
          rarity: t.rarity || "common",
          price: t.price || 0,
          icon: t.icon || "🎨",
          imageUrl: t.imageUrl || undefined,
          preview: t.preview || "rgba(0,0,0,0.2)",
          enabled: t.enabled !== undefined ? t.enabled : true,
        }));
        setDynamicThemes(items);
      } else {
        setDynamicThemes([]);
      }
      setThemesLoading(false);
    });
    return () => off(ref, "value", unsub);
  }, []);

  // ── Combine items ──
  let items: StoreItem[] = [];
  if (activeCategory === "entry") {
    items = dynamicEntries;
  } else if (activeCategory === "frame") {
    const map = new Map<string, StoreItem>();
    staticFrames.forEach(f => map.set(f.id, f));
    dynamicFrames.forEach(f => map.set(f.id, f));
    items = Array.from(map.values());
  } else if (activeCategory === "theme") {
    items = dynamicThemes;
  }

  // ── Currency ──
  const diamonds = user.diamonds ?? user.coins ?? 0;
  let inv = (user.inventory || {}) as Record<string, InventoryItem>;

  // ── Clean expired items ──
  const cleanExpiredItems = (inv: Record<string, InventoryItem>) => {
    const now = Date.now();
    const newInv: Record<string, InventoryItem> = {};
    let changed = false;
    const unequipUpdates: Partial<UserProfile> = {};

    for (const [id, data] of Object.entries(inv)) {
      if (data.expiresAt && data.expiresAt < now) {
        changed = true;
        if (data.equipped) {
          const item = getStoreItem(id) || dynamicEntries.find(e => e.id === id) || dynamicFrames.find(f => f.id === id) || dynamicThemes.find(t => t.id === id);
          if (item) {
            if (item.category === "frame") unequipUpdates.equippedFrame = undefined;
            else if (item.category === "entry") unequipUpdates.equippedEntry = undefined;
            else if (item.category === "theme") unequipUpdates.equippedTheme = undefined;
          }
        }
        continue;
      }
      newInv[id] = data;
    }

    if (changed) {
      const userRef = dbRef(db, `users/${user.uid}`);
      const updates: any = { inventory: newInv };
      if (unequipUpdates.equippedFrame !== undefined) updates.equippedFrame = null;
      if (unequipUpdates.equippedEntry !== undefined) updates.equippedEntry = null;
      if (unequipUpdates.equippedTheme !== undefined) updates.equippedTheme = null;
      update(userRef, updates);
      return { newInv, unequipUpdates };
    }
    return { newInv: inv, unequipUpdates: {} };
  };

  const { newInv, unequipUpdates } = cleanExpiredItems(inv);
  if (newInv !== inv || Object.keys(unequipUpdates).length > 0) {
    const updatedUser = { ...user, inventory: newInv, ...unequipUpdates };
    onUpdate(updatedUser);
    inv = newInv;
  }

  // ── Purchase handler (DIRECT FIREBASE UPDATE) ──
  const handleBuy = async (item: ExtendedStoreItem) => {
    if (diamonds < item.price) {
      showToast("Not enough 💎 Diamonds!", "warning");
      return;
    }
    if (inv[item.id]) {
      showToast("Already owned!", "info");
      return;
    }
    setLoading(item.id);

    try {
      const newBalance = diamonds - item.price;
      const now = Date.now();
      let expiresAt: number;
      if (item.validity && item.validityType) {
        expiresAt = computeExpiry(item.validity, item.validityType);
      } else {
        expiresAt = computeExpiry(1, "day");
      }

      const newInv: Record<string, InventoryItem> = {
        ...inv,
        [item.id]: {
          itemId: item.id,
          purchasedAt: now,
          expiresAt: expiresAt,
          equipped: false,
        }
      };

      const userRef = dbRef(db, `users/${user.uid}`);
      const updates: any = { inventory: newInv };
      if (user.diamonds !== undefined) updates.diamonds = newBalance;
      if (user.coins !== undefined) updates.coins = newBalance;
      await update(userRef, updates);

      const updatedUser: any = { ...user, inventory: newInv };
      if (user.diamonds !== undefined) updatedUser.diamonds = newBalance;
      if (user.coins !== undefined) updatedUser.coins = newBalance;
      onUpdate(updatedUser);

      const validityText = item.validity ? `${item.validity} ${item.validityType}(s)` : "24 hours";
      showToast(`${item.name} purchased! ✨ (valid: ${validityText})`, "success");
      setPreview(null);
    } catch (error) {
      console.error("Purchase error:", error);
      showToast("Purchase failed", "error");
    } finally {
      setLoading(null);
    }
  };

  // ── Equip / Unequip ──
  const handleEquip = async (itemId: string) => {
    const item = getStoreItem(itemId) || dynamicEntries.find(e => e.id === itemId) || dynamicFrames.find(f => f.id === itemId) || dynamicThemes.find(t => t.id === itemId);
    if (!item) return;
    setLoading(itemId);
    const isEquipped = inv[itemId]?.equipped;
    try {
      if (isEquipped) {
        await unequipItem(user.uid, itemId);
        const updatedInv = { ...inv, [itemId]: { ...inv[itemId], equipped: false } };
        const upd: Partial<UserProfile> = { inventory: updatedInv };
        if (item.category === "frame") upd.equippedFrame = undefined;
        if (item.category === "entry") upd.equippedEntry = undefined;
        if (item.category === "theme") upd.equippedTheme = undefined;
        onUpdate({ ...user, ...upd });
        showToast(`${item.name} unequipped`, "info");
      } else {
        await equipItem(user.uid, itemId);
        const updatedInv = { ...inv };
        for (const [id, o] of Object.entries(updatedInv)) {
          const si = getStoreItem(o.itemId) || dynamicEntries.find(e => e.id === o.itemId) || dynamicFrames.find(f => f.id === o.itemId) || dynamicThemes.find(t => t.id === o.itemId);
          if (si?.category === item.category) updatedInv[id] = { ...o, equipped: false };
        }
        updatedInv[itemId] = { ...updatedInv[itemId], equipped: true };
        const upd: Partial<UserProfile> = { inventory: updatedInv };
        if (item.category === "frame") upd.equippedFrame = itemId;
        if (item.category === "entry") upd.equippedEntry = itemId;
        if (item.category === "theme") upd.equippedTheme = itemId;
        onUpdate({ ...user, ...upd });
        showToast(`${item.name} equipped! ✨`, "success");
      }
    } catch { showToast("Failed", "error"); }
    finally { setLoading(null); }
  };

  const isLoading = (activeCategory === "entry" && entriesLoading) || (activeCategory === "frame" && framesLoading) || (activeCategory === "theme" && themesLoading);

  // ─── Render ────────────────────────────────────────────────
  return (
    <div style={{
      background: "linear-gradient(160deg, #1A0F2E 0%, #0A0614 100%)",
      height: "100vh", width: "100%", maxWidth: 430, margin: "0 auto",
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: "'Inter', 'Poppins', sans-serif", color: "#fff",
    }}>
      {/* HEADER */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "52px 16px 14px",
        background: "linear-gradient(180deg, rgba(26,15,46,0.95) 0%, transparent 100%)",
        borderBottom: "1px solid rgba(108,92,231,0.15)",
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 22, color: "#fff", cursor: "pointer" }}>‹</button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.5 }}>✨ Galaxy Store</h2>
          <span style={{ fontSize: 10, color: "rgba(162,155,254,0.6)", fontWeight: 500 }}>Premium frames & effects</span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(255,215,0,0.08)",
          border: "1px solid rgba(255,215,0,0.2)",
          padding: "6px 12px", borderRadius: 20,
        }}>
          <span>💎</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#FFD700" }}>{diamonds.toLocaleString()}</span>
        </div>
      </div>

      {/* TABS - Entry, Frames, Themes */}
      <div style={{ display: "flex", padding: "0 16px", borderBottom: "1px solid rgba(108,92,231,0.12)" }}>
        {(["entry", "frame", "theme"] as const).map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{
            flex: 1, padding: "12px 0", border: "none", background: "transparent", cursor: "pointer",
            fontSize: 12, fontWeight: 700,
            color: activeCategory === cat ? "#A29BFE" : "rgba(162,155,254,0.35)",
            borderBottom: activeCategory === cat ? "2px solid #6C5CE7" : "2px solid transparent",
            transition: "color 0.2s",
          }}>
            {cat === "entry" ? "⚡ Entry FX" : cat === "frame" ? "🖼️ Frames" : "🎨 Themes"}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px 100px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.3)" }}>
            <div className="spinner" style={{ width: 30, height: 30, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #A29BFE", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            Loading...
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {items.map(item => {
              const invData = inv[item.id];
              const isExpired = invData?.expiresAt ? invData.expiresAt < Date.now() : false;
              return (
                <StoreCard
                  key={item.id}
                  item={item}
                  owned={!!invData}
                  equipped={!!invData?.equipped}
                  expired={isExpired}
                  userDiamonds={diamonds}
                  loading={loading === item.id}
                  onPreview={() => setPreview(item)}
                  onBuy={() => handleBuy(item as ExtendedStoreItem)}
                  onEquip={() => handleEquip(item.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      <AnimatePresence>
        {preview && (
          <PreviewModal
            item={preview}
            owned={!!inv[preview.id]}
            equipped={!!inv[preview.id]?.equipped}
            expired={inv[preview.id]?.expiresAt ? inv[preview.id].expiresAt < Date.now() : false}
            userDiamonds={diamonds}
            loading={loading === preview.id}
            userAvatar={user.avatar}
            onClose={() => setPreview(null)}
            onBuy={() => handleBuy(preview as ExtendedStoreItem)}
            onEquip={() => handleEquip(preview.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────── STORE CARD ─────────────────────── */
function StoreCard({ item, owned, equipped, expired, userDiamonds, loading, onPreview, onBuy, onEquip }: {
  item: StoreItem; owned: boolean; equipped: boolean; expired: boolean;
  userDiamonds: number; loading: boolean;
  onPreview: () => void; onBuy: () => void; onEquip: () => void;
}) {
  const rarityColor = getRarityColor(item.rarity);
  const canAfford   = userDiamonds >= item.price;
  const isOwnedAndValid = owned && !expired;

  return (
    <div style={{
      borderRadius: 18, overflow: "hidden",
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${rarityColor}28`,
      boxShadow: equipped ? `0 0 16px ${rarityColor}40, inset 0 0 20px ${rarityColor}08` : "none",
      display: "flex", flexDirection: "column",
      transition: "all 0.2s",
      opacity: expired ? 0.4 : 1,
    }}>
      <button onClick={onPreview} style={{
        height: 110, border: "none", cursor: "pointer", padding: 0,
        background: "#0a0614",
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden",
        width: "100%",
      }}>
        <FramePreviewThumb item={item} />
        <span style={{
          position: "absolute", top: 6, right: 6,
          fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 8,
          background: `${rarityColor}20`, color: rarityColor, border: `1px solid ${rarityColor}40`,
          textTransform: "uppercase", letterSpacing: 0.5,
        }}>{RARITY_LABEL[item.rarity]}</span>
        {equipped && (
          <span style={{
            position: "absolute", top: 6, left: 6,
            fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 8,
            background: "rgba(0,230,118,0.2)", color: "#00e676", border: "1px solid rgba(0,230,118,0.4)",
          }}>EQUIPPED</span>
        )}
        {expired && (
          <span style={{
            position: "absolute", bottom: 6, left: 6,
            fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 8,
            background: "rgba(255,0,0,0.2)", color: "#ff4444", border: "1px solid rgba(255,0,0,0.4)",
          }}>EXPIRED</span>
        )}
      </button>

      <div style={{ padding: "10px 10px 10px" }}>
        <p style={{ fontSize: 12, fontWeight: 800, marginBottom: 6, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
          {isOwnedAndValid ? (
            <button onClick={onEquip} disabled={loading} style={{
              flex: 1, padding: "7px 0", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 800,
              background: equipped ? "rgba(255,255,255,0.07)" : "linear-gradient(135deg,#6C5CE7,#8B7CF6)",
              color: equipped ? "rgba(255,255,255,0.5)" : "#fff",
              opacity: loading ? 0.6 : 1,
            }}>
              {loading ? "…" : equipped ? "Unequip" : "Equip"}
            </button>
          ) : expired ? (
            <span style={{ fontSize: 10, color: "#ff4444", fontWeight: 700 }}>Expired</span>
          ) : (
            <>
              <span style={{ fontSize: 11, fontWeight: 800, color: canAfford ? "#FFD700" : "rgba(255,255,255,0.3)" }}>💎 {item.price}</span>
              <button onClick={onBuy} disabled={loading || !canAfford} style={{
                padding: "7px 12px", borderRadius: 10, border: "none", cursor: canAfford ? "pointer" : "not-allowed",
                background: canAfford ? "linear-gradient(135deg,#6C5CE7,#8B7CF6)" : "rgba(255,255,255,0.06)",
                color: "#fff", fontSize: 11, fontWeight: 800, opacity: canAfford ? 1 : 0.45,
              }}>
                {loading ? "…" : "Buy"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── THUMBNAIL ──────────────────────── */
function FramePreviewThumb({ item }: { item: StoreItem }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (item.category === "entry") {
    const ext = item as ExtendedStoreItem;
    // ✅ अगर imageUrl है तो दिखाएँ, नहीं तो emoji
    if (item.imageUrl) {
      return (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0614" }}>
          {!imageLoaded && !imageError && (
            <div style={{
              width: 32, height: 32,
              border: "3px solid rgba(255,255,255,0.1)",
              borderTop: "3px solid #A29BFE",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
          )}
          {imageError && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>No preview</div>}
          <img
            src={item.imageUrl}
            alt={item.name}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              display: imageLoaded ? "block" : "none",
            }}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        </div>
      );
    }
    // Fallback to emoji + description
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 38, filter: "drop-shadow(0 0 10px rgba(255,255,255,0.5))" }}>{item.icon}</div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: 600 }}>{ext.desc || "Entry effect"}</div>
      </div>
    );
  }

  if (item.category === "theme") {
    if (item.imageUrl) {
      return (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0614" }}>
          {!imageLoaded && !imageError && (
            <div style={{
              width: 32, height: 32,
              border: "3px solid rgba(255,255,255,0.1)",
              borderTop: "3px solid #A29BFE",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
          )}
          {imageError && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>No preview</div>}
          <img
            src={item.imageUrl}
            alt={item.name}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              display: imageLoaded ? "block" : "none",
            }}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        </div>
      );
    }
    return <div style={{ fontSize: 36 }}>{item.icon}</div>;
  }

  // FRAMES
  if (item.category === "frame") {
    if (item.imageUrl) {
      return (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0614" }}>
          {!imageLoaded && !imageError && (
            <div style={{
              width: 32, height: 32,
              border: "3px solid rgba(255,255,255,0.1)",
              borderTop: "3px solid #A29BFE",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
          )}
          {imageError && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>No preview</div>}
          <img
            src={item.imageUrl}
            alt={item.name}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              display: imageLoaded ? "block" : "none",
            }}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    if (isAnimatedFrame(item.id)) {
      const colors = getFrameColors(item.id);
      if (colors) {
        return (
          <div style={{ position: "relative" }}>
            <div className={`af-wrapper af-${item.id.replace("frame_", "")}`} style={{ width: 64, height: 64 }}>
              <div className="af-ring" style={{ background: `conic-gradient(${colors.primary}, ${colors.secondary}, ${colors.tertiary}, ${colors.primary})` }} />
              <div className="af-glow" style={{ boxShadow: `0 0 10px ${colors.primary}99` }} />
              <div className="af-img af-img-placeholder" style={{ fontSize: 22 }}>👤</div>
            </div>
          </div>
        );
      }
    }
    const pngPath = getPngFramePath(item.id);
    if (pngPath) {
      return (
        <div style={{ position: "relative", width: 60, height: 60 }}>
          <div style={{ position: "absolute", inset: 8, borderRadius: "50%", background: "rgba(108,92,231,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👤</div>
          <img src={pngPath} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      );
    }
    return <span style={{ fontSize: 36 }}>{item.icon}</span>;
  }

  return <span style={{ fontSize: 36 }}>{item.icon}</span>;
}

/* ─────────────────────── PREVIEW MODAL ─────────────────────── */
function PreviewModal({ item, owned, equipped, expired, userDiamonds, loading, userAvatar, onClose, onBuy, onEquip }: {
  item: StoreItem; owned: boolean; equipped: boolean; expired: boolean;
  userDiamonds: number; loading: boolean;
  userAvatar: string;
  onClose: () => void; onBuy: () => void; onEquip: () => void;
}) {
  const rarityColor = getRarityColor(item.rarity);
  const canAfford   = userDiamonds >= item.price;
  const entryMeta   = item.category === "entry" ? (item as ExtendedStoreItem) : null;
  const [modalImageLoaded, setModalImageLoaded] = useState(false);
  const [modalImageError, setModalImageError] = useState(false);

  const isOwnedAndValid = owned && !expired;
  const isDynamicFrame = item.category === "frame" && item.imageUrl;
  const extendedItem = item as ExtendedStoreItem;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, backdropFilter: "blur(4px)" }}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 2001,
          maxWidth: 430, margin: "0 auto",
          background: "linear-gradient(180deg, #1A0F2E 0%, #0D0820 100%)",
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderTop: `1px solid ${rarityColor}40`,
          padding: "20px 20px 40px",
          boxShadow: `0 -8px 40px ${rarityColor}30`,
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 20px" }} />

        {/* Preview Area */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: 180, marginBottom: 20,
          background: item.category === "frame" && !isDynamicFrame ? "rgba(10,6,22,0.8)" : (entryMeta?.gradient || item.preview || "#0a0614"),
          borderRadius: 20, border: `1px solid ${rarityColor}30`,
          overflow: "hidden", position: "relative",
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              position: "absolute", fontSize: 14,
              left: `${10 + i * 15}%`, top: `${10 + (i % 3) * 28}%`,
              opacity: 0.4, animation: `fsSparkle ${1.5 + i * 0.3}s ease-in-out ${i * 0.2}s infinite alternate`,
              pointerEvents: "none",
            }}>✨</div>
          ))}

          {item.category === "frame" ? (
            isDynamicFrame ? (
              <div style={{ position: "relative", width: 90, height: 90, borderRadius: "50%", overflow: "hidden" }}>
                <img src={userAvatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <img src={item.imageUrl!} alt={item.name} style={{
                  position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none",
                }} onLoad={() => setModalImageLoaded(true)} onError={() => setModalImageError(true)} />
                {!modalImageLoaded && !modalImageError && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 30, height: 30, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #A29BFE", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  </div>
                )}
                {modalImageError && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)" }}>No preview</div>}
              </div>
            ) : (
              <AvatarFrame avatar={userAvatar} frameId={item.id} size={90} glow />
            )
          ) : item.category === "entry" ? (
            // ✅ Entry: show image if available else emoji
            <div style={{ textAlign: "center" }}>
              {item.imageUrl ? (
                <div style={{ width: 80, height: 80, margin: "0 auto" }}>
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    onLoad={() => setModalImageLoaded(true)}
                    onError={() => setModalImageError(true)}
                  />
                  {!modalImageLoaded && !modalImageError && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 30, height: 30, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #A29BFE", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 56, filter: `drop-shadow(0 0 20px ${rarityColor})`, animation: "giftBounce 1s ease-in-out infinite alternate" }}>
                  {item.icon}
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 13, color: "#fff", fontWeight: 700, textShadow: `0 0 12px ${rarityColor}` }}>
                {entryMeta?.desc || "Entry effect"}
              </div>
            </div>
          ) : (
            // Theme
            <div style={{ textAlign: "center" }}>
              {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: 100, height: 100, objectFit: "contain" }} /> : <div style={{ fontSize: 48 }}>{item.icon}</div>}
              <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Room Theme</div>
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: "#fff", flex: 1 }}>{item.name}</h3>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 10,
              background: `${rarityColor}18`, color: rarityColor, border: `1px solid ${rarityColor}40`,
              textTransform: "uppercase",
            }}>{RARITY_LABEL[item.rarity]}</span>
          </div>
          <p style={{ fontSize: 13, color: "rgba(162,155,254,0.6)", lineHeight: 1.5 }}>
            {item.category === "frame" ? `Premium ${item.name} frame for your avatar. Stand out in every room.`
              : item.category === "entry" ? `${entryMeta?.desc || "Special entry effect"} when you join a voice room.`
              : `Beautiful ${item.name} room theme for your personal space.`}
          </p>
          {expired && <p style={{ fontSize: 12, color: "#ff4444", fontWeight: 700, marginTop: 4 }}>⏰ Expired – purchase again to use.</p>}
          {isOwnedAndValid && !expired && (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
              ⏳ Valid for {extendedItem.validity ? `${extendedItem.validity} ${extendedItem.validityType}(s)` : "24 hours"} from purchase.
            </p>
          )}
        </div>

        {/* Actions */}
        {isOwnedAndValid ? (
          <button onClick={onEquip} disabled={loading} style={{
            width: "100%", padding: "16px 0", borderRadius: 20, border: "none", cursor: "pointer",
            background: equipped ? "rgba(255,255,255,0.08)" : `linear-gradient(135deg, ${rarityColor}, #6C5CE7)`,
            color: equipped ? "rgba(255,255,255,0.5)" : "#fff",
            fontSize: 16, fontWeight: 800, letterSpacing: 0.5,
            boxShadow: equipped ? "none" : `0 4px 20px ${rarityColor}50`,
          }}>
            {loading ? "Please wait…" : equipped ? "✓ Unequip" : "⚡ Equip Now"}
          </button>
        ) : (
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "16px 0", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: 700, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={onBuy} disabled={loading || !canAfford || expired} style={{
              flex: 2, padding: "16px 0", borderRadius: 20, border: "none", cursor: canAfford ? "pointer" : "not-allowed",
              background: canAfford ? `linear-gradient(135deg, ${rarityColor}, #6C5CE7)` : "rgba(255,255,255,0.06)",
              color: "#fff", fontSize: 15, fontWeight: 800, opacity: canAfford ? 1 : 0.5,
              boxShadow: canAfford ? `0 4px 20px ${rarityColor}50` : "none",
            }}>
              {loading ? "Buying…" : `💎 ${item.price.toLocaleString()} – Buy Now`}
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

// ─── CSS keyframes ──────────────────────────────────────────
if (!document.getElementById('store-spinner-style')) {
  const style = document.createElement('style');
  style.id = 'store-spinner-style';
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fsSparkle { 0% { opacity: 0.2; transform: scale(0.8); } 100% { opacity: 0.9; transform: scale(1.2); } }
    @keyframes giftBounce { 0% { transform: translateY(0px); } 100% { transform: translateY(-8px); } }
  `;
  document.head.appendChild(style);
}