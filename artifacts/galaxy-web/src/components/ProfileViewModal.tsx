import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  UserProfile,
  incrementVisitor,
  followUser,
  unfollowUser,
  sendFriendRequest,
  removeFriend,
} from "../lib/userService";

import { getOrCreateConversation } from "../lib/chatService";
import { useToast } from "../lib/toastContext";

import {
  ArrowLeft,
  MoreVertical,
  Copy,
  Check,
  UserPlus,
  MessageCircle,
  Users,
  UserRoundPlus,
  Eye,
  Star,
  Image as ImageIcon,
  Gift,
  User,
  ChevronRight,
  Radio,
  Heart,
} from "lucide-react";

/* =========================================================
   FALLBACK AVATAR
========================================================= */

const FALLBACK_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAbvXHNrTp4IpVAyU9z2ioLHqwAUuNkZ9sgSKsC_TLmvYJC6BgLPS2RF_BtX7uFRDZ_TpS7gBNgLyTOmt7EEWqDo137VDhQa0Brk-FayAEjajH8eQHalo0tb4PWBtJiUNPtuzMxfyrsFlBSjGTxc9ua0xWKIarw4sZXQDCkrIRSJ_Apf_RzUlM5nfCuDb91tFy6_uSa5Uj1Q4HQMrymIIpQjiXrlCyS_GTVnJ5u04nCCGiXEa1fkZMdsLLSXjanwSmD";

/* =========================================================
   TYPES
========================================================= */

interface ProfileBadge {
  label: string;
  icon: string;
  className: string;
}

interface MomentItem {
  image?: string;
  label?: string;
  className?: string;
}

interface GiftItem {
  icon: string;
  name: string;
  count: number;
}

interface UserProfileData {
  name: string;
  id: string;
  avatar: string;
  gender: string;
  level: number;
  online: boolean;

  friends: string | number;
  following: string | number;
  followers: string | number;
  visitors: string | number;

  about: string;
  tags: string[];

  banner?: string;

  badges: ProfileBadge[];

  liveRoom?: {
    active: boolean;
    name: string;
    id: string;
    listeners: number;
  };

  moments: MomentItem[];

  gifts: GiftItem[];
}

/* =========================================================
   PROPS
========================================================= */

interface ProfileViewModalProps {
  profile: UserProfile;
  currentUser: UserProfile;
  onClose: () => void;
  onMessage: (uid: string) => void;
  onOpenFollowers?: () => void;
  onOpenFollowing?: () => void;
}

/* =========================================================
   MAIN MODAL
========================================================= */

export default function ProfileViewModal({
  profile,
  currentUser,
  onClose,
  onMessage,
  onOpenFollowers,
  onOpenFollowing,
}: ProfileViewModalProps) {
  const { showToast } = useToast();

  const isFollowing =
    currentUser?.followingList?.includes(profile?.uid) || false;

  const isFriend =
    currentUser?.friendsList?.includes(profile?.uid) || false;

  /* ---------------------------------------------------------
     Count visitor
  --------------------------------------------------------- */

  useEffect(() => {
    if (!profile?.uid || !currentUser?.uid) return;

    incrementVisitor(profile.uid, currentUser.uid).catch((error) => {
      console.error("Visitor count error:", error);
    });
  }, [profile?.uid, currentUser?.uid]);

  /* ---------------------------------------------------------
     Prevent background scrolling
  --------------------------------------------------------- */

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  /* ---------------------------------------------------------
     Follow
  --------------------------------------------------------- */

  const handleFollowChange = async (following: boolean) => {
    try {
      if (following) {
        await followUser(currentUser.uid, profile.uid);

        showToast(
          `You are now following ${profile.name}`,
          "success"
        );
      } else {
        await unfollowUser(currentUser.uid, profile.uid);

        showToast(
          `Unfollowed ${profile.name}`,
          "info"
        );
      }
    } catch (error) {
      console.error("Follow error:", error);

      showToast(
        "Failed to update follow status",
        "error"
      );
    }
  };

  /* ---------------------------------------------------------
     Message
  --------------------------------------------------------- */

  const handleMessage = async () => {
    try {
      await getOrCreateConversation(
        currentUser.uid,
        currentUser.name,
        currentUser.avatar,
        profile.uid,
        profile.name,
        profile.avatar
      );

      onMessage(profile.uid);
    } catch (error) {
      console.error("Chat error:", error);

      showToast(
        "Unable to open chat",
        "error"
      );
    }
  };

  /* ---------------------------------------------------------
     Friend
  --------------------------------------------------------- */

  const handleAddFriend = async () => {
    try {
      await sendFriendRequest(
        currentUser.uid,
        currentUser.name,
        currentUser.avatar,
        profile.uid
      );

      showToast(
        `Friend request sent to ${profile.name}`,
        "success"
      );
    } catch (error) {
      console.error("Friend request error:", error);

      showToast(
        "Failed to send friend request",
        "error"
      );
    }
  };

  const handleRemoveFriend = async () => {
    try {
      await removeFriend(
        currentUser.uid,
        profile.uid
      );

      showToast(
        `Removed ${profile.name} from friends`,
        "info"
      );
    } catch (error) {
      console.error("Remove friend error:", error);

      showToast(
        "Failed to remove friend",
        "error"
      );
    }
  };

  /* =========================================================
     NUMBER FORMAT
  ========================================================= */

  const fmtNum = (
    value: string | number | undefined | null
  ) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return "0";
    }

    const n =
      typeof value === "string"
        ? Number(
            value.replace(/,/g, "").replace(/K/gi, "")
          )
        : value;

    if (!Number.isFinite(n)) {
      return "0";
    }

    if (n >= 1_000_000) {
      return (
        (n / 1_000_000)
          .toFixed(1)
          .replace(".0", "") + "M"
      );
    }

    if (n >= 1_000) {
      return (
        (n / 1_000)
          .toFixed(1)
          .replace(".0", "") + "K"
      );
    }

    return String(n);
  };

  /* =========================================================
     REAL PROFILE DATA
  ========================================================= */

  const rawProfile = profile as any;

  const userData: UserProfileData = useMemo(() => {
    /* -------------------------------------------------------
       Moments from Firebase if available
    ------------------------------------------------------- */

    const firebaseMoments =
      Array.isArray(rawProfile?.moments)
        ? rawProfile.moments
        : Array.isArray(rawProfile?.posts)
        ? rawProfile.posts
        : [];

    const moments: MomentItem[] =
      firebaseMoments.length > 0
        ? firebaseMoments.slice(0, 4).map(
            (item: any) => ({
              image:
                item?.image ||
                item?.imageUrl ||
                item?.photo ||
                item?.mediaUrl ||
                item?.url,
              label:
                item?.label ||
                item?.caption ||
                item?.text ||
                "",
            })
          )
        : [
            {
              label: "No Moments",
              className:
                "bg-gradient-to-tr from-slate-700 via-purple-700 to-indigo-500",
            },
          ];

    /* -------------------------------------------------------
       Gifts from Firebase if available
    ------------------------------------------------------- */

    const firebaseGifts =
      Array.isArray(rawProfile?.gifts)
        ? rawProfile.gifts
        : Array.isArray(rawProfile?.giftWall)
        ? rawProfile.giftWall
        : [];

    const gifts: GiftItem[] =
      firebaseGifts.length > 0
        ? firebaseGifts.slice(0, 4).map(
            (item: any) => ({
              icon:
                item?.icon ||
                item?.emoji ||
                "🎁",
              name:
                item?.name ||
                item?.giftName ||
                "Gift",
              count:
                Number(
                  item?.count ??
                    item?.quantity ??
                    0
                ) || 0,
            })
          )
        : [];

    /* -------------------------------------------------------
       Badges
    ------------------------------------------------------- */

    const firebaseBadges =
      Array.isArray(rawProfile?.badges)
        ? rawProfile.badges
        : [];

    let badges: ProfileBadge[] = [];

    if (firebaseBadges.length > 0) {
      badges = firebaseBadges
        .slice(0, 6)
        .map((badge: any) => ({
          icon:
            badge?.icon ||
            badge?.emoji ||
            "✨",
          label:
            badge?.label ||
            badge?.name ||
            "Badge",
          className:
            badge?.className ||
            "bg-white/90 text-indigo-700 border border-indigo-200",
        }));
    } else {
      /* Existing role fields from profile */

      if (
        rawProfile?.isOfficial ||
        rawProfile?.official ||
        rawProfile?.officialVerified
      ) {
        badges.push({
          icon: "🛡️",
          label: "Official",
          className:
            "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950",
        });
      }

      if (
        rawProfile?.isHost ||
        rawProfile?.host ||
        rawProfile?.hostStatus === "approved"
      ) {
        badges.push({
          icon: "🔥",
          label: "Party Host",
          className:
            "bg-gradient-to-r from-rose-500 to-orange-400 text-white",
        });
      }

      const vipLevel =
        rawProfile?.vipLevel ??
        rawProfile?.vip ??
        rawProfile?.vipLevelNumber;

      if (
        vipLevel !== undefined &&
        vipLevel !== null &&
        Number(vipLevel) > 0
      ) {
        badges.push({
          icon: "💎",
          label: `VIP ${vipLevel}`,
          className:
            "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white",
        });
      }

      if (
        rawProfile?.agencyId ||
        rawProfile?.agencyName ||
        rawProfile?.agency
      ) {
        badges.push({
          icon: "✨",
          label: "Agency",
          className:
            "bg-white/90 text-indigo-700 border border-indigo-200",
        });
      }
    }

    /* -------------------------------------------------------
       If absolutely no badges
    ------------------------------------------------------- */

    if (badges.length === 0) {
      badges.push({
        icon: "🌌",
        label: "Galaxy User",
        className:
          "bg-white/90 text-indigo-700 border border-indigo-200",
      });
    }

    /* -------------------------------------------------------
       Tags
    ------------------------------------------------------- */

    const firebaseTags =
      Array.isArray(rawProfile?.tags)
        ? rawProfile.tags
        : [];

    const tags =
      firebaseTags.length > 0
        ? firebaseTags.slice(0, 6)
        : [];

    /* -------------------------------------------------------
       Live Room
    ------------------------------------------------------- */

    const room =
      rawProfile?.liveRoom ||
      rawProfile?.currentRoom ||
      null;

    const liveRoom =
      room && (room.active ?? true)
        ? {
            active: Boolean(
              room?.active ??
                rawProfile?.isLive ??
                rawProfile?.live
            ),
            name:
              room?.name ||
              room?.roomName ||
              "",
            id:
              room?.id ||
              room?.roomId ||
              "",
            listeners:
              Number(
                room?.listeners ??
                  room?.listenerCount ??
                  room?.users ??
                  0
              ) || 0,
          }
        : {
            active: false,
            name: "",
            id: "",
            listeners: 0,
          };

    return {
      name:
        profile?.name ||
        rawProfile?.displayName ||
        "User",

      id:
        profile?.userId ||
        rawProfile?.customUID ||
        rawProfile?.userID ||
        profile?.uid?.slice(0, 9) ||
        "------",

      avatar:
        profile?.avatar ||
        rawProfile?.photoURL ||
        rawProfile?.profileImage ||
        FALLBACK_AVATAR,

      gender:
        rawProfile?.gender ||
        rawProfile?.sex ||
        "Other",

      level:
        Number(
          profile?.level ??
            rawProfile?.level ??
            1
        ) || 1,

      online:
        Boolean(
          rawProfile?.online ??
            rawProfile?.isOnline ??
            true
        ),

      friends: fmtNum(
        rawProfile?.friendsCount ??
          rawProfile?.friends ??
          profile?.friends ??
          0
      ),

      following: fmtNum(
        rawProfile?.followingCount ??
          profile?.following ??
          0
      ),

      followers: fmtNum(
        rawProfile?.followersCount ??
          profile?.followers ??
          0
      ),

      visitors: fmtNum(
        rawProfile?.visitorsCount ??
          profile?.visitors ??
          0
      ),

      about:
        profile?.bio ||
        rawProfile?.about ||
        rawProfile?.description ||
        "Hi there! I'm on Galaxy Voice Chat ✨",

      tags,

      banner:
        rawProfile?.banner ||
        rawProfile?.coverPhoto ||
        rawProfile?.coverImage ||
        undefined,

      badges,

      liveRoom,

      moments,

      gifts,
    };
  }, [profile]);

  /* =========================================================
     RENDER
  ========================================================= */

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 99999,
        background: "#f2f4fc",
        overflow: "hidden",
      }}
    >
      <ProfileView
        user={userData}
        isFollowing={isFollowing}
        isFriend={isFriend}
        onBack={onClose}
        onMessage={handleMessage}
        onFollowChange={handleFollowChange}
        onAddFriend={handleAddFriend}
        onRemoveFriend={handleRemoveFriend}
        onOpenFollowers={onOpenFollowers}
        onOpenFollowing={onOpenFollowing}
      />
    </div>,
    document.body
  );
}

/* =========================================================
   PROFILE VIEW
========================================================= */

interface ProfileViewProps {
  user: UserProfileData;
  isFollowing?: boolean;
  isFriend?: boolean;
  onBack?: () => void;
  onMessage?: () => void;
  onFollowChange?: (following: boolean) => void;
  onAddFriend?: () => void;
  onRemoveFriend?: () => void;
  onOpenFollowers?: () => void;
  onOpenFollowing?: () => void;
}

function ProfileView({
  user,
  isFollowing: initialFollowing = false,
  isFriend = false,
  onBack,
  onMessage,
  onFollowChange,
  onAddFriend,
  onRemoveFriend,
  onOpenFollowers,
  onOpenFollowing,
}: ProfileViewProps) {
  const [isFollowing, setIsFollowing] =
    useState(initialFollowing);

  const [copied, setCopied] =
    useState(false);

  const [showMoreMenu, setShowMoreMenu] =
    useState(false);

  useEffect(() => {
    setIsFollowing(initialFollowing);
  }, [initialFollowing]);

  /* =========================================================
     BACK
  ========================================================= */

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    window.history.back();
  };

  /* =========================================================
     COPY ID
  ========================================================= */

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(
        user.id
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1200);
    } catch (error) {
      console.error(
        "Unable to copy user ID",
        error
      );
    }
  };

  /* =========================================================
     FOLLOW
  ========================================================= */

  const handleFollow = () => {
    const nextState = !isFollowing;

    setIsFollowing(nextState);

    onFollowChange?.(nextState);
  };

  /* =========================================================
     MORE MENU
  ========================================================= */

  const handleMoreAction = () => {
    setShowMoreMenu(false);

    if (isFriend) {
      onRemoveFriend?.();
    } else {
      onAddFriend?.();
    }
  };

  /* =========================================================
     SAFE AVATAR
  ========================================================= */

  const handleAvatarError = (
    event: React.SyntheticEvent<HTMLImageElement>
  ) => {
    const img =
      event.currentTarget;

    if (
      img.src !== FALLBACK_AVATAR
    ) {
      img.src = FALLBACK_AVATAR;
    }
  };

  return (
    <div
      className="text-slate-800 antialiased"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: "#f2f4fc",
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          paddingTop:
            "calc(env(safe-area-inset-top, 0px) + 14px)",
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background:
            "linear-gradient(to bottom, rgba(15,23,42,.40), rgba(15,23,42,.08), transparent)",
        }}
      >
        {/* BACK */}

        <button
          type="button"
          aria-label="Back"
          onClick={handleBack}
          className="w-10 h-10 rounded-full bg-white/85 flex items-center justify-center text-slate-700 shadow-md active:scale-95 transition-transform"
          style={{
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter:
              "blur(12px)",
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* TITLE */}

        <h1
          className="text-white font-bold text-[16px] tracking-wide truncate text-center"
          style={{
            flex: 1,
            marginLeft: 12,
            marginRight: 12,
            textShadow:
              "0 2px 8px rgba(0,0,0,.25)",
          }}
        >
          {user.name}&apos;s Profile
        </h1>

        {/* MORE */}

        <div
          style={{
            position: "relative",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            aria-label="More"
            onClick={() =>
              setShowMoreMenu(
                (value) => !value
              )
            }
            className="w-10 h-10 rounded-full bg-white/85 flex items-center justify-center text-slate-700 shadow-md active:scale-95 transition-transform"
            style={{
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter:
                "blur(12px)",
            }}
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMoreMenu && (
            <>
              <div
                onClick={() =>
                  setShowMoreMenu(false)
                }
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 110,
                }}
              />

              <div
                style={{
                  position: "absolute",
                  top: 48,
                  right: 0,
                  minWidth: 175,
                  padding: 8,
                  borderRadius: 16,
                  background:
                    "rgba(30,26,46,.97)",
                  boxShadow:
                    "0 12px 35px rgba(0,0,0,.35)",
                  border:
                    "1px solid rgba(255,255,255,.1)",
                  zIndex: 120,
                  backdropFilter:
                    "blur(16px)",
                }}
              >
                <button
                  type="button"
                  onClick={handleMoreAction}
                  style={{
                    width: "100%",
                    border: 0,
                    background:
                      "transparent",
                    color: "#eee7ff",
                    padding:
                      "11px 14px",
                    borderRadius: 10,
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {isFriend
                    ? "❌ Remove Friend"
                    : "➕ Add Friend"}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* =====================================================
          SCROLL AREA
          Only this area scrolls.
      ===================================================== */}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling:
            "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",

          /* Space for fixed footer */
          paddingBottom:
            "calc(105px + env(safe-area-inset-bottom, 0px))",
        }}
        className="[&::-webkit-scrollbar]:hidden"
      >
        {/* =================================================
            HERO
        ================================================= */}

        <section
          style={{
            position: "relative",
            overflow: "hidden",

            paddingTop:
              "calc(env(safe-area-inset-top, 0px) + 78px)",

            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 24,

            background:
              user.banner
                ? `linear-gradient(to bottom, rgba(92,76,190,.35), rgba(168,188,248,.78), #eef2fd), url("${user.banner}") center/cover`
                : "linear-gradient(to bottom, #6878d9 0%, #8e9bf0 38%, #b8c5f8 68%, #eef2fd 100%)",
          }}
        >
          {/* Glow 1 */}

          <div
            style={{
              position: "absolute",
              width: 270,
              height: 270,
              borderRadius: "50%",
              top: -90,
              right: -80,
              background:
                "rgba(196,132,252,.28)",
              filter: "blur(45px)",
              pointerEvents: "none",
            }}
          />

          {/* Glow 2 */}

          <div
            style={{
              position: "absolute",
              width: 210,
              height: 210,
              borderRadius: "50%",
              top: 100,
              left: -80,
              background:
                "rgba(129,140,248,.30)",
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
          />

          {/* Stars */}

          <span
            style={{
              position: "absolute",
              top: 95,
              right: 48,
              color: "rgba(255,255,255,.65)",
              fontSize: 13,
            }}
          >
            ✦
          </span>

          <span
            style={{
              position: "absolute",
              top: 135,
              right: 105,
              color: "rgba(255,255,255,.8)",
              fontSize: 17,
            }}
          >
            ✨
          </span>

          {/* =================================================
              PROFILE IDENTITY
          ================================================= */}

          <div
            style={{
              position: "relative",
              zIndex: 5,
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            {/* AVATAR */}

            <div
              style={{
                position: "relative",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 108,
                  height: 108,
                  padding: 3,
                  borderRadius: "50%",
                  background:
                    "conic-gradient(from 180deg, #38bdf8, #c084fc, #f472b6, #38bdf8)",
                  boxShadow:
                    "0 8px 25px rgba(79,70,229,.25)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                    borderRadius: "50%",
                    border:
                      "3px solid rgba(255,255,255,.95)",
                    background:
                      "#180c35",
                  }}
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    onError={handleAvatarError}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition:
                        "center top",
                      display: "block",
                    }}
                  />
                </div>
              </div>

              {/* Crown */}

              <div
                style={{
                  position: "absolute",
                  top: -8,
                  left: "50%",
                  transform:
                    "translateX(-50%)",
                  minWidth: 30,
                  height: 24,
                  padding:
                    "2px 7px",
                  borderRadius: 999,
                  background:
                    "#facc15",
                  border:
                    "2px solid white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  fontSize: 13,
                  boxShadow:
                    "0 3px 10px rgba(0,0,0,.18)",
                }}
              >
                👑
              </div>

              {/* ONLINE */}

              {user.online && (
                <span
                  style={{
                    position: "absolute",
                    right: 2,
                    bottom: 3,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background:
                      "#10d9a0",
                    border:
                      "3px solid white",
                    boxShadow:
                      "0 0 0 3px rgba(16,217,160,.18)",
                  }}
                />
              )}
            </div>

            {/* USER DETAILS */}

            <div
              style={{
                flex: 1,
                minWidth: 0,
              }}
            >
              {/* NAME */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <h2
                  className="text-slate-950 font-extrabold tracking-tight truncate"
                  style={{
                    fontSize: 25,
                    lineHeight: 1.15,
                    margin: 0,
                  }}
                >
                  {user.name}
                </h2>

                <span
                  style={{
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  👑
                </span>
              </div>

              {/* GENDER + LEVEL */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 7,
                  marginTop: 8,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding:
                      "6px 12px",
                    borderRadius: 999,
                    background:
                      "rgba(255,230,245,.94)",
                    color: "#d11b78",
                    border:
                      "1px solid rgba(236,72,153,.15)",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  <User
                    style={{
                      width: 15,
                      height: 15,
                    }}
                  />
                  {user.gender}
                </span>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding:
                      "6px 12px",
                    borderRadius: 999,
                    background:
                      "linear-gradient(90deg,#7626ee,#5635dc)",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 800,
                    boxShadow:
                      "0 5px 14px rgba(99,40,220,.22)",
                  }}
                >
                  <Star
                    style={{
                      width: 15,
                      height: 15,
                      fill: "#facc15",
                      color: "#facc15",
                    }}
                  />

                  Lv.{user.level}
                </span>
              </div>

              {/* ID */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  marginTop: 9,
                }}
              >
                <span
                  style={{
                    color:
                      "rgba(51,65,85,.78)",
                    fontSize: 14,
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    letterSpacing: ".2px",
                  }}
                >
                  ID: {user.id}
                </span>

                <button
                  type="button"
                  onClick={handleCopyId}
                  aria-label="Copy ID"
                  style={{
                    padding: 2,
                    border: 0,
                    background:
                      "transparent",
                    color: copied
                      ? "#10b981"
                      : "#64748b",
                  }}
                >
                  {copied ? (
                    <Check
                      style={{
                        width: 19,
                        height: 19,
                      }}
                    />
                  ) : (
                    <Copy
                      style={{
                        width: 19,
                        height: 19,
                      }}
                    />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* =================================================
              BADGES
          ================================================= */}

          <div
            style={{
              position: "relative",
              zIndex: 5,
              marginTop: 20,
              paddingTop: 15,
              borderTop:
                "1px solid rgba(255,255,255,.42)",
              display: "flex",
              alignItems: "center",
              gap: 9,
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
            className="[&::-webkit-scrollbar]:hidden"
          >
            {user.badges.map(
              (badge, index) => (
                <div
                  key={`${badge.label}-${index}`}
                  className={badge.className}
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding:
                      "7px 13px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    boxShadow:
                      "0 3px 8px rgba(0,0,0,.08)",
                  }}
                >
                  <span>
                    {badge.icon}
                  </span>

                  <span>
                    {badge.label}
                  </span>
                </div>
              )
            )}
          </div>
        </section>

        {/* ===================================================
            CONTENT
        =================================================== */}

        <div
          style={{
            paddingLeft: 16,
            paddingRight: 16,
            marginTop: -2,
            position: "relative",
            zIndex: 20,
          }}
        >
          {/* =================================================
              STATS
          ================================================= */}

          <section
            style={{
              background:
                "rgba(255,255,255,.94)",
              borderRadius: 22,
              padding: "16px 6px",
              boxShadow:
                "0 5px 18px rgba(15,23,42,.08)",
              border:
                "1px solid rgba(255,255,255,.8)",
              marginBottom: 18,
            }}
          >
            <div className="grid grid-cols-4 divide-x divide-slate-200/80">
              <Stat
                value={user.friends}
                label="Friends"
                icon={
                  <Users className="w-4 h-4" />
                }
              />

              <Stat
                value={user.following}
                label="Following"
                icon={
                  <UserPlus className="w-4 h-4" />
                }
                onClick={
                  onOpenFollowing
                }
              />

              <Stat
                value={user.followers}
                label="Followers"
                icon={
                  <User className="w-4 h-4" />
                }
                onClick={
                  onOpenFollowers
                }
              />

              <Stat
                value={user.visitors}
                label="Visitors"
                icon={
                  <Eye className="w-4 h-4" />
                }
              />
            </div>
          </section>

          {/* =================================================
              LIVE ROOM
          ================================================= */}

          {user.liveRoom?.active && (
            <section
              style={{
                marginBottom: 18,
                borderRadius: 22,
                padding: 14,
                color: "white",
                background:
                  "linear-gradient(100deg,#7226ed,#a01cf0,#5434ec)",
                boxShadow:
                  "0 8px 22px rgba(99,40,220,.22)",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    flexShrink: 0,
                    borderRadius: 16,
                    background:
                      "rgba(255,255,255,.12)",
                    border:
                      "1px solid rgba(255,255,255,.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems:
                        "flex-end",
                      gap: 3,
                      height: 23,
                    }}
                  >
                    <span className="w-1.5 h-3 bg-amber-300 rounded-full animate-pulse" />
                    <span className="w-1.5 h-6 bg-white rounded-full animate-pulse" />
                    <span className="w-1.5 h-4 bg-cyan-300 rounded-full animate-pulse" />
                  </div>
                </div>

                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      gap: 7,
                    }}
                  >
                    <span
                      style={{
                        background:
                          "#ef4444",
                        padding:
                          "4px 7px",
                        borderRadius: 5,
                        fontSize: 9,
                        fontWeight: 900,
                      }}
                    >
                      LIVE
                    </span>

                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 800,
                        whiteSpace:
                          "nowrap",
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                      }}
                    >
                      {user.liveRoom.name}
                    </p>
                  </div>

                  <p
                    style={{
                      margin:
                        "5px 0 0",
                      fontSize: 12,
                      color:
                        "rgba(255,255,255,.82)",
                    }}
                  >
                    Room ID:{" "}
                    {user.liveRoom.id}{" "}
                    •{" "}
                    {user.liveRoom.listeners}{" "}
                    listeners
                  </p>
                </div>
              </div>

              <button
                type="button"
                style={{
                  flexShrink: 0,
                  border: 0,
                  background: "white",
                  color: "#7026d9",
                  padding:
                    "10px 16px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 800,
                  boxShadow:
                    "0 3px 10px rgba(0,0,0,.12)",
                }}
              >
                Join Room
              </button>
            </section>
          )}

          {/* =================================================
              MOMENTS
          ================================================= */}

          <section
            style={{
              background:
                "rgba(255,255,255,.94)",
              borderRadius: 22,
              padding: 16,
              boxShadow:
                "0 5px 18px rgba(15,23,42,.07)",
              border:
                "1px solid rgba(255,255,255,.8)",
              marginBottom: 18,
            }}
          >
            <SectionHeader
              icon={
                <ImageIcon className="w-4 h-4 text-blue-600" />
              }
              iconBg="bg-blue-100"
              title="Moments"
              onViewAll={() => {}}
            />

            {user.moments.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(4,minmax(0,1fr))",
                  gap: 9,
                }}
              >
                {user.moments
                  .slice(0, 4)
                  .map(
                    (moment, index) => (
                      <div
                        key={index}
                        className={
                          moment.className ||
                          "bg-slate-200"
                        }
                        style={{
                          position:
                            "relative",
                          aspectRatio: "1",
                          overflow:
                            "hidden",
                          borderRadius: 16,
                          border:
                            "1px solid rgba(148,163,184,.25)",
                        }}
                      >
                        {moment.image ? (
                          <img
                            src={
                              moment.image
                            }
                            alt={
                              moment.label ||
                              "Moment"
                            }
                            onError={(
                              e
                            ) => {
                              (
                                e.currentTarget
                                  .style
                              ).display =
                                "none";
                            }}
                            style={{
                              width:
                                "100%",
                              height:
                                "100%",
                              objectFit:
                                "cover",
                              display:
                                "block",
                            }}
                          />
                        ) : null}

                        {moment.label && (
                          <div
                            style={{
                              position:
                                "absolute",
                              left: 0,
                              right: 0,
                              bottom: 0,
                              padding:
                                "20px 7px 7px",
                              background:
                                "linear-gradient(transparent,rgba(0,0,0,.62))",
                              color:
                                "white",
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            {moment.label}
                          </div>
                        )}
                      </div>
                    )
                  )}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding:
                    "18px 10px",
                  color: "#94a3b8",
                  fontSize: 12,
                }}
              >
                No moments yet
              </div>
            )}
          </section>

          {/* =================================================
              GIFT WALL
          ================================================= */}

          <section
            style={{
              background:
                "rgba(255,255,255,.94)",
              borderRadius: 22,
              padding: 16,
              boxShadow:
                "0 5px 18px rgba(15,23,42,.07)",
              border:
                "1px solid rgba(255,255,255,.8)",
              marginBottom: 18,
            }}
          >
            <SectionHeader
              icon={
                <Gift className="w-4 h-4 text-pink-600" />
              }
              iconBg="bg-pink-100"
              title="Gift Wall"
              onViewAll={() => {}}
            />

            {user.gifts.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(4,minmax(0,1fr))",
                  gap: 8,
                }}
              >
                {user.gifts
                  .slice(0, 4)
                  .map(
                    (gift, index) => (
                      <div
                        key={`${gift.name}-${index}`}
                        style={{
                          minWidth: 0,
                          display:
                            "flex",
                          flexDirection:
                            "column",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          padding:
                            "11px 5px",
                          borderRadius: 15,
                          background:
                            "#f8fafc",
                          border:
                            "1px solid #edf0f5",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 30,
                            lineHeight: 1,
                            marginBottom: 8,
                            filter:
                              "drop-shadow(0 3px 3px rgba(0,0,0,.12))",
                          }}
                        >
                          {gift.icon}
                        </div>

                        <span
                          style={{
                            width:
                              "100%",
                            textAlign:
                              "center",
                            fontSize: 11,
                            fontWeight: 700,
                            color:
                              "#334155",
                            whiteSpace:
                              "nowrap",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                          }}
                        >
                          {gift.name}
                        </span>

                        <span
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            fontWeight: 900,
                            color:
                              "#7c3aed",
                          }}
                        >
                          x{gift.count}
                        </span>
                      </div>
                    )
                  )}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding:
                    "18px 10px",
                  color: "#94a3b8",
                  fontSize: 12,
                }}
              >
                No gifts received yet
              </div>
            )}
          </section>

          {/* =================================================
              ABOUT ME
          ================================================= */}

          <section
            style={{
              background:
                "rgba(255,255,255,.94)",
              borderRadius: 22,
              padding: 16,
              boxShadow:
                "0 5px 18px rgba(15,23,42,.07)",
              border:
                "1px solid rgba(255,255,255,.8)",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  background:
                    "#f3e8ff",
                  color: "#9333ea",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                }}
              >
                <User className="w-4 h-4" />
              </span>

              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#1e293b",
                }}
              >
                About Me
              </h3>
            </div>

            <p
              style={{
                margin: 0,
                color: "#475569",
                fontSize: 13,
                lineHeight: 1.65,
              }}
            >
              {user.about}
            </p>

            {user.tags.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 12,
                }}
              >
                {user.tags.map(
                  (tag, index) => (
                    <span
                      key={index}
                      style={{
                        padding:
                          "5px 9px",
                        borderRadius: 999,
                        background:
                          "#f1f5f9",
                        color:
                          "#475569",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
            )}
          </section>

          {/* EXTRA BOTTOM SPACE */}

          <div
            style={{
              height: 20,
            }}
          />
        </div>
      </div>

      {/* =====================================================
          FIXED FOLLOW / MESSAGE BAR
      ===================================================== */}

      <footer
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 90,

          padding:
            "12px 16px calc(14px + env(safe-area-inset-bottom, 0px))",

          background:
            "rgba(255,255,255,.88)",

          borderTop:
            "1px solid rgba(148,163,184,.22)",

          boxShadow:
            "0 -8px 25px rgba(15,23,42,.08)",

          backdropFilter:
            "blur(18px)",

          WebkitBackdropFilter:
            "blur(18px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            maxWidth: 500,
            margin: "0 auto",
          }}
        >
          {/* FOLLOW */}

          <button
            type="button"
            onClick={handleFollow}
            style={{
              flex: 1,
              height: 54,
              border: 0,
              borderRadius: 999,

              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              gap: 8,

              fontSize: 15,
              fontWeight: 800,

              color: isFollowing
                ? "#334155"
                : "white",

              background: isFollowing
                ? "#e2e8f0"
                : "linear-gradient(90deg,#7925ee,#5434ec)",

              boxShadow: isFollowing
                ? "none"
                : "0 7px 18px rgba(99,40,220,.25)",

              transition:
                "all .2s ease",
            }}
          >
            {isFollowing ? (
              <Check className="w-5 h-5" />
            ) : (
              <UserRoundPlus className="w-5 h-5" />
            )}

            {isFollowing
              ? "Following"
              : "Follow"}
          </button>

          {/* MESSAGE */}

          <button
            type="button"
            onClick={onMessage}
            style={{
              flex: 1,
              height: 54,
              borderRadius: 999,

              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              gap: 8,

              fontSize: 15,
              fontWeight: 800,

              color: "#1e293b",
              background:
                "rgba(255,255,255,.96)",

              border:
                "1px solid #cbd5e1",

              boxShadow:
                "0 4px 12px rgba(15,23,42,.06)",
            }}
          >
            <MessageCircle className="w-5 h-5 text-slate-600" />

            Message
          </button>
        </div>
      </footer>
    </div>
  );
}

/* =========================================================
   STAT COMPONENT
========================================================= */

function Stat({
  value,
  label,
  icon,
  onClick,
}: {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        minWidth: 0,
        border: 0,
        background:
          "transparent",
        padding: "0 3px",
        display: "flex",
        flexDirection:
          "column",
        alignItems: "center",
        justifyContent:
          "center",
        cursor: onClick
          ? "pointer"
          : "default",
      }}
    >
      <span
        style={{
          fontSize: 23,
          lineHeight: 1.1,
          fontWeight: 800,
          color: "#1e293b",
        }}
      >
        {value}
      </span>

      <span
        style={{
          marginTop: 7,
          display: "flex",
          alignItems: "center",
          justifyContent:
            "center",
          gap: 4,
          color: "#64748b",
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {icon}
        {label}
      </span>
    </button>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  icon,
  iconBg,
  title,
  onViewAll,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  onViewAll?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent:
          "space-between",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}
      >
        <span
          className={iconBg}
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
          }}
        >
          {icon}
        </span>

        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: "#1e293b",
          }}
        >
          {title}
        </h3>
      </div>

      <button
        type="button"
        onClick={onViewAll}
        style={{
          border: 0,
          background:
            "transparent",
          color: "#94a3b8",
          display: "flex",
          alignItems: "center",
          gap: 2,
          fontSize: 13,
          fontWeight: 600,
          padding: 4,
        }}
      >
        View All

        <ChevronRight
          style={{
            width: 17,
            height: 17,
          }}
        />
      </button>
    </div>
  );
}