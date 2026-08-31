import React, { useState } from "react";

const DEFAULT_PLACEHOLDER = "\u{1F464}";

interface AvatarImgProps {
  src: string | null | undefined;
  size: number;
  borderRadius?: number;
  style?: React.CSSProperties;
  className?: string;
}

export default function AvatarImg({ src, size, borderRadius, style, className }: AvatarImgProps) {
  const [failed, setFailed] = useState(false);
  const br = borderRadius ?? size / 2;

  if (!src || failed) {
    return (
      <span style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, fontSize: size * 0.5,
        ...style,
      }} className={className}>{DEFAULT_PLACEHOLDER}</span>
    );
  }

  if (src.startsWith("http")) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        style={{
          width: size, height: size, borderRadius: br, objectFit: "cover",
          display: "block",
          ...style,
        }}
        className={className}
      />
    );
  }

  if (src.length <= 4) {
    return (
      <span style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, fontSize: size * 0.5,
        ...style,
      }} className={className}>{src}</span>
    );
  }

  return (
    <span style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: size, height: size, fontSize: size * 0.5,
      ...style,
    }} className={className}>{DEFAULT_PLACEHOLDER}</span>
  );
}

export function isImageUrl(str: string | null | undefined): boolean {
  return !!str && str.startsWith("http");
}

export function safeAvatar(str: string | null | undefined, fallback = DEFAULT_PLACEHOLDER): string {
  if (!str) return fallback;
  if (str.startsWith("http")) return str;
  if (str.length <= 4) return str;
  return fallback;
}
