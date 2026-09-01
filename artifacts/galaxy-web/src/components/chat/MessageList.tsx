import { BadgeCheck, Inbox, UserRound, UserRoundPlus } from "lucide-react";
import { Conversation } from "../../lib/chatService";
import { UserProfile } from "../../lib/userService";
import "./MessageList.css";

interface MessageListProps {
  user: UserProfile;
  conversations: Conversation[];
  participantProfiles?: Record<string, UserProfile>;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectConversation: (conversation: Conversation) => void;
  onNewChat: () => void;
  onExploreRooms: () => void;
}

function getOtherParticipantIndex(conversation: Conversation, uid: string): number {
  const ownIndex = conversation.participants?.indexOf(uid) ?? -1;
  if (ownIndex < 0 || conversation.participants.length < 2) return -1;
  return ownIndex === 0 ? 1 : 0;
}

function formatConversationTime(timestamp: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  const thisYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString([], thisYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });
}

function ConversationAvatar({
  name,
  avatar,
  online,
  isSystem,
}: {
  name: string;
  avatar?: string;
  online: boolean;
  isSystem: boolean;
}) {
  const isImage = Boolean(avatar && /^(https?:\/\/|data:image\/)/i.test(avatar));
  return (
    <div className="messages-avatar" aria-label={`${name} profile photo`}>
      {isImage ? (
        <img src={avatar} alt="" onError={event => { event.currentTarget.style.display = "none"; }} />
      ) : avatar ? (
        <span>{avatar}</span>
      ) : (
        <UserRound size={22} strokeWidth={1.8} />
      )}
      {isSystem && (
        <span className="messages-avatar__badge">
          <Inbox size={9} strokeWidth={2.4} />
        </span>
      )}
      {online && <span className="messages-avatar__online" aria-label="Online" />}
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="messages-skeleton" aria-hidden="true">
      <div className="messages-skeleton__avatar" />
      <div className="messages-skeleton__copy">
        <div className="messages-skeleton__line messages-skeleton__line--short" />
        <div className="messages-skeleton__line messages-skeleton__line--long" />
      </div>
    </div>
  );
}

export default function MessageList({
  user,
  conversations,
  participantProfiles = {},
  loading = false,
  error = null,
  onRetry,
  onSelectConversation,
  onNewChat,
  onExploreRooms,
}: MessageListProps) {
  return (
    <section className="messages-list" aria-labelledby="messages-list-title">
      <header className="messages-list__header">
        <h1 className="messages-list__title" id="messages-list-title">Messages</h1>
        <button
          className="messages-list__new-chat"
          type="button"
          aria-label="Start a new chat"
          data-testid="button-new-chat"
          onClick={onNewChat}
        >
          <UserRoundPlus size={19} strokeWidth={2} />
          <span className="sr-only">Start a new chat</span>
        </button>
      </header>

      {error ? (
        <div className="messages-state" role="alert" data-testid="status-messages-error">
          <div className="messages-state__icon"><Inbox size={23} strokeWidth={1.8} /></div>
          <h2 className="messages-state__title">Messages could not load</h2>
          <p className="messages-state__copy">{error}</p>
          {onRetry && (
            <button
              className="messages-list__retry"
              type="button"
              data-testid="button-retry-messages"
              onClick={onRetry}
            >
              Try again
            </button>
          )}
        </div>
      ) : loading ? (
        <div className="messages-list__rows" aria-label="Loading messages" data-testid="status-messages-loading">
          {Array.from({ length: 5 }, (_, index) => <MessageSkeleton key={index} />)}
        </div>
      ) : conversations.length === 0 ? (
        <div className="messages-state" data-testid="status-messages-empty">
          <div className="messages-state__icon"><Inbox size={23} strokeWidth={1.8} /></div>
          <h2 className="messages-state__title">No conversations yet</h2>
          <p className="messages-state__copy">Start chatting with someone from the voice rooms.</p>
          <button className="messages-list__retry" type="button" onClick={onExploreRooms} data-testid="button-explore-rooms">
            Explore Rooms
          </button>
        </div>
      ) : (
        <div className="messages-list__rows" data-testid="list-messages">
          {conversations.map((conversation, index) => {
            const otherIndex = getOtherParticipantIndex(conversation, user.uid);
            if (otherIndex < 0) return null;
            const participantId = conversation.participants?.[otherIndex] || "";
            const participantProfile = participantProfiles[participantId];
            const name = participantProfile?.name || conversation.participantNames?.[otherIndex] || "Unknown user";
            const avatar = participantProfile?.avatar || conversation.participantAvatars?.[otherIndex] || "";
            const unreadCount = conversation.unread?.[user.uid] || 0;
            const isSystem = Boolean(conversation.participantIsSystem?.[otherIndex]);
            const isVerified = Boolean(participantProfile?.verified || participantProfile?.isVerified);
            const preview = conversation.lastMessageType === "voice" || conversation.lastMessage === "🎤 Voice message"
              ? "🎤 Voice message"
              : conversation.lastMessage || "No messages yet";
            return (
              <button
                className={`messages-row${unreadCount > 0 ? " messages-row--unread" : ""}`}
                key={conversation.id}
                type="button"
                data-testid={`row-message-${conversation.id}`}
                style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                onClick={() => onSelectConversation(conversation)}
              >
                <ConversationAvatar
                  name={name}
                  avatar={avatar}
                  online={Boolean(participantProfile?.online)}
                  isSystem={isSystem}
                />
                <span className="messages-row__content">
                  <span className="messages-row__topline">
                    <span className="messages-row__name" data-testid={`text-message-name-${conversation.id}`}>
                      {name}
                    </span>
                    {isVerified && <BadgeCheck className="messages-row__verified" size={14} strokeWidth={2.5} aria-label="Verified account" />}
                    <span className="messages-row__time" data-testid={`text-message-time-${conversation.id}`}>
                      {formatConversationTime(conversation.lastTime)}
                    </span>
                  </span>
                  <span className="messages-row__preview" data-testid={`text-message-preview-${conversation.id}`}>
                    {preview}
                  </span>
                </span>
                {unreadCount > 0 && (
                  <span className="messages-row__meta" aria-label={`${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}