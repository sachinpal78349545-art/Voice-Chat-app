import React, { useState, useRef, useEffect } from "react";
import { Room, UserProfile } from "./types";
import {
  Mic,
  MicOff,
  Gift,
  MoreHorizontal,
  Send,
  Smile,
  MessageCircle,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import GiftPanel from "../gifts/GiftPanel";
import { LiveGift } from "../gifts/giftTypes";
import GameHub from "./GameHub";

const EMOJIS = [
  "❤️",
  "🔥",
  "✨",
  "😂",
  "🎵",
  "👏",
  "🌟",
  "💯",
  "🚀",
  "😍",
  "🎉",
  "💎",
];

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

  onHandleGift: (
    gift: {
      emoji: string;
      name: string;
      cost: number;
      url?: string;
      animationType?: string;
      soundUrl?: string;
    },
    combo: number
  ) => void;

  onHandleReaction: (emoji: string) => void;

  onMicToggle: () => void;
  onSpeakerToggle: () => void;
  onRaiseHand: () => void;
  onShare: () => void;

  showToast: (
    msg: string,
    type?: string,
    icon?: string
  ) => void;

  onOpenMenu?: () => void;
  onOpenInbox?: () => void;

  inboxBadge?: number;

  onFloatEmoji?: (emoji: string) => void;

  className?: string;

  hasControl?: boolean;
  onSelectGame?: (game: string) => void;
  onCloseMenu?: () => void;
}

export default function BottomBar({
  user,

  inputText,
  setInputText,

  isMuted,
  isSpeakerOff,
  isOnSeat,

  onSendChat,
  onSendEmoji,

  onHandleGift,
  onHandleReaction,

  onMicToggle,
  onSpeakerToggle,

  className = "",
  showToast,

  hasControl = false,
  onSelectGame,
  onCloseMenu,
}: BottomBarProps) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const [inputOpen, setInputOpen] = useState(false);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  /* =========================================================
     KEYBOARD / VISUAL VIEWPORT
  ========================================================= */

  useEffect(() => {
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const diff =
          window.innerHeight -
          window.visualViewport.height;

        setKeyboardHeight(
          diff > 100 ? diff : 0
        );
      }
    };

    window.visualViewport?.addEventListener(
      "resize",
      handleViewportChange
    );

    return () => {
      window.visualViewport?.removeEventListener(
        "resize",
        handleViewportChange
      );
    };
  }, []);

  /* =========================================================
     AUTO FOCUS CHAT
  ========================================================= */

  useEffect(() => {
    if (inputOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
    }
  }, [inputOpen]);

  /* =========================================================
     CLOSE ALL POPUPS
  ========================================================= */

  const closeAllPopups = () => {
    setShowEmoji(false);
    setShowGift(false);
    setShowMenu(false);
  };

  /* =========================================================
     MIC STATUS
  ========================================================= */

  const micActive =
    isOnSeat && !isMuted;

  /* =========================================================
     SPEAKER STATUS
  ========================================================= */

  const speakerActive =
    !isSpeakerOff;

  /* =========================================================
     MENU
  ========================================================= */

  const handleMenuToggle = () => {
    if (showMenu) {
      setShowMenu(false);

      if (onCloseMenu) {
        onCloseMenu();
      }
    } else {
      setShowMenu(true);

      setShowEmoji(false);
      setShowGift(false);
      setInputOpen(false);
    }
  };

  /* =========================================================
     GAME SELECT
  ========================================================= */

  const handleGameSelect = (
    game: string
  ) => {
    setShowMenu(false);

    if (onSelectGame) {
      onSelectGame(game);
    }
  };

  /* =========================================================
     CHAT BUTTON
  ========================================================= */

  const handleChatToggle = () => {
    setShowEmoji(false);
    setShowGift(false);
    setShowMenu(false);

    setInputOpen((prev) => !prev);
  };

  /* =========================================================
     EMOJI BUTTON
  ========================================================= */

  const handleEmojiToggle = () => {
    const next = !showEmoji;

    setShowGift(false);
    setShowMenu(false);
    setInputOpen(false);

    setShowEmoji(next);
  };

  /* =========================================================
     GIFT BUTTON
  ========================================================= */

  const handleGiftToggle = () => {
    const next = !showGift;

    setShowEmoji(false);
    setShowMenu(false);
    setInputOpen(false);

    setShowGift(next);
  };

  return (
    <>
      {/* =====================================================
          POPUP BACKDROP
      ===================================================== */}

      {(showGift ||
        showEmoji ||
        showMenu) && (
        <div
          onClick={closeAllPopups}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,

            background:
              "rgba(0,0,0,0.18)",

            touchAction: "none",
          }}
        />
      )}

      {/* =====================================================
          CHAT INPUT
      ===================================================== */}

      {(inputOpen ||
        keyboardHeight > 0) && (
        <div
          style={{
            position: "fixed",

            left: 12,
            right: 12,

            bottom:
              keyboardHeight > 0
                ? keyboardHeight + 72
                : 82,

            maxWidth: 456,
            margin: "0 auto",

            zIndex: 1200,

            display: "flex",
            alignItems: "center",

            gap: 8,

            background:
              "rgba(15,8,35,0.94)",

            backdropFilter:
              "blur(18px)",

            WebkitBackdropFilter:
              "blur(18px)",

            border:
              "1px solid rgba(180,85,255,0.35)",

            borderRadius: 24,

            padding:
              "5px 5px 5px 14px",

            boxShadow:
              "0 8px 30px rgba(0,0,0,0.45)",
          }}
        >
          <input
            ref={inputRef}
            placeholder="Say something…"
            value={inputText}
            onChange={(e) =>
              setInputText(e.target.value)
            }
            type="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="room-chat-message"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (inputText.trim()) {
                  onSendChat();
                }

                setInputOpen(false);
              }
            }}
            style={{
              flex: 1,

              minWidth: 0,

              background: "none",
              border: "none",
              outline: "none",

              color: "#fff",

              fontSize: 14,

              WebkitAppearance:
                "none",
            }}
          />

          <button
            onClick={() => {
              if (inputText.trim()) {
                onSendChat();
              }

              setInputOpen(false);
            }}
            style={{
              width: 36,
              height: 36,

              flexShrink: 0,

              borderRadius: 18,

              border: "none",

              background:
                "linear-gradient(135deg,#7c3aed,#a78bfa)",

              color: "#fff",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              cursor: "pointer",
            }}
          >
            <Send
              size={15}
              strokeWidth={2.5}
            />
          </button>
        </div>
      )}

      {/* =====================================================
          BOTTOM CONTROL BAR
          SCREENSHOT STYLE
      ===================================================== */}

      <div
        className={className}
        style={{
          position: "fixed",

          bottom: keyboardHeight,

          left: 0,
          right: 0,

          maxWidth: 480,

          margin: "0 auto",

          zIndex: 1000,

          background:
            "linear-gradient(180deg, transparent 0%, rgba(8,4,25,0.70) 40%, rgba(5,2,18,0.94) 100%)",

          backdropFilter:
            keyboardHeight > 0
              ? "blur(14px)"
              : "blur(2px)",

          WebkitBackdropFilter:
            keyboardHeight > 0
              ? "blur(14px)"
              : "blur(2px)",

          padding:
            keyboardHeight > 0
              ? "8px 12px 10px"
              : "10px 18px 22px",

          transition:
            "bottom 0.1s ease-out",

          overscrollBehavior:
            "none",
        }}
      >
        {/* ===================================================
            HIDDEN AUTOFILL PREVENTION
        =================================================== */}

        <div
          style={{
            opacity: 0,
            position: "absolute",
            height: 0,
            width: 0,
            overflow: "hidden",
          }}
        >
          <input
            type="text"
            name="prevent_autofill_user"
            tabIndex={-1}
          />

          <input
            type="password"
            name="prevent_autofill_pass"
            tabIndex={-1}
          />
        </div>

        {/* ===================================================
            MAIN SIX BUTTONS
        =================================================== */}

        {keyboardHeight === 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",

              width: "100%",
            }}
          >
            {/* =================================================
                SPEAKER
            ================================================= */}

            <button
              type="button"
              onClick={onSpeakerToggle}
              aria-label="Speaker"
              style={{
                width: 48,
                height: 48,

                borderRadius: "50%",

                border: "none",

                background:
                  "transparent",

                color: "#fff",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                padding: 0,

                cursor: "pointer",

                transition:
                  "transform .15s ease",
              }}
            >
              {speakerActive ? (
                <Volume2
                  size={30}
                  strokeWidth={2}
                  color="#ffffff"
                />
              ) : (
                <VolumeX
                  size={30}
                  strokeWidth={2}
                  color="#ffffff"
                />
              )}
            </button>

            {/* =================================================
                MIC
            ================================================= */}

            <button
              type="button"
              onClick={onMicToggle}
              aria-label="Microphone"
              style={{
                width: 48,
                height: 48,

                borderRadius: "50%",

                border: "none",

                background:
                  "transparent",

                color: "#fff",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                padding: 0,

                cursor: "pointer",

                position: "relative",
              }}
            >
              {micActive ? (
                <Mic
                  size={31}
                  strokeWidth={2}
                  color="#d9a6ff"
                  style={{
                    filter:
                      "drop-shadow(0 0 5px rgba(190,100,255,0.55))",
                  }}
                />
              ) : (
                <MicOff
                  size={31}
                  strokeWidth={2}
                  color="#ffffff"
                />
              )}
            </button>

            {/* =================================================
                EMOJI
            ================================================= */}

            <button
              type="button"
              onClick={handleEmojiToggle}
              aria-label="Emoji"
              style={{
                width: 48,
                height: 48,

                borderRadius: "50%",

                border: "none",

                background:
                  "transparent",

                color: "#fff",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                padding: 0,

                cursor: "pointer",
              }}
            >
              <Smile
                size={31}
                strokeWidth={1.8}
                color="#ffffff"
              />
            </button>

            {/* =================================================
                CHAT
            ================================================= */}

            <button
              type="button"
              onClick={handleChatToggle}
              aria-label="Chat"
              style={{
                width: 48,
                height: 48,

                borderRadius: "50%",

                border: "none",

                background:
                  "transparent",

                color: "#fff",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                padding: 0,

                cursor: "pointer",

                position: "relative",
              }}
            >
              <MessageCircle
                size={31}
                strokeWidth={1.8}
                color="#ffffff"
              />

              {/* Optional unread badge */}
              {inputText.trim() !== "" && (
                <span
                  style={{
                    position: "absolute",

                    top: 7,
                    right: 5,

                    width: 6,
                    height: 6,

                    borderRadius: "50%",

                    background:
                      "#d946ef",
                  }}
                />
              )}
            </button>

            {/* =================================================
                MENU / GAMES
            ================================================= */}

            <button
              type="button"
              onClick={handleMenuToggle}
              aria-label="More"
              style={{
                width: 48,
                height: 48,

                borderRadius: "50%",

                border: "none",

                background:
                  "transparent",

                color: "#fff",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                padding: 0,

                cursor: "pointer",
              }}
            >
              <MoreHorizontal
                size={32}
                strokeWidth={2}
                color={
                  showMenu
                    ? "#d9a6ff"
                    : "#ffffff"
                }
              />
            </button>

            {/* =================================================
                GIFT
            ================================================= */}

            <button
              type="button"
              onClick={handleGiftToggle}
              aria-label="Gift"
              style={{
                width: 48,
                height: 48,

                borderRadius: "50%",

                border: "none",

                background:
                  "transparent",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                padding: 0,

                cursor: "pointer",

                position: "relative",
              }}
            >
              <Gift
                size={32}
                strokeWidth={1.8}
                color="#ff2fa3"
                style={{
                  filter:
                    "drop-shadow(0 0 4px rgba(255,47,163,0.45))",
                }}
              />
            </button>
          </div>
        )}
      </div>

      {/* =====================================================
          EMOJI POPUP
      ===================================================== */}

      {keyboardHeight === 0 &&
        showEmoji && (
          <div
            style={{
              position: "fixed",

              bottom: 86,

              left: "50%",

              transform:
                "translateX(-50%)",

              width: 250,

              maxWidth:
                "calc(100vw - 30px)",

              zIndex: 1100,

              background:
                "rgba(15,8,35,0.97)",

              backdropFilter:
                "blur(18px)",

              WebkitBackdropFilter:
                "blur(18px)",

              border:
                "1px solid rgba(124,58,237,0.35)",

              borderRadius: 18,

              padding: 12,

              boxShadow:
                "0 10px 40px rgba(0,0,0,0.55)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                justifyContent:
                  "center",
              }}
            >
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onSendEmoji(emoji);
                    closeAllPopups();
                  }}
                  style={{
                    width: 42,
                    height: 42,

                    background:
                      "rgba(255,255,255,0.04)",

                    border: "none",

                    borderRadius: 12,

                    cursor: "pointer",

                    fontSize: 25,

                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

      {/* =====================================================
          GIFT PANEL
      ===================================================== */}

      {keyboardHeight === 0 &&
        showGift && (
          <GiftPanel
            userCoins={user.coins}
            onSendGift={(
              gift: LiveGift,
              combo: number
            ) =>
              onHandleGift(
                {
                  emoji: gift.emoji,
                  name: gift.name,
                  cost: gift.cost,
                  url: gift.url,
                  animationType:
                    gift.animationType,
                  soundUrl:
                    gift.soundUrl,
                },
                combo
              )
            }
            onClose={closeAllPopups}
          />
        )}

      {/* =====================================================
          GAMES MENU / BOTTOM SHEET
      ===================================================== */}

      {keyboardHeight === 0 &&
        showMenu && (
          <div
            style={{
              position: "fixed",

              bottom: 0,
              left: 0,
              right: 0,

              zIndex: 1100,

              maxHeight: "70vh",

              background:
                "linear-gradient(180deg,#0b051f 0%,#030107 100%)",

              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,

              border:
                "1px solid rgba(108,92,231,0.2)",

              padding:
                "20px 16px 30px",

              boxShadow:
                "0 -10px 40px rgba(0,0,0,0.8)",

              animation:
                "slideUp .25s ease-out",

              overflowY: "auto",
            }}
          >
            {/* Drag handle */}

            <div
              style={{
                width: 40,
                height: 4,

                borderRadius: 2,

                background:
                  "rgba(255,255,255,0.15)",

                margin:
                  "0 auto 16px",
              }}
            />

            {/* Close */}

            <button
              type="button"
              onClick={() => {
                setShowMenu(false);

                if (onCloseMenu) {
                  onCloseMenu();
                }
              }}
              style={{
                position: "absolute",

                top: 12,
                right: 16,

                background: "none",
                border: "none",

                color:
                  "rgba(255,255,255,0.45)",

                cursor: "pointer",

                width: 36,
                height: 36,

                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={20} />
            </button>

            <GameHub
              hasControl={hasControl}
              onSelectGame={
                handleGameSelect
              }
              onClose={() => {
                setShowMenu(false);

                if (onCloseMenu) {
                  onCloseMenu();
                }
              }}
            />
          </div>
        )}

      {/* =====================================================
          BOTTOM BAR ANIMATION
      ===================================================== */}

      <style>
        {`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }

            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          button {
            -webkit-tap-highlight-color: transparent;
          }

          button:active {
            transform: scale(0.94);
          }
        `}
      </style>
    </>
  );
}