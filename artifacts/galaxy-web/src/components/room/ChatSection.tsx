import React, { useEffect, useState } from "react";
import { RoomMessage, cleanName } from "./types";

interface ChatSectionProps {
  messages: RoomMessage[];
  userId: string;
  msgEndRef: React.RefObject<HTMLDivElement>;
}

export default function ChatSection({ messages, userId: _userId, msgEndRef }: ChatSectionProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(heightDiff > 150 ? heightDiff : 0);
      }
    };
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    return () => window.visualViewport?.removeEventListener("resize", handleViewportChange);
  }, []);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, keyboardHeight]);

  const grouped: (RoomMessage & { showHeader: boolean })[] = [];
  messages.forEach((msg, idx) => {
    const prev = messages[idx - 1];
    let showHeader = true;
    if (prev && prev.userId === msg.userId && msg.type !== "system") {
      showHeader = false;
    }
    grouped.push({ ...msg, showHeader });
  });

  return (
    <div 
      className="chat-fixed-container" 
      style={{ 
        transform: `translateY(-${keyboardHeight > 0 ? keyboardHeight - 20 : 0}px)`,
      }}
    >
      <div className="chat-scroll-box">
        <div className="chat-content-list">
          {grouped.map((msg, i) => {
            const isSystem = ["system", "join", "leave", "welcome"].includes(msg.type || "");
            
            // 🎁 Check if message is a Gift message
            const isGift = msg.text?.includes("sent 🎁") || msg.type === "gift";

            if (isSystem) {
              return (
                <div key={i} className="chat-entry system-message">
                  <div className="chat-main-bubble system-bubble">
                    <p>{msg.text}</p>
                  </div>
                </div>
              );
            }

            if (isGift) {
              // Custom extraction if needed, or fallback rendering with premium background
              // Extracting image URL from message properties if present
              const giftImgUrl = (msg as any).giftUrl || (msg as any).url;

              return (
                <div key={i} className={`chat-entry ${!msg.showHeader ? 'no-header' : ''}`}>
                  {msg.showHeader && (
                    <div className="chat-user-row">
                      <div className="chat-avatar-small">
                        {msg.avatar?.startsWith?.("http") ? <img src={msg.avatar} alt="" /> : <span>👤</span>}
                      </div>
                      <span className="chat-name-label">{cleanName(msg.username)}</span>
                      <span className="chat-lv-badge">Lv.6</span>
                    </div>
                  )}
                  <div className="chat-bubble-wrapper">
                    <div className="chat-main-bubble gift-premium-message-bubble">
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <p style={{ color: "#ffb703", fontWeight: "600" }}>{msg.text}</p>
                        {giftImgUrl && (
                          <img 
                            src={giftImgUrl} 
                            alt="gift" 
                            style={{ width: "24px", height: "24px", objectFit: "cover", borderRadius: "4px" }} 
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={i} className={`chat-entry ${!msg.showHeader ? 'no-header' : ''}`}>
                {msg.showHeader && (
                  <div className="chat-user-row">
                    <div className="chat-avatar-small">
                      {msg.avatar?.startsWith?.("http") ? <img src={msg.avatar} alt="" /> : <span>👤</span>}
                    </div>
                    <span className="chat-name-label">{cleanName(msg.username)}</span>
                    <span className="chat-lv-badge">Lv.6</span>
                  </div>
                )}
                <div className="chat-bubble-wrapper">
                  <div className="chat-main-bubble">
                    <p>{msg.text}</p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={msgEndRef} />
        </div>
      </div>

      <style>{`
        .chat-fixed-container {
          position: fixed;
          left: 12px;
          width: 75%;
          height: 350px; 
          bottom: 95px; 
          z-index: 100;
          pointer-events: none;
          transition: transform 0.2s cubic-bezier(0, 0, 0.2, 1);
        }

        .chat-scroll-box {
          width: 100%;
          height: 100%;
          overflow-y: auto;
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          mask-image: linear-gradient(to top, black 85%, transparent 100%);
          -webkit-overflow-scrolling: touch;
        }

        .chat-content-list {
          margin-top: auto;
          padding-bottom: 10px;
        }

        .chat-entry { display: flex; flex-direction: column; margin-top: 8px; }
        .chat-entry.no-header { margin-top: 1px; }

        .chat-user-row { display: flex; align-items: center; gap: 5px; }
        .chat-avatar-small { width: 20px; height: 20px; border-radius: 50%; overflow: hidden; }
        .chat-avatar-small img { width: 100%; height: 100%; object-fit: cover; }
        .chat-name-label { font-size: 11px; color: #fff; font-weight: 600; opacity: 0.9; }
        .chat-lv-badge { background: linear-gradient(90deg, #4facfe, #00f2fe); font-size: 8px; padding: 0 4px; border-radius: 4px; color: #fff; }

        .chat-bubble-wrapper { padding-left: 25px; }
        
        .chat-main-bubble {
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          padding: 6px 10px;
          border-radius: 4px 14px 14px 14px;
          display: inline-block;
        }

        /* 👑 PREMIUM GIFT ROW EFFECTS */
        .gift-premium-message-bubble {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.35), rgba(236, 72, 153, 0.2)) !important;
          border: 1px solid rgba(236, 72, 153, 0.3);
          box-shadow: 0 0 10px rgba(124, 58, 237, 0.2);
          border-radius: 6px 16px 16px 16px !important;
        }
        
        /* SYSTEM MESSAGE STYLE (Yellow Text, No Avatar) */
        .system-message {
          margin-top: 4px;
        }
        .system-bubble {
          background: rgba(0, 0, 0, 0.2) !important;
          border-radius: 10px !important;
          padding: 4px 8px !important;
        }
        .system-bubble p {
          color: #FFD700 !important; /* Yellow Color */
          font-size: 12px !important;
          font-weight: 500;
        }

        .chat-main-bubble p { font-size: 13.5px; color: #fff; margin: 0; line-height: 1.3; }
        .chat-scroll-box::-webkit-scrollbar { width: 0px; }
      `}</style>
    </div>
  );
}
