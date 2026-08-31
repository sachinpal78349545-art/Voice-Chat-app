import React from "react";

interface SuperAdminAvatarProps {
  src: string;
  userId: string;
  size?: number;
  onClick?: () => void;
}

export default function SuperAdminAvatar({ src, userId: _userId, size = 90, onClick }: SuperAdminAvatarProps) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      {src?.startsWith?.("http") ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5, background: "linear-gradient(135deg, rgba(108,92,231,0.25), rgba(108,92,231,0.1))" }}>{src && src.length <= 4 ? src : "\u{1F464}"}</div>
      )}
    </div>
  );
}
