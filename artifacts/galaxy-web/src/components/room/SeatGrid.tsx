import React from "react";
import { Room, RoomSeat, cleanName } from "./types";
import { getUserRole } from "../../lib/roomService";
import AvatarFrame from "../frames/AvatarFrame";
import { Mic, Lock } from "lucide-react";

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

export default function SeatGrid({
  room,
  userUid,
  hasControl: _hasControl,
  speakingUids,
  voiceJoined,
  hashCode,
  onSeatTap,
  isOwnerSeat,
  officialUids,
  superAdminUids,
  equippedFrames,
  ghostUids,
}: SeatGridProps) {
  return (
    <div
      className="room-seat-area"
      style={{
        width: "100%",
        padding: "0 6px",
      }}
    >
      <div
        className="room-seat-grid-10"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: "16px 4px",
          padding: "12px 2px",
          justifyItems: "center",
          alignItems: "start",
          width: "100%",
          maxWidth: "430px",
          margin: "0 auto",
        }}
      >
        {Array.from({ length: 10 }, (_, i) => {
          // Seat 10 locked by default.
          // Index 9 = Seat 10.
          const lockedByDefault = [9].includes(i);

          const seat: RoomSeat = room.seats[i] || {
            index: i,
            userId: null,
            username: null,
            avatar: null,
            isMuted: false,
            isLocked: lockedByDefault,
            isSpeaking: false,
          };

          const isSpeaking = seat.userId
            ? voiceJoined
              ? speakingUids.has(
                  Math.abs(hashCode(seat.userId)) % 1000000
                )
              : speakingUids.has(i)
            : false;

          const frameId =
            seat.userId && equippedFrames
              ? equippedFrames[seat.userId]
              : undefined;

          const isGhost = seat.userId
            ? ghostUids?.has(seat.userId) || false
            : false;

          const isGhostMe =
            isGhost && seat.userId === userUid;

          const displaySeat =
            isGhost && !isGhostMe
              ? {
                  ...seat,
                  userId: null,
                  username: null,
                  avatar: null,
                }
              : seat;

          return (
            <div
              key={i}
              style={{
                opacity: isGhost
                  ? isGhostMe
                    ? 0.4
                    : 0
                  : 1,
                transition: "opacity 0.3s ease",
                width: "100%",
                minWidth: 0,
              }}
            >
              <SeatCell
                seat={displaySeat}
                seatIndex={i}
                role={
                  seat.userId
                    ? getUserRole(room, seat.userId)
                    : "user"
                }
                isMe={seat.userId === userUid}
                isSpeaking={
                  isGhost ? false : isSpeaking
                }
                isOwner={
                  isOwnerSeat
                    ? isOwnerSeat(seat)
                    : false
                }
                isOfficial={
                  seat.userId
                    ? officialUids?.has(seat.userId) || false
                    : false
                }
                isSuperAdmin={
                  seat.userId
                    ? superAdminUids?.has(seat.userId) || false
                    : false
                }
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

/* =========================================================
   SEAT CELL TYPES
========================================================= */

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

/* =========================================================
   AUDIO WAVE RING
========================================================= */

function AudioWaveRing({
  color = "cyan",
}: {
  color?: "cyan" | "gold" | "blue";
}) {
  const colors = {
    cyan: {
      ring: "rgba(190, 95, 255, 0.38)",
      bar: "rgba(220, 160, 255, 0.55)",
    },
    gold: {
      ring: "rgba(255, 215, 0, 0.45)",
      bar: "rgba(255, 215, 0, 0.58)",
    },
    blue: {
      ring: "rgba(80, 160, 255, 0.45)",
      bar: "rgba(90, 180, 255, 0.55)",
    },
  };

  const c = colors[color];

  return (
    <svg
      className="audio-wave-svg"
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: "116%",
        height: "116%",
        position: "absolute",
        top: "-8%",
        left: "-8%",
        zIndex: 1,
        pointerEvents: "none",
      }}
    >
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx="40"
          cy="40"
          r={26 + i * 4}
          fill="none"
          stroke={c.ring}
          strokeWidth={1.5 - i * 0.3}
          className={`audio-wave-ring audio-wave-ring-${i}`}
        />
      ))}

      {Array.from({ length: 12 }, (_, i) => {
        const angle =
          i * 30 * (Math.PI / 180);

        const r = 24;

        const x =
          40 + Math.cos(angle) * r;

        const y =
          40 + Math.sin(angle) * r;

        return (
          <line
            key={`bar-${i}`}
            x1={x}
            y1={y}
            x2={
              40 +
              Math.cos(angle) * (r + 5)
            }
            y2={
              40 +
              Math.sin(angle) * (r + 5)
            }
            stroke={c.bar}
            strokeWidth="1.1"
            strokeLinecap="round"
            className={`audio-bar audio-bar-${i % 4}`}
          />
        );
      })}
    </svg>
  );
}

/* =========================================================
   SEAT CELL
========================================================= */

function SeatCell({
  seat,
  seatIndex,
  role,
  isMe,
  isSpeaking,
  isOwner,
  isOfficial,
  isSuperAdmin,
  frameId,
  onTap,
}: SeatCellProps) {
  const isActive = !!seat.userId;
  const isLocked = !!seat.isLocked;

  const isSpecial =
    isOfficial || isSuperAdmin;

  const hasFrame =
    !!frameId && isActive;

  const clickable =
    (!isMe && !!seat.userId) ||
    (!seat.userId && !isLocked);

  /* =======================================================
     EXISTING SEAT CLASSES
  ======================================================= */

  const seatClass = [
    "seat-bubble",

    isSuperAdmin && isActive
      ? ""
      : hasFrame
        ? ""
        : isSpeaking
          ? "seat-speaking"
          : isActive
            ? "seat-active"
            : "seat-empty",

    isOwner &&
    isActive &&
    !hasFrame &&
    !isSuperAdmin &&
    !isMe
      ? "seat-owner"
      : "",

    isLocked
      ? "seat-locked"
      : "",

    !hasFrame &&
    !isSuperAdmin &&
    isOfficial &&
    isActive &&
    !isMe
      ? "seat-official"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="seat-cell"
      data-seat-idx={seatIndex}
      data-seat-uid={seat.userId || ""}
      style={{
        cursor: clickable
          ? "pointer"
          : "default",

        display: "flex",
        flexDirection: "column",
        alignItems: "center",

        width: "100%",
        minWidth: 0,

        userSelect: "none",
        WebkitTapHighlightColor:
          "transparent",
      }}
      onClick={onTap}
    >
      {/* ===================================================
          MAIN 10-SEAT CIRCLE
      =================================================== */}

      <div
        className="galaxy-mic-seat-wrapper"
        style={{
          width: 58,
          height: 58,
          position: "relative",

          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          flexShrink: 0,
        }}
      >
        {/* =================================================
            SUPER ADMIN RING
        ================================================= */}

        {isSuperAdmin && isActive && (
          <>
            <div
              className="sa-seat-ring"
              style={{
                width: 62,
                height: 62,
                transform:
                  "translate(-50%, -50%)",
              }}
            />

            <div
              className="sa-seat-crown"
              style={{
                fontSize: "11px",
                top: "-9px",
              }}
            >
              👑
            </div>
          </>
        )}

        {/* =================================================
            SPEAKING WAVE
        ================================================= */}

        {isSpeaking && (
          <AudioWaveRing
            color={
              isSuperAdmin
                ? "gold"
                : isOfficial
                  ? "blue"
                  : "cyan"
            }
          />
        )}

        {/* =================================================
            SPEAKING RINGS
        ================================================= */}

        {isSpeaking && (
          <div
            className={
              isSuperAdmin
                ? "speaking-ring-gold"
                : isOfficial
                  ? "speaking-ring-blue"
                  : ""
            }
          >
            <div className="speaking-ring speaking-ring-inner" />

            <div className="speaking-ring speaking-ring-outer" />
          </div>
        )}

        {/* =================================================
            USER WITH AVATAR FRAME
        ================================================= */}

        {hasFrame ? (
          <div
            className="af-seat-wrapper"
            style={{
              width: 50,
              height: 50,
              position: "relative",
              zIndex: 3,
            }}
          >
            <AvatarFrame
              avatar={
                seat.avatar || "👤"
              }
              frameId={frameId}
              size={50}
            />
          </div>
        ) : (
          /* =================================================
             NORMAL EMPTY / ACTIVE / LOCKED SEAT
          ================================================= */

          <div
            className={seatClass}
            style={{
              width: 58,
              height: 58,

              borderRadius: "50%",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              position: "relative",
              zIndex: 2,

              overflow: "hidden",

              background: isActive
                ? "rgba(70, 20, 125, 0.30)"
                : isLocked
                  ? "rgba(45, 15, 80, 0.24)"
                  : "rgba(45, 15, 90, 0.18)",

              border: isSpeaking
                ? "1.5px solid rgba(225, 180, 255, 0.85)"
                : "1.5px solid rgba(180, 85, 255, 0.48)",

              boxShadow: isSpeaking
                ? "0 0 9px rgba(190, 100, 255, 0.38)"
                : "0 0 4px rgba(170, 70, 255, 0.16)",

              transition:
                "border-color .2s ease, box-shadow .2s ease, transform .2s ease",
            }}
          >
            {/* =================================================
                LOCKED SEAT
            ================================================= */}

            {isLocked ? (
              <Lock
                size={22}
                strokeWidth={2}
                color="rgba(255,255,255,0.92)"
              />
            ) : isActive ? (
              /* =================================================
                 ACTIVE USER AVATAR
              ================================================= */

              seat.avatar &&
              (
                seat.avatar.startsWith(
                  "http"
                ) ||
                seat.avatar.startsWith("/")
              ) ? (
                <img
                  src={seat.avatar}
                  alt=""
                  className="seat-avatar-img"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                    display: "block",
                  }}
                  onError={(e) => {
                    const target =
                      e.target as HTMLImageElement;

                    target.style.display =
                      "none";

                    if (
                      target.parentElement
                    ) {
                      target.parentElement.textContent =
                        "👤";

                      target.parentElement.style.fontSize =
                        "18px";
                    }
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: "18px",
                  }}
                >
                  👤
                </span>
              )
            ) : (
              /* =================================================
                 EMPTY MIC
              ================================================= */

              <Mic
                size={27}
                strokeWidth={2.1}
                color="rgba(255,255,255,0.96)"
              />
            )}
          </div>
        )}

        {/* =================================================
            OWNER BADGE
        ================================================= */}

        {role === "owner" &&
          isActive &&
          !isSpecial && (
            <div
              className="seat-badge seat-badge-owner"
              style={{
                fontSize: "10px",
                padding: "1px",
              }}
            >
              👑
            </div>
          )}

        {/* =================================================
            ADMIN BADGE
        ================================================= */}

        {role === "admin" &&
          isActive &&
          !isSpecial && (
            <div
              className="seat-badge seat-badge-admin"
              style={{
                fontSize: "10px",
                padding: "1px",
              }}
            >
              🛡️
            </div>
          )}

        {/* =================================================
            CO-HOST BADGE
        ================================================= */}

        {seat.isCoHost &&
          role !== "owner" &&
          role !== "admin" &&
          isActive &&
          !isSpecial && (
            <div
              className="seat-badge seat-badge-cohost"
              style={{
                fontSize: "10px",
                padding: "1px",
              }}
            >
              🎖️
            </div>
          )}

        {/* =================================================
            MUTED INDICATOR
        ================================================= */}

        {isActive &&
          seat.isMuted && (
            <div
              className="seat-muted-indicator"
              style={{
                fontSize: "10px",
                width: "14px",
                height: "14px",
              }}
            >
              🔇
            </div>
          )}

        {/* =================================================
            HAND RAISED
        ================================================= */}

        {seat.handRaised && (
          <div
            className="seat-hand-raised"
            style={{
              fontSize: "10px",
            }}
          >
            ✋
          </div>
        )}
      </div>

      {/* =====================================================
          USER NAME + SEAT NUMBER
      ===================================================== */}

      <div
        className="seat-info"
        style={{
          marginTop: "5px",
          textAlign: "center",
          width: "100%",
          minWidth: 0,
        }}
      >
        {isActive &&
          seat.username && (
            <span
              className={`seat-name${
                isSuperAdmin
                  ? " seat-name-super-admin"
                  : isOfficial
                    ? " seat-name-official"
                    : ""
              }`}
              style={{
                fontSize: "10px",

                maxWidth: "58px",

                display: "block",
                margin: "0 auto",

                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",

                lineHeight: "13px",
              }}
            >
              {cleanName(
                seat.username
              )}
            </span>
          )}

        <span
          className="seat-number"
          style={{
            fontSize: "10px",
            opacity: 0.65,

            display: "block",
            marginTop: "1px",

            lineHeight: "12px",
          }}
        >
          {seatIndex + 1}
        </span>
      </div>
    </div>
  );
}