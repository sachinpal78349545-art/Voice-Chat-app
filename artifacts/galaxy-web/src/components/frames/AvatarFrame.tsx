/**
 * AvatarFrame – unified avatar + frame component
 *
 * Frame hierarchy:
 *   0a. Official Host  (globalRole === "officialHost") — gold crown ring, custom PNG from Firebase
 *   0b. Official       (globalRole === "official")     — royal blue/silver ring, custom PNG from Firebase
 *   1.  CSS animated ring frames (FRAME_COLORS list)
 *   2.  SVG overlay frames (frame_divine_wing, frame_crystal_pink)
 *   3.  Dynamic PNG frames (appConfig/frames/{frameId})
 *   4.  Plain avatar
 */
import React, { useState, useEffect, useMemo } from "react";
import { isAnimatedFrame, getFrameColors, isPngFrame } from "../../lib/storeService";
import { ref as dbRef, get } from "firebase/database";
import { db } from "../../lib/firebase";
import DivineWingFrame from "./DivineWingFrame";
import CrystalPinkFrame from "./CrystalPinkFrame";

export interface AvatarFrameProps {
  avatar: string;
  frameId?: string;
  size?: number;
  onClick?: () => void;
  className?: string;
  glow?: boolean;
  /** "official" = Official (blue), "officialHost" = Official Host (gold) */
  globalRole?: string;
}

// ─── Global keyframes (injected once) ──────────────────────────
let _stylesInjected = false;
function injectStyles() {
  if (_stylesInjected) return;
  const style = document.createElement('style');
  style.id = 'avatar-frame-styles';
  style.textContent = `
    @keyframes ohSpin    { to { transform: rotate(360deg); } }
    @keyframes ohPulse   { 0%,100% { opacity:0.8; } 50% { opacity:1; } }
    @keyframes ohSparkle { 0%,100% { opacity:0; transform:scale(0.5); } 50% { opacity:1; transform:scale(1.2); } }
    @keyframes offSpin   { to { transform: rotate(360deg); } }
    @keyframes offPulse  { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
    @keyframes offSparkle{ 0%,100% { opacity:0; transform:scale(0.5); } 50% { opacity:1; transform:scale(1.2); } }
  `;
  document.head.appendChild(style);
  _stylesInjected = true;
}

// ─── Official frames cache ──────────────────────────────────────
let _officialFrameCache: Record<string, string | null> = {};
let _officialFrameCacheTs = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchOfficialFrames(): Promise<Record<string, string | null>> {
  if (Date.now() - _officialFrameCacheTs < CACHE_TTL) return _officialFrameCache;
  try {
    const snap = await get(dbRef(db, "appConfig/officialFrames"));
    _officialFrameCache = snap.exists() ? snap.val() : {};
  } catch {
    _officialFrameCache = {};
  }
  _officialFrameCacheTs = Date.now();
  return _officialFrameCache;
}

// ─── Main Component ─────────────────────────────────────────────
export default function AvatarFrame({
  avatar,
  frameId,
  size = 56,
  onClick,
  className = "",
  glow = false,
  globalRole,
}: AvatarFrameProps) {
  // ── Inject styles once ──
  useMemo(() => injectStyles(), []);

  const [dynamicFrameUrl, setDynamicFrameUrl] = useState<string | null>(null);
  const [officialCustomUrl, setOfficialCustomUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isOfficialHost = globalRole === "officialHost";
  const isOfficial     = globalRole === "official";
  const isAnyOfficial  = isOfficial || isOfficialHost;

  const hasCssFrame  = !!frameId && isAnimatedFrame(frameId);
  const hasSvgFrame  = !!frameId && isPngFrame(frameId);
  const colors       = hasCssFrame ? getFrameColors(frameId!) : null;
  const wrapperSize  = size + 12;
  const officialSize = size + 16;

  // ── Load custom official frame from Firebase ──
  useEffect(() => {
    if (!isAnyOfficial) return;
    const roleKey = isOfficialHost ? "officialHost" : "official";
    fetchOfficialFrames().then(f => setOfficialCustomUrl(f[roleKey] ?? null));
  }, [isOfficial, isOfficialHost]);

  // ── Load dynamic PNG frame ──
  useEffect(() => {
    if (!frameId || hasCssFrame || hasSvgFrame) {
      setDynamicFrameUrl(null);
      return;
    }
    setLoading(true);
    get(dbRef(db, `appConfig/frames/${frameId}`))
      .then(snap => {
        setDynamicFrameUrl(snap.exists() ? snap.val().imageUrl ?? null : null);
        setLoading(false);
      })
      .catch(() => {
        setDynamicFrameUrl(null);
        setLoading(false);
      });
  }, [frameId, hasCssFrame, hasSvgFrame]);

  const isDynamicFrame = !!dynamicFrameUrl && !hasCssFrame && !hasSvgFrame;

  // ── 0a. Official HOST frame (gold crown) ──
  if (isOfficialHost) {
    return buildOfficialHostFrame(avatar, officialCustomUrl, officialSize, onClick, className);
  }

  // ── 0b. Official frame (royal blue/silver) ──
  if (isOfficial) {
    return buildOfficialFrame(avatar, officialCustomUrl, officialSize, onClick, className);
  }

  // ── 1. CSS animated ring frame ──
  if (hasCssFrame && colors) {
    return buildCssFrame(avatar, frameId!, colors, wrapperSize, onClick, className);
  }

  // ── 2. SVG overlay frame ──
  if (hasSvgFrame) {
    return buildSvgFrame(avatar, frameId!, wrapperSize, size, glow, onClick, className);
  }

  // ── 3. Dynamic PNG frame ──
  if (isDynamicFrame) {
    return buildDynamicFrame(avatar, dynamicFrameUrl!, wrapperSize, size, loading, glow, onClick, className);
  }

  // ── 4. No frame ──
  return (
    <div className={className} style={{ position: "relative", width: size, height: size, flexShrink: 0, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <AvatarImg avatar={avatar} size={size} glow={glow} />
    </div>
  );
}

// ─── Builder functions ──────────────────────────────────────────

function buildOfficialHostFrame(avatar: string, customUrl: string | null, size: number, onClick?: () => void, className?: string) {
  if (customUrl) {
    return (
      <div className={className} style={{ position: "relative", width: size, height: size, flexShrink: 0, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
        <div style={{ position: "absolute", inset: 6, borderRadius: "50%", overflow: "hidden", background: "#0a0515" }}>
          <AvatarImgInner avatar={avatar} />
        </div>
        <img src={customUrl} alt="Frame" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />
        <HostBadge />
      </div>
    );
  }
  // Default gold CSS frame
  return (
    <div className={className} style={{ position: "relative", width: size, height: size, flexShrink: 0, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div style={{ position: "absolute", inset: -3, borderRadius: "50%", background: "conic-gradient(#FFD700 0deg, #FFA500 60deg, #FF8C00 100deg, #FFF3A3 140deg, #FFD700 180deg, #FFA500 240deg, #FF6B00 280deg, #FFD700 360deg)", animation: "ohSpin 3s linear infinite", filter: "blur(2px)", opacity: 0.9 }} />
      <div style={{ position: "absolute", inset: 1, borderRadius: "50%", background: "conic-gradient(#FFF8C4 0deg, #FFD700 90deg, #FFA500 180deg, #FFD700 270deg, #FFF8C4 360deg)", animation: "ohSpin 5s linear infinite reverse" }} />
      <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", fontSize: 16, zIndex: 10, filter: "drop-shadow(0 0 6px #FFD700)" }}>👑</div>
      <div style={{ position: "absolute", top: "8%",  right: "5%",  fontSize: 8, animation: "ohSparkle 1.5s ease-in-out infinite",       zIndex: 10 }}>💎</div>
      <div style={{ position: "absolute", bottom: "8%", left: "5%",  fontSize: 8, animation: "ohSparkle 1.5s ease-in-out infinite 0.5s",  zIndex: 10 }}>✨</div>
      <div style={{ position: "absolute", top: "35%", left: "-3%",  fontSize: 7, animation: "ohSparkle 2s ease-in-out infinite 1s",       zIndex: 10 }}>⭐</div>
      <div style={{ position: "absolute", top: "35%", right: "-3%", fontSize: 7, animation: "ohSparkle 2s ease-in-out infinite 0.8s",     zIndex: 10 }}>⭐</div>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: "0 0 20px #FFD70099, 0 0 40px #FFA50055, 0 0 60px #FF8C0033", animation: "ohPulse 2s ease-in-out infinite" }} />
      <div style={{ position: "absolute", inset: 6, borderRadius: "50%", overflow: "hidden", background: "#0a0515" }}>
        <AvatarImgInner avatar={avatar} />
      </div>
      <HostBadge />
    </div>
  );
}

function buildOfficialFrame(avatar: string, customUrl: string | null, size: number, onClick?: () => void, className?: string) {
  if (customUrl) {
    return (
      <div className={className} style={{ position: "relative", width: size, height: size, flexShrink: 0, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
        <div style={{ position: "absolute", inset: 6, borderRadius: "50%", overflow: "hidden", background: "#0a0515" }}>
          <AvatarImgInner avatar={avatar} />
        </div>
        <img src={customUrl} alt="Frame" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />
        <OfficialBadge />
      </div>
    );
  }
  return (
    <div className={className} style={{ position: "relative", width: size, height: size, flexShrink: 0, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div style={{ position: "absolute", inset: -2, borderRadius: "50%", background: "conic-gradient(#00BFFF 0deg, #4169E1 60deg, #9370DB 120deg, #C0C0C0 160deg, #00BFFF 200deg, #4169E1 270deg, #9370DB 310deg, #00BFFF 360deg)", animation: "offSpin 4s linear infinite", filter: "blur(2px)", opacity: 0.85 }} />
      <div style={{ position: "absolute", inset: 1, borderRadius: "50%", background: "conic-gradient(#B0C4DE 0deg, #00BFFF 90deg, #6A5ACD 180deg, #B0C4DE 270deg, #00BFFF 360deg)", animation: "offSpin 6s linear infinite reverse" }} />
      <div style={{ position: "absolute", top: "-2%", left: "50%", transform: "translateX(-50%)", fontSize: 10, animation: "offSparkle 2s ease-in-out infinite",      zIndex: 10 }}>🔷</div>
      <div style={{ position: "absolute", top: "10%", right: "2%",  fontSize: 8, animation: "offSparkle 2s ease-in-out infinite 0.7s", zIndex: 10 }}>✦</div>
      <div style={{ position: "absolute", top: "10%", left:  "2%",  fontSize: 8, animation: "offSparkle 2s ease-in-out infinite 1.4s", zIndex: 10 }}>✦</div>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: "0 0 16px #00BFFF88, 0 0 32px #4169E155, 0 0 48px #9370DB33", animation: "offPulse 3s ease-in-out infinite" }} />
      <div style={{ position: "absolute", inset: 6, borderRadius: "50%", overflow: "hidden", background: "#0a0515" }}>
        <AvatarImgInner avatar={avatar} />
      </div>
      <OfficialBadge />
    </div>
  );
}

function buildCssFrame(avatar: string, frameId: string, colors: any, size: number, onClick?: () => void, className?: string) {
  return (
    <div
      className={`af-wrapper af-${frameId.replace("frame_", "")} ${className}`}
      style={{ width: size, height: size, cursor: onClick ? "pointer" : "default", flexShrink: 0 }}
      onClick={onClick}
    >
      <div className="af-ring" style={{ background: `conic-gradient(${colors.primary}, ${colors.secondary}, ${colors.tertiary}, ${colors.primary})` }} />
      <div className="af-glow" style={{ boxShadow: `0 0 12px ${colors.primary}99, 0 0 24px ${colors.secondary}66, 0 0 36px ${colors.tertiary}44` }} />
      <AvatarImgInner avatar={avatar} />
      <FrameOverlayVfx frameId={frameId} />
    </div>
  );
}

function buildSvgFrame(avatar: string, frameId: string, wrapperSize: number, avatarSize: number, glow: boolean, onClick?: () => void, className?: string) {
  const SvgFrame = frameId === "frame_divine_wing" ? DivineWingFrame : CrystalPinkFrame;
  return (
    <div className={className} style={{ position: "relative", width: wrapperSize, height: wrapperSize, flexShrink: 0, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AvatarImg avatar={avatar} size={avatarSize} glow={glow} />
      </div>
      <SvgFrame size={wrapperSize} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
    </div>
  );
}

function buildDynamicFrame(avatar: string, url: string, wrapperSize: number, avatarSize: number, loading: boolean, glow: boolean, onClick?: () => void, className?: string) {
  return (
    <div className={className} style={{ position: "relative", width: wrapperSize, height: wrapperSize, flexShrink: 0, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: avatarSize, height: avatarSize, borderRadius: "50%", overflow: "hidden", boxShadow: glow ? "0 0 12px rgba(108,92,231,0.6)" : "none" }}>
        <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
      </div>
      {!loading && (
        <img src={url} alt="Frame" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />
      )}
      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 10 }}>⏳</span>
        </div>
      )}
    </div>
  );
}

// ─── Badges ──────────────────────────────────────────────────────
function HostBadge() {
  return (
    <div style={{ position: "absolute", bottom: -3, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg, #FFD700, #FFA500)", color: "#1a0a00", fontSize: 8, fontWeight: 900, padding: "2px 8px", borderRadius: 999, letterSpacing: "0.08em", zIndex: 10, whiteSpace: "nowrap", boxShadow: "0 2px 8px #FFD70099" }}>
      HOST
    </div>
  );
}

function OfficialBadge() {
  return (
    <div style={{ position: "absolute", bottom: -3, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg, #00BFFF, #4169E1)", color: "#fff", fontSize: 7, fontWeight: 900, padding: "2px 8px", borderRadius: 999, letterSpacing: "0.06em", zIndex: 10, whiteSpace: "nowrap", boxShadow: "0 2px 8px #00BFFF88" }}>
      OFFICIAL
    </div>
  );
}

// ─── Avatar Sub-components ──────────────────────────────────────
function AvatarImg({ avatar, size, glow }: { avatar: string; size: number; glow: boolean }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", background: "rgba(108,92,231,0.3)", boxShadow: glow ? "0 0 12px rgba(108,92,231,0.6), 0 0 24px rgba(108,92,231,0.3)" : "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {avatar && (avatar.startsWith("http") || avatar.startsWith("/")) ? (
        <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <span style={{ fontSize: size * 0.4 }}>{avatar && avatar.length <= 4 ? avatar : "👤"}</span>
      )}
    </div>
  );
}

function AvatarImgInner({ avatar }: { avatar: string }) {
  return avatar && (avatar.startsWith("http") || avatar.startsWith("/")) ? (
    <img src={avatar} alt="" className="af-img" onError={e => { const img = e.target as HTMLImageElement; img.style.display = "none"; if (img.parentElement) img.parentElement.textContent = "👤"; }} />
  ) : (
    <div className="af-img af-img-placeholder">{avatar && avatar.length <= 4 ? avatar : "👤"}</div>
  );
}

// ─── VFX Overlays ───────────────────────────────────────────────
function FrameOverlayVfx({ frameId }: { frameId: string }) {
  const id = frameId.replace("frame_", "");
  if (id === "golden_crown") return <div className="af-overlay af-particles af-particles-gold" />;
  if (id === "fire")         return <div className="af-overlay af-particles af-particles-fire" />;
  if (id === "angel_wings")  return <><div className="af-wing af-wing-left" /><div className="af-wing af-wing-right" /></>;
  if (id === "dark_aura")    return <div className="af-overlay af-smoke" />;
  if (id === "pink_love")    return <div className="af-overlay af-particles af-particles-hearts" />;
  if (id === "electric")     return <div className="af-overlay af-electric-arcs" />;
  if (id === "galaxy")       return <div className="af-overlay af-stars" />;
  if (id === "diamond_royal") return <div className="af-overlay af-shimmer" />;
  return null;
}

// ─── FramePreview (store / backpack) ──────────────────────────
export function FramePreview({ frameId, size = 56 }: { frameId: string; size?: number }) {
  const hasCssFrame = isAnimatedFrame(frameId);
  const colors = hasCssFrame ? getFrameColors(frameId) : null;
  const wrapperSize = size + 12;
  if (hasCssFrame && colors) {
    return (
      <div className={`af-wrapper af-${frameId.replace("frame_", "")}`} style={{ width: wrapperSize, height: wrapperSize, flexShrink: 0 }}>
        <div className="af-ring" style={{ background: `conic-gradient(${colors.primary}, ${colors.secondary}, ${colors.tertiary}, ${colors.primary})` }} />
        <div className="af-glow" style={{ boxShadow: `0 0 12px ${colors.primary}99, 0 0 24px ${colors.secondary}66` }} />
        <div className="af-img" style={{ background: "rgba(108,92,231,0.15)" }} />
        <FrameOverlayVfx frameId={frameId} />
      </div>
    );
  }
  return (
    <div style={{ width: wrapperSize, height: wrapperSize, borderRadius: "50%", background: "rgba(108,92,231,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: size * 0.4 }}>🖼️</span>
    </div>
  );
}