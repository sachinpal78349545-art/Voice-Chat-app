// src/components/frames/FantasyFrame.tsx
import React from "react";

interface Props {
  children: React.ReactNode;
  size?: number;
  variant?: "gold" | "ruby" | "sapphire" | "emerald";
  animated?: boolean;
}

const variants = {
  gold: {
    base: "#FFD700",
    light: "#FFF8C4",
    dark: "#B8860B",
    glow: "rgba(255,215,0,0.6)",
    gradient: "linear-gradient(145deg, #FFD700, #FFA500, #FFD700)",
  },
  ruby: {
    base: "#E0115F",
    light: "#FF6B8B",
    dark: "#8B0032",
    glow: "rgba(224,17,95,0.6)",
    gradient: "linear-gradient(145deg, #E0115F, #8B0032, #E0115F)",
  },
  sapphire: {
    base: "#0F52BA",
    light: "#5D8FD5",
    dark: "#003399",
    glow: "rgba(15,82,186,0.6)",
    gradient: "linear-gradient(145deg, #0F52BA, #003399, #0F52BA)",
  },
  emerald: {
    base: "#50C878",
    light: "#90EE90",
    dark: "#006400",
    glow: "rgba(80,200,120,0.6)",
    gradient: "linear-gradient(145deg, #50C878, #006400, #50C878)",
  },
};

export default function FantasyFrame({ children, size = 90, variant = "gold", animated = true }: Props) {
  const style = variants[variant];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.2), rgba(0,0,0,0.2))",
        boxShadow: `0 0 0 2px ${style.base}, 0 0 0 5px ${style.dark}, 0 0 15px ${style.glow}`,
        transition: animated ? "box-shadow 0.3s ease, transform 0.2s" : "none",
      }}
    >
      {/* Ornate border details */}
      <div
        style={{
          position: "absolute",
          inset: -5,
          borderRadius: "50%",
          border: `1px solid ${style.light}`,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: -8,
          borderRadius: "50%",
          border: `1px dotted ${style.base}`,
          opacity: 0.4,
        }}
      />
      {/* Decorative diamonds at cardinal points */}
      {[
        { top: -10, left: "50%", transform: "translateX(-50%)" },
        { bottom: -10, left: "50%", transform: "translateX(-50%)" },
        { left: -10, top: "50%", transform: "translateY(-50%)" },
        { right: -10, top: "50%", transform: "translateY(-50%)" },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...pos,
            width: 12,
            height: 12,
            background: style.gradient,
            clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            boxShadow: `0 0 6px ${style.glow}`,
          }}
        />
      ))}
      {/* Inner circle */}
      <div
        style={{
          width: "calc(100% - 12px)",
          height: "calc(100% - 12px)",
          borderRadius: "50%",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a1a",
          border: `1px solid ${style.base}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}