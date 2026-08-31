interface OnlineUser {
  uid: string;
  name: string;
  avatar: string;
  level?: number;
}

interface FriendSectionProps {
  users: OnlineUser[];
  onUserClick: (user: OnlineUser) => void;
}

export default function FriendSection({ users, onUserClick }: FriendSectionProps) {
  return (
    <div className="friend-section">
      <div className="friend-header">
        <h3>Find Friends</h3>
        <button className="view-all">View All</button>
      </div>
      <div className="friend-list">
        {users.map(user => (
          <div key={user.uid} className="friend-card" onClick={() => onUserClick(user)}>
            <div className="friend-avatar">
              <img src={user.avatar} alt="" />
            </div>
            <div className="friend-info">
              <p className="friend-name">{user.name}</p>
              <p className="friend-level">Level {user.level}</p>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .friend-section { margin: 20px 16px; }
        .friend-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .friend-header h3 { font-size: 18px; font-weight: 700; color: #fff; margin: 0; }
        .view-all { background: none; border: none; color: #A29BFE; font-size: 13px; font-weight: 600; cursor: pointer; }
        .friend-list { display: flex; flex-direction: column; gap: 12px; }
        .friend-card { display: flex; align-items: center; gap: 12px; padding: 8px; background: rgba(255,255,255,0.04); border-radius: 16px; cursor: pointer; transition: 0.2s; }
        .friend-card:hover { background: rgba(108,92,231,0.1); }
        .friend-avatar img { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
        .friend-name { font-size: 15px; font-weight: 600; color: #fff; margin: 0; }
        .friend-level { font-size: 11px; color: rgba(162,155,254,0.6); margin: 0; }
      `}</style>
    </div>
  );
}