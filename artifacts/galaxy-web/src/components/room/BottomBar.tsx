import React, { useState, useRef, useEffect } from "react";
import { Room, UserProfile } from "./types";
import { Mic, MicOff, Gift, MoreHorizontal, Send, ChevronDown, X } from "lucide-react";
import GiftPanel from "../gifts/GiftPanel";
import { LiveGift } from "../gifts/giftTypes";
import GameHub from "./GameHub"; // 👈 Import GameHub

const EMOJIS    = ["❤️","🔥","✨","😂","🎵","👏","🌟","💯","🚀","😍","🎉","💎"];

interface BottomBarProps {
  room: Room;
  user: UserProfile;
  inputText: string;
  setInputText: (v: string) => void;
  isMuted: boolean;
  isSpeakerOff: boolean;
  isOnSeat: boolean;
  onSendChat: () => void;
  onSendEmoji: (emoji: string) => void;
  onHandleGift: (gift: { emoji: string; name: string; cost: number; url?: string; animationType?: string; soundUrl?: string }, combo: number) => void;
  onHandleReaction: (emoji: string) => void;
  onMicToggle: () => void;
  onSpeakerToggle: () => void;
  onRaiseHand: () => void;
  onShare: () => void;
  showToast: (msg: string, type?: string, icon?: string) => void;
  onOpenMenu?: () => void;
  onOpenInbox?: () => void;
  inboxBadge?: number;
  onFloatEmoji?: (emoji: string) => void;
  className?: string;
  // 👇 नए props – games menu के लिए
  hasControl?: boolean;
  onSelectGame?: (game: string) => void;
  onCloseMenu?: () => void;
}

export default function BottomBar({
  user,
  isMuted, isOnSeat,
  inputText, setInputText, onSendChat,
  onSendEmoji, onHandleGift, onHandleReaction,
  onMicToggle,
  className = "",
  showToast,
  hasControl = false,
  onSelectGame,
  onCloseMenu,
}: BottomBarProps) {
  const [showEmoji,      setShowEmoji]      = useState(false);
  const [showGift,       setShowGift]       = useState(false);
  const [showMenu,       setShowMenu]       = useState(false); // 👈 showMenu instead of showReactions
  const [inputOpen,      setInputOpen]      = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const diff = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(diff > 100 ? diff : 0);
      }
    };
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    return () => window.visualViewport?.removeEventListener("resize", handleViewportChange);
  }, []);

  useEffect(() => {
    if (inputOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [inputOpen]);

  const closeAllPopups = () => {
    setShowEmoji(false);
    setShowGift(false);
    setShowMenu(false);
  };

  const micActive = isOnSeat && !isMuted;

  const RoundBtn = ({
    icon, onClick, active = false, size = 38, color = "purple",
  }: {
    icon: React.ReactNode; onClick?: () => void;
    active?: boolean; size?: number;
    color?: "purple" | "pink" | "amber" | "muted" | "cyan";
  }) => {
    const bg: Record<string, string> = {
      purple: "radial-gradient(circle at 30% 25%, #c4b5fd, #7c3aed 60%, #4c1d95)",
      pink:   "radial-gradient(circle at 30% 25%, #ffc1d9, #ec4899 55%, #9d174d)",
      muted:  "rgba(255,255,255,0.08)",
    };
    return (
      <button onClick={onClick} style={{
        width: size, height: size, borderRadius: size / 2,
        background: bg[color] || bg.muted,
        border: `1.5px solid ${active ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)"}`,
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", padding: 0, transition: "transform 0.1s",
      }}>
        {icon}
      </button>
    );
  };

  // ── Menu open/close handlers ──
  const handleMenuToggle = () => {
    if (showMenu) {
      setShowMenu(false);
      if (onCloseMenu) onCloseMenu();
    } else {
      setShowMenu(true);
      // close other popups
      setShowEmoji(false);
      setShowGift(false);
    }
  };

  const handleGameSelect = (game: string) => {
    setShowMenu(false);
    if (onSelectGame) onSelectGame(game);
  };

  return (
    <>
      {/* Backdrop for popups */}
      {(showGift || showEmoji || showMenu) && (
        <div onClick={closeAllPopups}
          style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.2)" }} />
      )}

      {/* ── BOTTOM CONTROL BAR ── */}
      <div className={className} style={{
        position: "fixed",
        bottom: `${keyboardHeight}px`,
        left: 0, right: 0,
        maxWidth: 480, margin: "0 auto",
        zIndex: 1000,
        background: keyboardHeight > 0
          ? "rgba(20,12,38,0.98)"
          : "linear-gradient(180deg,transparent 0%,rgba(10,6,25,0.92) 45%,rgba(8,4,18,0.98) 100%)",
        backdropFilter: "blur(14px)",
        padding: keyboardHeight > 0 ? "10px 12px" : "10px 12px 20px",
        transition: "bottom 0.1s ease-out",
        overscrollBehavior: "none",
        touchAction: "none",
      }}>
        {/* Autofill prevention */}
        <div style={{ opacity: 0, position: "absolute", height: 0, width: 0, overflow: "hidden" }}>
          <input type="text"     name="prevent_autofill_user" tabIndex={-1} />
          <input type="password" name="prevent_autofill_pass" tabIndex={-1} />
        </div>

        {/* Chat input */}
        {(inputOpen || keyboardHeight > 0) && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
            background: "rgba(255,255,255,0.12)", borderRadius: 24,
            border: "1px solid rgba(124,58,237,0.3)", padding: "5px 5px 5px 14px",
          }}>
            <input
              ref={inputRef}
              placeholder="Say something…"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              type="search"
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              name={`chat-${Math.random()}`}
              onKeyDown={e => { if (e.key === "Enter") { onSendChat(); setInputOpen(false); } }}
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: 14, WebkitAppearance: "none" as const }}
            />
            <button
              onClick={() => { onSendChat(); setInputOpen(false); }}
              style={{
                width: 36, height: 36, borderRadius: 18, border: "none",
                background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Send size={15} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Controls row */}
        {keyboardHeight === 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Chat input trigger */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
              <button
                onClick={() => { closeAllPopups(); setInputOpen(s => !s); }}
                style={{
                  flex: 1, height: 42, borderRadius: 21,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", padding: "0 14px", gap: 8,
                }}
              >
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Say something…</span>
              </button>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RoundBtn
                icon={<Gift size={20} />}
                onClick={() => { const n = !showGift; closeAllPopups(); if (n) setShowGift(true); }}
                active={showGift}
                color="pink"
              />

              <button
                onClick={onMicToggle}
                style={{
                  width: 52, height: 52, borderRadius: 26,
                  background: micActive
                    ? "radial-gradient(circle at 30% 25%, #86efac, #22c55e 55%, #14532d)"
                    : "radial-gradient(circle at 30% 25%, #fca5a5, #ef4444 55%, #7f1d1d)",
                  border: "2px solid rgba(255,255,255,0.2)",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: micActive ? "0 0 15px rgba(34,197,94,0.3)" : "none",
                }}
              >
                {micActive ? <Mic size={22} strokeWidth={2.5} /> : <MicOff size={22} strokeWidth={2.5} />}
              </button>

              {/* ── 3‑Dot Button ── opens Games Menu ── */}
              <RoundBtn
                icon={<MoreHorizontal size={20} />}
                onClick={handleMenuToggle}
                active={showMenu}
                color="muted"
              />
            </div>
          </div>
        )}
      </div>

      {keyboardHeight === 0 && (
        <>
          {/* Emoji popup (unchanged) */}
          {showEmoji && (
            <div style={{
              position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
              width: 240, zIndex: 1100,
              background: "rgba(15,8,35,0.96)", backdropFilter: "blur(16px)",
              border: "1px solid rgba(124,58,237,0.3)", borderRadius: 18, padding: 12,
            }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { onSendEmoji(e); closeAllPopups(); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 26 }}>{e}</button>
                ))}
              </div>
            </div>
          )}

          {/* ── GIFT PANEL ── */}
          {showGift && (
            <GiftPanel
              userCoins={user.coins}
              onSendGift={(gift: LiveGift, combo: number) =>
                onHandleGift({
                  emoji: gift.emoji,
                  name: gift.name,
                  cost: gift.cost,
                  url: gift.url,
                  animationType: gift.animationType,
                  soundUrl: gift.soundUrl,
                }, combo)
              }
              onClose={closeAllPopups}
            />
          )}

          {/* ── GAMES MENU (Bottom Sheet) ── */}
          {showMenu && (
            <div style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1100,
              maxHeight: "70vh",
              background: "linear-gradient(180deg, #0b051f 0%, #030107 100%)",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              border: "1px solid rgba(108,92,231,0.2)",
              padding: "20px 16px 30px",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.8)",
              animation: "slideUp 0.25s ease-out",
            }}>
              {/* Drag handle */}
              <div style={{
                width: 40, height: 4, borderRadius: 2,
                background: "rgba(255,255,255,0.15)",
                margin: "0 auto 16px",
              }} />
              <button
                onClick={() => { setShowMenu(false); if (onCloseMenu) onCloseMenu(); }}
                style={{
                  position: "absolute", top: 12, right: 16,
                  background: "none", border: "none", color: "rgba(255,255,255,0.3)",
                  fontSize: 20, cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
              <GameHub
                hasControl={hasControl}
                onSelectGame={handleGameSelect}
                onClose={() => { setShowMenu(false); if (onCloseMenu) onCloseMenu(); }}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}