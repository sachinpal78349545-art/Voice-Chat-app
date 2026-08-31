import { useEffect } from "react";
import { UserProfile, incrementVisitor } from "../lib/userService";
import { followUser, unfollowUser, sendFriendRequest, removeFriend } from "../lib/userService";
import { getOrCreateConversation } from "../lib/chatService";
import { useToast } from "../lib/toastContext";
import OfficialBadge from "./OfficialBadge";

interface ProfileViewModalProps {
  profile: UserProfile;
  currentUser: UserProfile;
  onClose: () => void;
  onMessage: (uid: string) => void;
  onOpenFollowers?: () => void;
  onOpenFollowing?: () => void;
}

export default function ProfileViewModal({
  profile,
  currentUser,
  onClose,
  onMessage,
  onOpenFollowers,
  onOpenFollowing,
}: ProfileViewModalProps) {
  const { showToast } = useToast();
  const isFollowing = currentUser.followingList?.includes(profile.uid) || false;
  const isFriend = currentUser.friendsList?.includes(profile.uid) || false;

  // ✅ FIXED: Added globalRole === "official" so that users promoted via Admin Panel show the badge
  const isOfficialUser = 
    profile.globalRole === "official" ||   // 👈 यह लाइन जोड़ी गई है
    (profile as any).isOfficial === true || 
    (profile as any).official === true ||
    (profile as any).role === "official" ||
    (profile as any).status === "Official" ||
    profile.level >= 10 || 
    profile.uid === "admin";

  // Visitor count increment
  useEffect(() => {
    if (profile && currentUser) {
      incrementVisitor(profile.uid, currentUser.uid).catch(console.error);
    }
  }, [profile, currentUser]);

  const handleFollow = async () => {
    await followUser(currentUser.uid, profile.uid);
    showToast(`You are now following ${profile.name}`, "success");
  };
  const handleUnfollow = async () => {
    await unfollowUser(currentUser.uid, profile.uid);
    showToast(`Unfollowed ${profile.name}`, "info");
  };
  const handleAddFriend = async () => {
    await sendFriendRequest(currentUser.uid, currentUser.name, currentUser.avatar, profile.uid);
    showToast(`Friend request sent to ${profile.name}`, "success");
  };
  const handleRemoveFriend = async () => {
    await removeFriend(currentUser.uid, profile.uid);
    showToast(`Removed ${profile.name} from friends`, "info");
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(profile.userId || profile.uid);
      showToast("ID copied to clipboard!", "success");
    } catch {
      showToast("Failed to copy ID", "error");
    }
  };

  const renderAvatar = () => {
    if (profile.avatar?.startsWith("http")) {
      return (
        <img
          src={profile.avatar}
          alt="avatar"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            (e.target as HTMLImageElement).parentElement!.innerHTML = "👤";
          }}
        />
      );
    }
    const avatarText = profile.avatar && profile.avatar.length <= 4 ? profile.avatar : "👤";
    return <div className="avatar-placeholder">{avatarText}</div>;
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <div className="profile-avatar">{renderAvatar()}</div>

        {/* Name + Official Premium Badge */}
        <div className="name-badge-wrapper">
          <h2 className="profile-name">{profile.name}</h2>
          {isOfficialUser && <OfficialBadge size="sm" />}
        </div>

        {profile.bio && <p className="profile-bio">{profile.bio}</p>}

        <div className="profile-id" onClick={copyId}>
          <span>ID: {profile.userId || profile.uid.slice(0, 9)}</span>
          <span className="copy-icon">📋</span>
        </div>

        <div className="info-row">
          <span className="info-item">{(profile as any).age || 18}</span>
          <span className="info-item">Lv.{profile.level || 1}</span>
          <span className="info-item diamond">💎 Diamond</span>
        </div>

        <div className="stats-row">
          <div className="stat" onClick={() => onOpenFollowing?.()}>
            <span className="stat-value">{profile.following || 0}</span>
            <span className="stat-label">Following</span>
          </div>
          <div className="stat" onClick={() => onOpenFollowers?.()}>
            <span className="stat-value">{profile.followers || 0}</span>
            <span className="stat-label">Followers</span>
          </div>
          <div className="stat">
            <span className="stat-value">{profile.visitors || 0}</span>
            <span className="stat-label">Visitors</span>
          </div>
        </div>

        <div className="action-list">
          <div className="action-item">
            <button className="action-btn" onClick={() => showToast("Moments coming soon", "info")}>
              <span>📷</span> Moment <span className="action-number">{(profile as any).momentsCount || 0} &gt;</span>
            </button>
          </div>
          <div className="action-item">
            <button className="action-btn" onClick={() => showToast("Enter effect coming soon", "info")}>
              <span>✨</span> Enter effect <span className="action-number">{(profile as any).entryEffectsCount || 0} &gt;</span>
            </button>
          </div>
          <div className="action-item">
            <button className="action-btn" onClick={() => showToast("Gift coming soon", "info")}>
              <span>🎁</span> Gift <span className="action-number">{(profile as any).giftsReceived || 0} &gt;</span>
            </button>
          </div>
        </div>

        <div className="button-group">
          <button
            className="btn-chat"
            onClick={async () => {
              await getOrCreateConversation(
                currentUser.uid,
                currentUser.name,
                currentUser.avatar,
                profile.uid,
                profile.name,
                profile.avatar
              );
              onMessage(profile.uid);
            }}
          >
            💬 Chat
          </button>

          {isFollowing ? (
            <button className="btn-unfollow" onClick={handleUnfollow}>Unfollow</button>
          ) : (
            <button className="btn-follow" onClick={handleFollow}>Follow</button>
          )}

          {isFriend ? (
            <button className="btn-remove" onClick={handleRemoveFriend}>Remove Friend</button>
          ) : (
            <button className="btn-add" onClick={handleAddFriend}>Add Friend</button>
          )}
        </div>
      </div>

      <style>{`
        .profile-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.85);
          display: flex; align-items: center; justify-content: center;
          z-index: 2000; backdrop-filter: blur(8px);
        }
        .profile-modal-card {
          background: linear-gradient(145deg, #1e1a3a, #0a0620);
          border-radius: 48px; width: 340px; padding: 24px 20px 32px;
          text-align: center; color: white; border: 1px solid rgba(162,155,254,0.2);
          box-shadow: 0 30px 40px rgba(0,0,0,0.4); position: relative;
        }
        .close-btn {
          position: absolute; top: 18px; right: 20px;
          background: none; border: none; color: #aaa; font-size: 24px; cursor: pointer;
        }
        .profile-avatar {
          display: flex; justify-content: center; margin-bottom: 16px;
        }
        .profile-avatar img, .avatar-placeholder {
          width: 84px; height: 84px; border-radius: 50%;
          border: 3px solid #A855F7; object-fit: cover;
        }
        .avatar-placeholder {
          background: rgba(168,85,247,0.15); display: flex; align-items: center; justify-content: center;
          font-size: 48px;
        }
        .name-badge-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 8px 0 4px;
        }
        .profile-name { font-size: 22px; font-weight: 800; margin: 0; }
        .profile-bio { font-size: 13px; color: #c0b5ff; margin-bottom: 8px; }
        .profile-id {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.08); padding: 4px 12px; border-radius: 40px;
          cursor: pointer; margin: 8px auto; width: fit-content;
          font-size: 12px; color: rgba(255,255,255,0.7);
        }
        .copy-icon { font-size: 14px; }
        .info-row {
          display: flex; justify-content: center; gap: 20px;
          margin: 12px 0; font-size: 14px; font-weight: 600;
        }
        .info-item.diamond { color: #00e6ff; }
        .stats-row {
          display: flex; justify-content: space-between;
          background: rgba(255,255,255,0.03); border-radius: 60px;
          padding: 12px 16px; margin: 16px 0;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .stat { text-align: center; cursor: pointer; flex: 1; }
        .stat-value { font-size: 20px; font-weight: 800; display: block; }
        .stat-label { font-size: 10px; color: rgba(162,155,254,0.7); }
        .action-list { margin: 16px 0; }
        .action-item { margin-bottom: 12px; }
        .action-btn {
          width: 100%; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 40px; padding: 10px 16px;
          display: flex; justify-content: space-between; align-items: center;
          cursor: pointer; transition: 0.2s; color: white; font-size: 14px;
        }
        .action-btn:hover { background: rgba(168,85,247,0.1); border-color: rgba(168,85,247,0.3); }
        .action-number { color: #FFD966; }
        .button-group {
          display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px;
        }
        .button-group button {
          flex: 1; padding: 12px 0; border-radius: 30px;
          font-weight: 700; font-size: 13px; border: none;
          cursor: pointer; transition: 0.2s;
        }
        .btn-chat { background: #8F4DFF; color: white; }
        .btn-follow { background: rgba(0,230,118,0.15); color: #00E676; border: 1px solid rgba(0,230,118,0.3); }
        .btn-unfollow { background: rgba(255,100,100,0.15); color: #FF6482; border: 1px solid rgba(255,100,100,0.3); }
        .btn-add { background: rgba(255,200,0,0.15); color: #FFD966; border: 1px solid rgba(255,200,0,0.3); }
        .btn-remove { background: rgba(255,100,100,0.15); color: #FF6482; border: 1px solid rgba(255,100,100,0.3); }
      `}</style>
    </div>
  );
}