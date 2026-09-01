import {
  CheckCheck,
  ChevronLeft,
  CircleStop,
  Gift,
  Heart,
  Mic,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Send,
  SmilePlus,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import "./_group.css";

type Reaction = {
  emoji: string;
  count: number;
  reacted: boolean;
};

type Message = {
  id: number;
  kind: "text" | "voice";
  direction: "incoming" | "outgoing";
  text?: string;
  time: string;
  duration?: string;
  reactions?: Reaction[];
};

const initialMessages: Message[] = [
  {
    id: 1,
    kind: "text",
    direction: "incoming",
    text: "I loved that little room you hosted tonight. The way you tell stories is kind of magic.",
    time: "8:42 PM",
    reactions: [{ emoji: "💗", count: 2, reacted: false }],
  },
  {
    id: 2,
    kind: "text",
    direction: "outgoing",
    text: "That’s such a sweet thing to say. I was nervous before I opened the mic.",
    time: "8:45 PM",
    reactions: [{ emoji: "✨", count: 1, reacted: true }],
  },
  {
    id: 3,
    kind: "voice",
    direction: "incoming",
    time: "8:46 PM",
    duration: "0:18",
    reactions: [{ emoji: "🎧", count: 1, reacted: false }],
  },
  {
    id: 4,
    kind: "text",
    direction: "incoming",
    text: "Here’s the bit I was trying to explain — the rain makes the city feel like a secret.",
    time: "8:47 PM",
  },
  {
    id: 5,
    kind: "text",
    direction: "outgoing",
    text: "You make even rainy Tuesdays sound romantic.",
    time: "8:50 PM",
    reactions: [{ emoji: "😂", count: 1, reacted: false }],
  },
];

const reactionChoices = ["💗", "✨", "😂", "👏", "🥹"];
const composerEmojis = ["☺", "🌙", "✨", "💗", "😂", "🥹", "🌷", "☕", "🫶", "🎧", "🌧️", "⭐"];
const gifts = [
  { emoji: "🌷", label: "Tulip", note: "a soft hello" },
  { emoji: "✨", label: "Sparkle", note: "for your story" },
  { emoji: "💌", label: "Note", note: "just because" },
];
const waveBars = [8, 15, 21, 13, 18, 10, 22, 15, 8, 17, 24, 12, 18, 10, 20, 14, 8, 17, 22, 12, 7, 15, 19, 10];

function formatRecordingTime(seconds: number): string {
  return `0:${String(seconds).padStart(2, "0")}`;
}

function VoiceWaveform({ isOutgoing }: { isOutgoing: boolean }) {
  const bars = useMemo(() => waveBars, []);

  return (
    <div className="vc-waveform" aria-label="Voice message waveform">
      {bars.map((height, index) => (
        <span
          className="vc-wave-bar"
          key={`${height}-${index}`}
          style={{ height: `${height}px` }}
        />
      ))}
      <span className="sr-only">{isOutgoing ? "Sent" : "Received"} voice message</span>
    </div>
  );
}

function VoiceMessage({
  message,
  isPlaying,
  onPlay,
}: {
  message: Message;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  const isOutgoing = message.direction === "outgoing";

  return (
    <div className="vc-bubble vc-voice-bubble">
      <div className="vc-voice-line">
        <button className="vc-play" onClick={onPlay} aria-label={isPlaying ? "Pause voice message" : "Play voice message"}>
          {isPlaying ? <Pause size={14} strokeWidth={2.3} /> : <Play size={13} fill="currentColor" strokeWidth={0} />}
        </button>
        <VoiceWaveform isOutgoing={isOutgoing} />
        <span className="vc-voice-duration">{message.duration}</span>
      </div>
      <div className="vc-meta">
        <span>{message.time}</span>
        {isOutgoing && <CheckCheck className="vc-read" size={12} strokeWidth={2.3} />}
      </div>
    </div>
  );
}

export function VoiceChat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [openPanel, setOpenPanel] = useState<"quick" | "emoji" | "gift" | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [nextId, setNextId] = useState(initialMessages.length + 1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return undefined;
    toastRef.current = setTimeout(() => setToast(""), 2200);
    return () => {
      if (toastRef.current) clearTimeout(toastRef.current);
    };
  }, [toast]);

  useEffect(() => {
    if (!isRecording) return undefined;
    timerRef.current = setInterval(() => setRecordSeconds((current) => current + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const showToast = (message: string) => {
    setToast(message);
    setShowMenu(false);
  };

  const closePanels = () => setOpenPanel(null);

  const togglePanel = (panel: "quick" | "emoji" | "gift") => {
    setShowMenu(false);
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  const addMessage = (message: Omit<Message, "id">) => {
    setMessages((current) => [...current, { ...message, id: nextId }]);
    setNextId((current) => current + 1);
  };

  const sendText = () => {
    const text = draft.trim();
    if (!text) return;
    addMessage({
      kind: "text",
      direction: "outgoing",
      text,
      time: "now",
    });
    setDraft("");
    closePanels();
    showToast("Message sent");
  };

  const addEmoji = (emoji: string) => {
    setDraft((current) => `${current}${emoji}`);
    setOpenPanel(null);
  };

  const sendGift = (gift: (typeof gifts)[number]) => {
    addMessage({
      kind: "text",
      direction: "outgoing",
      text: `Sent you a ${gift.label.toLowerCase()} ${gift.emoji} — ${gift.note}.`,
      time: "now",
      reactions: [{ emoji: "💗", count: 1, reacted: false }],
    });
    setOpenPanel(null);
    showToast(`${gift.label} sent`);
  };

  const toggleRecording = () => {
    if (isRecording) {
      addMessage({
        kind: "voice",
        direction: "outgoing",
        duration: formatRecordingTime(Math.max(recordSeconds, 1)),
        time: "now",
      });
      setIsRecording(false);
      setRecordSeconds(0);
      showToast("Voice note sent");
      return;
    }
    closePanels();
    setShowMenu(false);
    setIsRecording(true);
    setRecordSeconds(0);
  };

  const toggleReaction = (messageId: number, emoji: string) => {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId) return message;
        const reactions = message.reactions ?? [];
        const found = reactions.find((reaction) => reaction.emoji === emoji);
        if (!found) {
          return { ...message, reactions: [...reactions, { emoji, count: 1, reacted: true }] };
        }
        return {
          ...message,
          reactions: reactions.map((reaction) =>
            reaction.emoji === emoji
              ? { ...reaction, count: Math.max(0, reaction.count + (reaction.reacted ? -1 : 1)), reacted: !reaction.reacted }
              : reaction,
          ).filter((reaction) => reaction.count > 0),
        };
      }),
    );
  };

  return (
    <main className="voice-chat-stage">
      <section className="voice-chat-phone" aria-label="Conversation with Mira">
        {toast && <div className="vc-toast">{toast}</div>}

        <header className="vc-header">
          <button className="vc-icon-button" aria-label="Back to conversations" onClick={() => showToast("Back to conversations")}>
            <ChevronLeft size={20} strokeWidth={2.2} />
          </button>
          <div className="vc-avatar" aria-label="Mira Chen profile picture">
            <img
              className="vc-avatar-image"
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=85"
              alt="Mira Chen"
            />
          </div>
          <div className="vc-user">
            <p className="vc-user-name">Mira Chen</p>
            <p className="vc-user-status"><span className="vc-status-dot" />Online now</p>
          </div>
          <button className="vc-icon-button" aria-label="Conversation options" onClick={() => { setShowMenu((current) => !current); setOpenPanel(null); }}>
            <MoreHorizontal size={20} strokeWidth={2.2} />
          </button>
          {showMenu && (
            <div className="vc-header-menu">
              <button onClick={() => showToast("Mira’s profile is nearby")}><Sparkles size={14} />View profile</button>
              <button onClick={() => showToast("Notifications muted for a while")}><Heart size={14} />Mute conversation</button>
              <button onClick={() => showToast("Link copied")}><Send size={14} />Share profile</button>
            </div>
          )}
        </header>

        <div className="vc-chat" onClick={() => { setShowMenu(false); }}>
          <span className="vc-deco vc-deco-one">✦</span>
          <span className="vc-deco vc-deco-two">✧</span>
          <span className="vc-deco vc-deco-three">✦</span>
          <div className="vc-day-label">Today</div>
          {messages.slice(0, 3).map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              playingId={playingId}
              onPlay={() => setPlayingId((current) => current === message.id ? null : message.id)}
              onReact={toggleReaction}
            />
          ))}
          <div className="vc-new-divider">New messages</div>
          {messages.slice(3).map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              playingId={playingId}
              onPlay={() => setPlayingId((current) => current === message.id ? null : message.id)}
              onReact={toggleReaction}
            />
          ))}
          {isRecording && (
            <div className="vc-recording-note">
              <span className="vc-recording-pulse" />
              Recording a little note · {formatRecordingTime(recordSeconds)}
            </div>
          )}
        </div>

        <div className="vc-composer-shell">
          {openPanel === "quick" && (
            <div className="vc-popover">
              <div className="vc-popover-title">Little extras <span>just for this chat</span></div>
              <p className="vc-quick-copy">Keep it light — send a tiny moment from the room.</p>
              <button className="vc-popover-action" onClick={() => { setDraft("I’m still smiling about that room."); setOpenPanel(null); }}><Sparkles size={15} />Drop a room memory</button>
              <button className="vc-popover-action" onClick={() => { addMessage({ kind: "text", direction: "outgoing", text: "Waving from the quiet side of the room 👋", time: "now" }); setOpenPanel(null); showToast("Wave sent"); }}><Heart size={15} />Send a warm wave</button>
            </div>
          )}
          {openPanel === "gift" && (
            <div className="vc-popover">
              <div className="vc-popover-title">Send a little something <span>no big gesture needed</span></div>
              <div className="vc-gift-grid">
                {gifts.map((gift) => (
                  <button className="vc-gift-choice" key={gift.label} onClick={() => sendGift(gift)}>
                    <span className="vc-gift-emoji">{gift.emoji}</span>
                    <span>{gift.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {openPanel === "emoji" && (
            <div className="vc-popover">
              <div className="vc-popover-title">Say it with a feeling <button className="vc-icon-button" style={{ width: 20, height: 20 }} onClick={closePanels} aria-label="Close emoji panel"><X size={13} /></button></div>
              <div className="vc-emoji-grid">
                {composerEmojis.map((emoji) => <button className="vc-emoji-choice" key={emoji} onClick={() => addEmoji(emoji)}>{emoji}</button>)}
              </div>
            </div>
          )}
          <div className="vc-composer-row">
            <button className={`vc-composer-action ${openPanel === "quick" ? "selected" : ""}`} onClick={() => togglePanel("quick")} aria-label="More chat actions">
              <Plus size={18} strokeWidth={2.1} />
            </button>
            <input
              className="vc-composer-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") sendText(); }}
              placeholder="Write something warm..."
              aria-label="Message"
            />
            <button className={`vc-composer-action ${openPanel === "emoji" ? "selected" : ""}`} onClick={() => togglePanel("emoji")} aria-label="Choose an emoji">
              <SmilePlus size={18} strokeWidth={2} />
            </button>
            <button className={`vc-composer-action ${openPanel === "gift" ? "selected" : ""}`} onClick={() => togglePanel("gift")} aria-label="Send a gift">
              <Gift size={17} strokeWidth={2} />
            </button>
            {draft.trim() ? (
              <button className="vc-send-button" onClick={sendText} aria-label="Send message"><Send size={16} strokeWidth={2.2} /></button>
            ) : (
              <button className={`vc-mic-button ${isRecording ? "recording" : ""}`} onClick={toggleRecording} aria-label={isRecording ? "Stop and send voice message" : "Record voice message"}>
                {isRecording ? <CircleStop size={17} strokeWidth={2.2} /> : <Mic size={17} strokeWidth={2.2} />}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function MessageItem({
  message,
  playingId,
  onPlay,
  onReact,
}: {
  message: Message;
  playingId: number | null;
  onPlay: () => void;
  onReact: (messageId: number, emoji: string) => void;
}) {
  const isOutgoing = message.direction === "outgoing";

  return (
    <article className={`vc-message-row ${message.direction}`}>
      <div className="vc-message-wrap">
        {message.kind === "voice" ? (
          <VoiceMessage message={message} isPlaying={playingId === message.id} onPlay={onPlay} />
        ) : (
          <div className="vc-bubble">
            <p className="vc-bubble-copy">{message.text}</p>
            <div className="vc-meta">
              <span>{message.time}</span>
              {isOutgoing && <CheckCheck className="vc-read" size={12} strokeWidth={2.3} />}
            </div>
          </div>
        )}
        {message.reactions && message.reactions.length > 0 && (
          <div className="vc-reactions">
            {message.reactions.map((reaction) => (
              <button
                className={`vc-reaction-chip ${reaction.reacted ? "active" : ""}`}
                key={reaction.emoji}
                onClick={() => onReact(message.id, reaction.emoji)}
                aria-label={`React with ${reaction.emoji}`}
              >
                <span>{reaction.emoji}</span><span>{reaction.count}</span>
              </button>
            ))}
            <button className="vc-reaction-chip" onClick={() => onReact(message.id, reactionChoices[0])} aria-label="Add heart reaction"><Heart size={11} /></button>
          </div>
        )}
      </div>
    </article>
  );
}
