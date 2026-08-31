import React from "react";
import { isAnimatedFrame, getFrameColors } from "../../lib/storeService";

interface FrameAvatarProps {
  frameId: string;
  src: string;
  size?: number;
  onClick?: () => void;
}

export default function FrameAvatar({ frameId, src, size = 56, onClick }: FrameAvatarProps) {
  const colors = getFrameColors(frameId);
  if (!colors || !isAnimatedFrame(frameId)) return null;

  const wrapperSize = size + 12;

  return (
    <div
      className={`af-wrapper af-${frameId.replace("frame_", "")}`}
      style={{ width: wrapperSize, height: wrapperSize, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
    >
      <div
        className="af-ring"
        style={{
          background: `conic-gradient(${colors.primary}, ${colors.secondary}, ${colors.tertiary}, ${colors.primary})`,
        }}
      />
      <div className="af-glow" style={{
        boxShadow: `0 0 12px ${colors.primary}99, 0 0 24px ${colors.secondary}66, 0 0 36px ${colors.tertiary}44`,
      }} />
      {src?.startsWith?.("http") ? (
        <img src={src} alt="" className="af-img" onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
      ) : (
        <div className="af-img af-img-placeholder">{src && src.length <= 4 ? src : "\u{1F464}"}</div>
      )}
      <FrameOverlay frameId={frameId} colors={colors} />
    </div>
  );
}

function FrameOverlay({ frameId, colors: _colors }: { frameId: string; colors: { primary: string; secondary: string; tertiary: string } }) {
  const id = frameId.replace("frame_", "");

  if (id === "golden_crown") {
    return <div className="af-overlay af-particles af-particles-gold" />;
  }
  if (id === "fire") {
    return <div className="af-overlay af-particles af-particles-fire" />;
  }
  if (id === "angel_wings") {
    return (
      <>
        <div className="af-wing af-wing-left" />
        <div className="af-wing af-wing-right" />
      </>
    );
  }
  if (id === "dark_aura") {
    return <div className="af-overlay af-smoke" />;
  }
  if (id === "pink_love") {
    return <div className="af-overlay af-particles af-particles-hearts" />;
  }
  if (id === "electric") {
    return <div className="af-overlay af-electric-arcs" />;
  }
  if (id === "galaxy") {
    return <div className="af-overlay af-stars" />;
  }
  if (id === "diamond_royal") {
    return <div className="af-overlay af-shimmer" />;
  }
  return null;
}

interface FramePreviewProps {
  frameId: string;
  size?: number;
}

export function FramePreview({ frameId, size = 56 }: FramePreviewProps) {
  const colors = getFrameColors(frameId);
  if (!colors) return null;
  const wrapperSize = size + 12;

  return (
    <div
      className={`af-wrapper af-${frameId.replace("frame_", "")}`}
      style={{ width: wrapperSize, height: wrapperSize }}
    >
      <div
        className="af-ring"
        style={{
          background: `conic-gradient(${colors.primary}, ${colors.secondary}, ${colors.tertiary}, ${colors.primary})`,
        }}
      />
      <div className="af-glow" style={{
        boxShadow: `0 0 8px ${colors.primary}99, 0 0 16px ${colors.secondary}66`,
      }} />
      <div className="af-img af-img-placeholder" style={{ fontSize: size * 0.35 }}>
        {"\u{1F464}"}
      </div>
    </div>
  );
}
