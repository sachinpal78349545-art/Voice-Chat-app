interface FriendUser {
  uid: string;
  name: string;
  avatar: string;
  level?: number;
}

interface Props {
  users: FriendUser[];
  onMessage?: (uid: string) => void;
}

export default function FriendSection({ users, onMessage: _onMessage }: Props) {
  if (users.length === 0) return null;

  return (
    <div className="hp-friends-section">
      <div className="hp-section-header">
        <h2 className="hp-section-title">Find Friends</h2>
        <span className="hp-section-more">View All</span>
      </div>
      <div className="hp-friends-list">
        {users.map((u, i) => (
          <div key={u.uid} className="hp-friend-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="hp-friend-avatar">
              {u.avatar?.startsWith?.("http") ? (
                <img src={u.avatar} alt="" onError={e => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="font-size:22px">\u{1F464}</span>';
                }} />
              ) : (
                <span className="hp-friend-emoji">{u.avatar && u.avatar.length <= 4 ? u.avatar : "\u{1F464}"}</span>
              )}
            </div>
            <div className="hp-friend-info">
              <p className="hp-friend-name">{u.name}</p>
              <p className="hp-friend-meta-text">{"\u{1F1F5}\u{1F1F0}"} Level {u.level || 1}</p>
            </div>
            <div className="hp-gender-badge hp-gender-f">
              <span>F</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
