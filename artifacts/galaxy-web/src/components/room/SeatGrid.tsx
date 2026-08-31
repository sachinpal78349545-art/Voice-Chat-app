import React from "react";
import { Room, RoomSeat, cleanName } from "./types";
import { getUserRole } from "../../lib/roomService";
import AvatarFrame from "../frames/AvatarFrame";

interface SeatGridProps {
  room: Room;
  userUid: string;
  hasControl: boolean;
  speakingUids: Set<number>;
  voiceJoined: boolean;
  hashCode: (s: string) => number;
  onSeatTap: (seatIndex: number, seat: RoomSeat) => void;
  isOwnerSeat?: (seat: RoomSeat) => boolean;
  officialUids?: Set<string>;
  superAdminUids?: Set<string>;
  equippedFrames?: Record<string, string>;
  ghostUids?: Set<string>;
}

export default function SeatGrid({ room, userUid, hasControl: _hasControl, speakingUids, voiceJoined, hashCode, onSeatTap, isOwnerSeat, officialUids, superAdminUids, equippedFrames, ghostUids }: SeatGridProps) {
  return (
    <div className="room-seat-area" style={{ width: "100%", padding: "0 8px" }}>
      <div 
        className="room-seat-grid-10" 
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(5, 1fr)", 
          gap: "10px 6px", 
          padding: "8px 0", 
          justifyItems: "center",
          width: "100%"
        }}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const lockedByDefault = [9].includes(i);
          const seat = room.seats[i] || { index: i, userId: null, username: null, avatar: null, isMuted: false, isLocked: lockedByDefault, isSpeaking: false };
          const isSpeaking = seat.userId
            ? (voiceJoined ? speakingUids.has(Math.abs(hashCode(seat.userId)) % 1000000) : speakingUids.has(i))
            : false;
          const frameId = seat.userId && equippedFrames ? equippedFrames[seat.userId] : undefined;
          const isGhost = seat.userId ? (ghostUids?.has(seat.userId) || false) : false;
          const isGhostMe = isGhost && seat.userId === userUid;
          return (
            <div key={i} style={{ opacity: isGhost && !isGhostMe ? 0 : isGhostMe ? 0.4 : 1, transition: "opacity 0.3s", width: "100%" }}>
              <SeatCell
                seat={isGhost && !isGhostMe ? { ...seat, userId: null, username: null, avatar: null } : seat}
                seatIndex={i}
                role={seat.userId ? getUserRole(room, seat.userId) : "user"}
                isMe={seat.userId === userUid}
                isSpeaking={isGhost ? false : isSpeaking}
                isOwner={isOwnerSeat ? isOwnerSeat(seat) : false}
                isOfficial={seat.userId ? (officialUids?.has(seat.userId) || false) : false}
                isSuperAdmin={seat.userId ? (superAdminUids?.has(seat.userId) || false) : false}
                frameId={frameId}
                onTap={() => onSeatTap(i, seat)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SeatCellProps {
  seat: RoomSeat;
  seatIndex: number;
  role: "owner" | "admin" | "user";
  isMe: boolean;
  isSpeaking: boolean;
  isOwner: boolean;
  isOfficial: boolean;
  isSuperAdmin: boolean;
  frameId?: string;
  onTap: () => void;
}

function AudioWaveRing({ color = "cyan" }: { color?: "cyan" | "gold" | "blue" }) {
  const colors = {
    cyan:  { ring: "rgba(0,255,255,0.5)", bar: "rgba(0,255,255,0.6)" },
    gold:  { ring: "rgba(255,215,0,0.5)", bar: "rgba(255,215,0,0.6)" },
    blue:  { ring: "rgba(0,206,201,0.5)", bar: "rgba(9,132,227,0.6)" },
  };
  const c = colors[color];
  return (
    <svg className="audio-wave-svg" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style={{ width: "116%", height: "116%", position: "absolute", top: "-8%", left: "-8%", zIndex: 1 }}>
      {[0, 1, 2].map(i => (
        <circle
          key={i}
          cx="40" cy="40"
          r={26 + i * 4}
          fill="none"
          stroke={c.ring}
          strokeWidth={1.5 - i * 0.3}
          className={`audio-wave-ring audio-wave-ring-${i}`}
        />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30) * (Math.PI / 180);
        const r = 24;
        const x = 40 + Math.cos(angle) * r;
        const y = 40 + Math.sin(angle) * r;
        return (
          <line
            key={`bar-${i}`}
            x1={x} y1={y}
            x2={40 + Math.cos(angle) * (r + 6)} y2={40 + Math.sin(angle) * (r + 6)}
            stroke={c.bar}
            strokeWidth="1.2"
            strokeLinecap="round"
            className={`audio-bar audio-bar-${i % 4}`}
          />
        );
      })}
    </svg>
  );
}

function SeatCell({ seat, seatIndex, role, isMe, isSpeaking, isOwner, isOfficial, isSuperAdmin, frameId, onTap }: SeatCellProps) {
  const isActive    = !!seat.userId;
  const isLocked    = seat.isLocked;
  const isSpecial   = isOfficial || isSuperAdmin;
  const hasFrame    = !!frameId && isActive;

  const seatClass = [
    "seat-bubble",
    isSuperAdmin && isActive ? "" : (hasFrame ? "" : (isSpeaking ? "seat-speaking" : isActive ? "seat-active" : "seat-empty")),
    isOwner && isActive && !hasFrame && !isSuperAdmin && !isMe ? "seat-owner" : "",
    isLocked ? "seat-locked" : "",
    !hasFrame && !isSuperAdmin && isOfficial && isActive && !isMe ? "seat-official" : "",
  ].filter(Boolean).join(" ");

  const clickable = (!isMe && seat.userId) || (!seat.userId && !isLocked);

  return (
    <div 
      className="seat-cell" 
      data-seat-idx={seatIndex} 
      data-seat-uid={seat.userId || ""} 
      style={{ 
        cursor: clickable ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%"
      }} 
      onClick={onTap}
    >
      <div className="seat-wrapper" style={{ width: 54, height: 54, position: "relative" }}>
        {isSuperAdmin && isActive && (
          <>
            <div className="sa-seat-ring" style={{ width: 58, height: 58, transform: "translate(-50%, -50%)" }} />
            <div className="sa-seat-crown" style={{ fontSize: "11px", top: "-10px" }}>{"\u{1F451}"}</div>
          </>
        )}
        {isSpeaking && <AudioWaveRing color={isSuperAdmin ? "gold" : isOfficial ? "blue" : "cyan"} />}
        {isSpeaking && (
          <div className={isSuperAdmin ? "speaking-ring-gold" : isOfficial ? "speaking-ring-blue" : ""}>
            <div className="speaking-ring speaking-ring-inner" />
            <div className="speaking-ring speaking-ring-outer" />
          </div>
        )}

        {/* Avatar + Frame — uses AvatarFrame when frame equipped, else plain seat bubble */}
        {hasFrame ? (
          <div className="af-seat-wrapper">
            <AvatarFrame
              avatar={seat.avatar || "👤"}
              frameId={frameId}
              size={44}
            />
          </div>
        ) : (
          <div className={seatClass} style={{ width: "100%", height: "100%", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {isLocked ? (
              <span className="seat-locked-icon" style={{ fontSize: "12px" }}>{"\u{1F512}"}</span>
            ) : isActive ? (
              seat.avatar && (seat.avatar.startsWith("http") || seat.avatar.startsWith("/")) ? (
                <img src={seat.avatar} alt="" className="seat-avatar-img"
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                  onError={e => {
                    const t = e.target as HTMLImageElement;
                    t.style.display = "none";
                    if (t.parentElement) { t.parentElement.textContent = "👤"; t.parentElement.style.fontSize = "16px"; }
                  }}
                />
              ) : (
                <span style={{ fontSize: "16px" }}>👤</span>
              )
            ) : (
              <span className="seat-empty-plus" style={{ fontSize: "16px" }}>+</span>
            )}
          </div>
        )}

        {/* ✅ REMOVED: super_admin_badge.svg and official_badge_new.png – no more broken boxes */}
        {role === "owner" && isActive && !isSpecial && (
          <div className="seat-badge seat-badge-owner" style={{ fontSize: "10px", padding: "1px" }}>{"\u{1F451}"}</div>
        )}
        {role === "admin" && isActive && !isSpecial && (
          <div className="seat-badge seat-badge-admin" style={{ fontSize: "10px", padding: "1px" }}>{"\u{1F6E1}\uFE0F"}</div>
        )}
        {seat.isCoHost && role !== "owner" && role !== "admin" && isActive && !isSpecial && (
          <div className="seat-badge seat-badge-cohost" style={{ fontSize: "10px", padding: "1px" }}>{"\u{1F396}\uFE0F"}</div>
        )}
        {isActive && seat.isMuted && (
          <div className="seat-muted-indicator" style={{ fontSize: "10px", width: "14px", height: "14px" }}>{"\u{1F507}"}</div>
        )}
        {seat.handRaised && (
          <div className="seat-hand-raised" style={{ fontSize: "10px" }}>{"\u270B"}</div>
        )}
      </div>

      <div className="seat-info" style={{ marginTop: "4px", textAlign: "center", width: "100%" }}>
        {isActive && seat.username && (
          <span 
            className={`seat-name${isSuperAdmin ? " seat-name-super-admin" : isOfficial ? " seat-name-official" : ""}`}
            style={{ 
              fontSize: "10px", 
              maxWidth: "54px", 
              display: "block", 
              overflow: "hidden", 
              textOverflow: "ellipsis", 
              whiteSpace: "nowrap" 
            }}
          >
            {cleanName(seat.username)}
          </span>
        )}
        <span className="seat-number" style={{ fontSize: "9px", opacity: 0.6 }}>{seatIndex + 1}</span>
      </div>
    </div>
  );
}