import { useState, useEffect, useMemo } from "react";
import { ref, onValue, off, query, limitToLast } from "firebase/database";
import { db } from "../lib/firebase";
import { UserProfile } from "../lib/userService";
import { Room, subscribeRoom } from "../lib/roomService";
import Header from "../components/home/Header";
import BannerCarousel from "../components/home/BannerCarousel";
import GameSection from "../components/home/GameCard";
import FriendSection from "../components/home/FriendSection";
import TasksPanel from "../components/TasksPanel"; // 👈 sahi path

interface OnlineUser { uid: string; name: string; avatar: string; level?: number; }
interface Props {
  user: UserProfile;
  onJoinRoom: (room: Room) => void;
  onCreateRoom?: () => void;
  onViewProfile: (profile: UserProfile) => void;
  onOpenSubPage?: (pageId: string) => void;
  onCloseSubPage?: () => void;
  onUpdateUser?: (u: UserProfile) => void;
}

function StarField() {
  const stars = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      delay: Math.random() * 5,
      dur: Math.random() * 3 + 2,
      opacity: Math.random() * 0.5 + 0.15,
    })), []);

  return (
    <div className="hp-starfield">
      {stars.map(s => (
        <div
          key={s.id}
          className="hp-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
            opacity: s.opacity,
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage({ 
  user, 
  onJoinRoom, 
  onCreateRoom, 
  onViewProfile,
  onOpenSubPage,
  onCloseSubPage,
  onUpdateUser
}: Props) {
  const [allUsers, setAllUsers] = useState<OnlineUser[]>([]);
  const [myRoom, setMyRoom] = useState<Room | null>(null);
  const [showTasks, setShowTasks] = useState(false);

  useEffect(() => {
    if (user.hasRoom && user.myRoomId) {
      const unsub = subscribeRoom(user.myRoomId, r => setMyRoom(r));
      return unsub;
    }
    setMyRoom(null);
    return undefined;
  }, [user.hasRoom, user.myRoomId]);

  useEffect(() => {
    const usersRef = query(ref(db, "users"), limitToLast(50));
    onValue(usersRef, (snap) => {
      if (!snap.exists()) { setAllUsers([]); return; }
      const val = snap.val();
      const users: OnlineUser[] = [];
      Object.keys(val).forEach(uid => {
        const u = val[uid];
        if (u.name && uid !== user.uid) {
          users.push({ uid, name: u.name || "User", avatar: u.avatar || "👤", level: u.level || 1 });
        }
      });
      setAllUsers(users.sort(() => Math.random() - 0.5).slice(0, 10));
    });
    return () => off(usersRef);
  }, [user.uid]);

  return (
    <div className="hp-page">
      <StarField />
      <div className="hp-gradient-bg" />
      <div className="hp-content">
        <Header 
          user={user} 
          onOpenSubPage={onOpenSubPage}
          onCloseSubPage={onCloseSubPage}
          setShowTasks={setShowTasks}
        />

        <div style={{ padding: "0 16px" }}>
          <BannerCarousel />
        </div>

        <GameSection onCreateRoom={onCreateRoom} />

        {myRoom && (
          <div className="hp-my-rooms-section">
            <h2 className="hp-section-title-plain">My Rooms</h2>
            <div className="hp-my-room-card" onClick={() => onJoinRoom(myRoom)}>
              <div className="hp-my-room-card-gradient" />
              <div className="hp-my-room-info">
                <p className="hp-my-room-name">{myRoom.name}</p>
                <p className="hp-my-room-meta">
                  {myRoom.seats?.filter(s => s.userId).length || 0}/10 seats filled
                </p>
              </div>
              <div className="hp-my-room-live-badge">
                <div className="hp-my-room-live-dot" />
                <span>LIVE</span>
              </div>
              <span className="hp-my-room-chevron">›</span>
            </div>
          </div>
        )}

        <FriendSection 
          users={allUsers} 
          onUserClick={(onlineUser) => {
            import("../lib/userService").then(({ getUser }) => {
              getUser(onlineUser.uid).then(profile => {
                if (profile) onViewProfile(profile);
              });
            });
          }} 
        />

        <div style={{ height: 120 }} />
      </div>

      {/* ✅ TasksPanel render – sahi syntax */}
      {showTasks && (
        <TasksPanel
          user={user}
          onUpdate={(updatedUser) => {
            if (onUpdateUser) onUpdateUser(updatedUser);
          }}
          onClose={() => {
            setShowTasks(false);
            if (onCloseSubPage) onCloseSubPage();
          }}
        />
      )}
    </div>
  );
}