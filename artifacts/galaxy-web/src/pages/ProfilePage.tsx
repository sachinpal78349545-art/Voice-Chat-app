// ProfilePage.tsx – Full version without old daily tasks, bottom sheet (task page code separated)
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { signOut } from "firebase/auth";
import { auth, db, storage } from "../lib/firebase";
import { ref, onValue, off } from "firebase/database";
import { UserProfile, claimDailyReward, getAchievementsList, blockUser, unblockUser, getUser, reportUser, subscribeFriendRequests, respondFriendRequest, FriendRequest, sendFriendRequest, removeFriend, searchUsers, isSuperAdmin, setOfficialRole, removeOfficialRole, getUserByUserId, ensureSuperAdmin, followUser, banUser, unbanUser, isUserBanned, setUserCoins, deleteUserAvatar, resetUserName, deviceBanUser, shadowBanUser, removeShadowBan } from "../lib/userService";
import { sendGlobalAlert, clearGlobalAlerts } from "../lib/notificationService";
import { updateRoomSettings, setRoomSeatCount, wipeDummyRooms, setAutoEntryRoom, getAutoEntryRoom, ensureOfficialRoom, ROOM_THEMES } from "../lib/roomService";
import { submitFeedback, HELP_ARTICLES } from "../lib/supportService";
import { getOrCreateConversation } from "../lib/chatService";
import { useToast } from "../lib/toastContext";
import { getStoreItem, equipItem, unequipItem, getRarityColor, isPngFrame, getPngFramePath, isAnimatedFrame } from "../lib/storeService";
import TasksPanel from "../components/TasksPanel";
import SuperAdminAvatar from "../components/SuperAdminAvatar";
import { FramePreview } from "../components/frames/FrameAvatar";
import FantasyFrame from "../components/frames/FantasyFrame";
import OfficialBadge from "../components/OfficialBadge";
import { Language, LANGUAGE_OPTIONS, getCurrentLanguage, setLanguage } from "../lib/i18n";
import { Family, createFamily, joinFamily, leaveFamily, getUserFamily, getAllFamilies, getFamilyIcons } from "../lib/familyService";
import { Report, getReportQueue, reviewReport } from "../lib/reportService";
import SettingsPage from "./SettingsPage";
import UserLevelPage from "./UserLevelPage";
import StorePage from "./StorePage";
import HostAgencyApply from "../components/HostAgencyApply";

interface Props {
  user: UserProfile;
  onUpdate: (u: UserProfile) => void;
  onLogout: () => void;
  onEditProfile: () => void;
  onMessage?: (uid: string) => void;
  onRecharge?: () => void;
  onAdminRecharge?: () => void;
  onOpenSubPage?: (pageId: string) => void;
  onCloseSubPage?: () => void;
}

function BottomSheet({ children, onClose: _onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(160deg, #0d001a 0%, #1a0030 100%)",
        zIndex: 1100,
        display: "flex",
        flexDirection: "column",
        animation: "pageSlideIn 0.25s ease",
        fontFamily: "'Poppins', 'Inter', sans-serif",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 48px" }}>{children}</div>
    </div>
  );
}


export default function ProfilePage({
  user,
  onUpdate,
  onLogout,
  onEditProfile,
  onMessage,
  onRecharge,
  onAdminRecharge,
  onOpenSubPage,
  onCloseSubPage,
}: Props) {
  const [showTasksPanel, setShowTasksPanel] = useState(false);
  const [showLevelPage, setShowLevelPage] = useState(false);
  const [showStorePage, setShowStorePage] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showHelpArticle, setShowHelpArticle] = useState<string | null>(null);
  const [showBackpack, setShowBackpack] = useState(false);
  const [_storeCategory, setStoreCategory] = useState<"frame" | "entry" | "theme">("frame");
  const [storeLoading, setStoreLoading] = useState<string | null>(null);
  const [backpackCategory, setBackpackCategory] = useState<"frame" | "entry" | "theme">("frame");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showOfficialRules, setShowOfficialRules] = useState(false);
  const [adminPromoteId, setAdminPromoteId] = useState("");
  const [adminLookupResult, setAdminLookupResult] = useState<UserProfile | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"feedback" | "bug" | "suggestion">("feedback");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState("");
  const [feedbackAttachments, setFeedbackAttachments] = useState<File[]>([]);
  const [showFeedbackAttachPicker, setShowFeedbackAttachPicker] = useState(false);
  const [showReportAttachPicker, setShowReportAttachPicker] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [blockedProfiles, setBlockedProfiles] = useState<UserProfile[]>([]);
  const [showFollowersList, setShowFollowersList] = useState(false);
  const [showFollowingList, setShowFollowingList] = useState(false);
  const [followerProfiles, setFollowerProfiles] = useState<UserProfile[]>([]);
  const [followingProfiles, setFollowingProfiles] = useState<UserProfile[]>([]);
  const [followerLoading, setFollowerLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);
  const [momentCount, setMomentCount] = useState(0);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportTarget, setReportTarget] = useState("");
  const [reportAttachment, setReportAttachment] = useState<File | null>(null);
  const [reportAttachments, setReportAttachments] = useState<File[]>([]);
  const [reportUploading, setReportUploading] = useState(false);
  const [showBanMenu, setShowBanMenu] = useState(false);
  const [banLoading, setBanLoading] = useState(false);
  const [walletEditId, setWalletEditId] = useState("");
  const [walletEditUser, setWalletEditUser] = useState<UserProfile | null>(null);
  const [walletNewCoins, setWalletNewCoins] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [globalAlertText, setGlobalAlertText] = useState("");
  const [alertSending, setAlertSending] = useState(false);
  const [modLoading, setModLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [ormRoomName, setOrmRoomName] = useState("");
  const [ormTheme, setOrmTheme] = useState("galaxy");
  const [ormSeatCount, setOrmSeatCount] = useState("12");
  const [ormOfficialOnly, setOrmOfficialOnly] = useState(false);
  const [ormAutoEntry, setOrmAutoEntry] = useState(false);
  const [ormLoading, setOrmLoading] = useState(false);
  const [ormLoaded, setOrmLoaded] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [myFamily, setMyFamily] = useState<Family | null>(null);
  const [allFamilies, setAllFamilies] = useState<Family[]>([]);
  const [_familyLoading, setFamilyLoading] = useState(false);
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newFamilyIcon, setNewFamilyIcon] = useState("👑");
  const [newFamilyDesc, setNewFamilyDesc] = useState("");
  const [showLanguage, setShowLanguage] = useState(false);
  const [currentLang, setCurrentLang] = useState<Language>(getCurrentLanguage());
  const [showReportQueue, setShowReportQueue] = useState(false);
  const [reportQueue, setReportQueue] = useState<Report[]>([]);
  const [reportQueueFilter, setReportQueueFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const { showToast } = useToast();

  const isAdmin = isSuperAdmin(user);

  // ---------- NAVIGATION BAR AUTO-HIDE ON ANY SUB-PAGE ----------
  const subPageStates = [
    showLevelPage, showStorePage, showSettings, showAchievements,
    showPrivacyPolicy, showBlocked, showFriendRequests, showFriendsList,
    showReport, showSearch, showFeedback, showHelp, showBackpack,
    showAdminPanel, showOfficialRules, showFamily, showLanguage, showReportQueue, showApply,
    viewingProfile, showFollowersList, showFollowingList
  ];

  useEffect(() => {
    const anySubPageOpen = subPageStates.some(state => state === true);
    const styleId = "profile-nav-hider";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;

    if (anySubPageOpen) {
      if (!style) {
        style = document.createElement("style");
        style.id = styleId;
        document.head.appendChild(style);
      }
      style.textContent = `
        .bottom-navigation, .bottom-nav, .tab-bar, .bottom-tabs,
        .navigation-bar, .nav-bar-bottom, footer, nav.bottom,
        [class*='BottomNav'], [class*='bottomNav'], [class*='TabBar'],
        [class*='bottom-bar'], [class*='bottomBar']
        {
          display: none !important;
        }
      `;
    } else {
      if (style) style.remove();
    }
  }, subPageStates);

  // Inform parent when level page opens/closes
  useEffect(() => {
    if (showLevelPage) {
      onOpenSubPage?.("level");
    } else {
      onCloseSubPage?.();
    }
  }, [showLevelPage, onOpenSubPage, onCloseSubPage]);

  // Inform parent when store page opens/closes
  useEffect(() => {
    if (showStorePage) {
      onOpenSubPage?.("store");
    } else {
      onCloseSubPage?.();
    }
  }, [showStorePage, onOpenSubPage, onCloseSubPage]);

  // ---------- ALL HOOKS AND FUNCTIONS ----------
  const achievements = useMemo(() => getAchievementsList(user), [user]);
  const unlockedCount = useMemo(() => achievements.filter((a) => a.unlocked).length, [achievements]);
  const xpPct = useMemo(() => Math.min(100, (user.xp / (user.level * 1000)) * 100), [user.xp, user.level]);

  const openSubPage = useCallback((id: string) => onOpenSubPage?.(id), [onOpenSubPage]);
  const closeSubPage = useCallback(() => onCloseSubPage?.(), [onCloseSubPage]);

  const loadFriends = async () => {
    const friends = user.friendsList || [];
    const profiles: UserProfile[] = [];
    for (const fid of friends.slice(0, 50)) {
      const p = await getUser(fid);
      if (p) profiles.push(p);
    }
    setFriendProfiles(profiles);
  };

  const loadFollowers = async () => {
    setFollowerLoading(true);
    try {
      const freshUser = await getUser(user.uid);
      const list = freshUser?.followersList || [];
      const profiles: UserProfile[] = [];
      for (const uid of list.slice(0, 50)) {
        const p = await getUser(uid);
        if (p) profiles.push(p);
      }
      setFollowerProfiles(profiles);
    } catch {
      showToast("Failed to load followers", "error");
    } finally {
      setFollowerLoading(false);
    }
  };

  const loadFollowing = async () => {
    setFollowingLoading(true);
    try {
      const freshUser = await getUser(user.uid);
      const list = freshUser?.followingList || [];
      const profiles: UserProfile[] = [];
      for (const uid of list.slice(0, 50)) {
        const p = await getUser(uid);
        if (p) profiles.push(p);
      }
      setFollowingProfiles(profiles);
    } catch {
      showToast("Failed to load following", "error");
    } finally {
      setFollowingLoading(false);
    }
  };

  const loadBlocked = async () => {
    const blocked = user.blockedList || [];
    const profiles: UserProfile[] = [];
    for (const bid of blocked.slice(0, 50)) {
      const p = await getUser(bid);
      if (p) profiles.push(p);
    }
    setBlockedProfiles(profiles);
  };

  useEffect(() => {
    if (isAdmin) ensureSuperAdmin(user.uid).catch(console.error);
    if (isAdmin && !ormLoaded) {
      (async () => {
        try {
          const room = await ensureOfficialRoom(user.uid, user.name, user.avatar);
          setOrmRoomName(room.name || "New Friends Zone");
          setOrmTheme(room.theme || "galaxy");
          setOrmSeatCount(String(room.seats?.length || 12));
          setOrmOfficialOnly(room.micPermission === "admin_only");
          const autoRoom = await getAutoEntryRoom();
          setOrmAutoEntry(autoRoom === "11111");
          setOrmLoaded(true);
        } catch (e) {
          console.error("ORM load error:", e);
        }
      })();
    }
  }, [isAdmin, user.uid, ormLoaded]);

  useEffect(() => {
    const momentsRef = ref(db, "moments");
    onValue(momentsRef, (snap) => {
      if (!snap.exists()) {
        setMomentCount(0);
        return;
      }
      const val = snap.val();
      const count = Object.values(val).filter((m: any) => m.uid === user.uid).length;
      setMomentCount(count);
    });
    return () => off(momentsRef);
  }, [user.uid]);

  useEffect(() => {
    const unsub = subscribeFriendRequests(user.uid, setFriendRequests);
    return unsub;
  }, [user.uid]);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.userId || user.uid);
      showToast("Copied to Clipboard", "success", "✅");
    } catch {
      showToast("Copy failed", "error");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
    onLogout();
  };

  // ❌ Removed handleDailyReward (unused)

  // ---------- Friend Response ----------
  const handleFriendResponse = async (reqId: string, accept: boolean) => {
    const req = friendRequests.find((r) => r.id === reqId);
    await respondFriendRequest(user.uid, reqId, accept);
    setFriendRequests((prev) => prev.filter((r) => r.id !== reqId));
    if (accept && req) {
      showToast(`${req.fromName} added as friend! You can now chat.`, "success");
      try {
        await getOrCreateConversation(
          user.uid,
          user.name,
          user.avatar,
          req.fromUid,
          req.fromName,
          req.fromAvatar || ""
        );
      } catch {}
    } else {
      showToast("Request declined", "info");
    }
  };

  const handleFriendBlock = async (req: FriendRequest) => {
    await respondFriendRequest(user.uid, req.id, false);
    await blockUser(user.uid, req.fromUid);
    setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
    showToast(`${req.fromName} blocked`, "info");
  };

  const handleUnblock = async (uid: string) => {
    await unblockUser(user.uid, uid);
    setBlockedProfiles((prev) => prev.filter((p) => p.uid !== uid));
    showToast("User unblocked", "info");
  };

  const handleRemoveFriend = async (uid: string) => {
    await removeFriend(user.uid, uid);
    setFriendProfiles((prev) => prev.filter((p) => p.uid !== uid));
    showToast("Friend removed", "info");
  };

  // ---------- Unified Report & Feedback ----------
  const handleReport = async (isFeedback: boolean = false) => {
    const reason = isFeedback ? feedbackCategory : reportReason;
    const details = isFeedback ? feedbackMessage : reportDetails;
    const target = isFeedback ? "feedback" : (reportTarget || "general");

    if (!reason) {
      showToast(isFeedback ? "Please select a category" : "Please select a reason", "warning");
      return;
    }
    if (!details?.trim()) {
      showToast(isFeedback ? "Please describe your feedback" : "Please describe the issue", "warning");
      return;
    }

    setReportUploading(true);
    let attachmentUrl = "";
    const attachments = isFeedback ? feedbackAttachments : reportAttachments;
    const primaryAttachment = attachments[0] || reportAttachment;
    if (primaryAttachment) {
      if (primaryAttachment.size > 20 * 1024 * 1024) {
        showToast("Size of a single video cannot exceed 20 MB", "warning");
        setReportUploading(false);
        return;
      }
      try {
        const fileRef = storage.ref(`reports/${user.uid}/${Date.now()}_${primaryAttachment.name}`);
        await fileRef.uploadBytes(primaryAttachment);
        attachmentUrl = await fileRef.getDownloadURL();
      } catch {
        showToast("Failed to upload attachment", "error");
        setReportUploading(false);
        return;
      }
    }
    try {
      await reportUser(user.uid, target, reason, details, attachmentUrl);
      showToast("Thank you for your report/feedback!", "success");
      if (isFeedback) {
        setShowFeedback(false);
        setFeedbackCategory("");
        setFeedbackMessage("");
        setFeedbackAttachments([]);
      } else {
        setShowReport(false);
        setReportReason("");
        setReportDetails("");
        setReportTarget("");
        setReportAttachment(null);
        setReportAttachments([]);
      }
      closeSubPage();
    } catch {
      showToast("Failed to submit. Try again.", "error");
    }
    setReportUploading(false);
  };

  // ---------- Search ----------
  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    const results = await searchUsers(searchQuery.trim());
    setSearchResults(results.filter((u) => u.uid !== user.uid));
  };

  const handleAddFriend = async (target: UserProfile) => {
    await sendFriendRequest(user.uid, user.name, user.avatar, target.uid);
    showToast(`Friend request sent to ${target.name}!`, "success");
  };

  // ---------- Admin ----------
  const handleAdminLookup = async () => {
    if (!adminPromoteId.trim()) return;
    setAdminLoading(true);
    try {
      const found = await getUserByUserId(adminPromoteId.trim());
      setAdminLookupResult(found);
      if (!found) showToast("User not found", "warning");
    } catch {
      showToast("Lookup failed", "error");
    }
    setAdminLoading(false);
  };

  const handlePromoteOfficial = async () => {
    if (!adminLookupResult) return;
    setAdminLoading(true);
    try {
      await setOfficialRole(adminLookupResult.uid);
      showToast(`${adminLookupResult.name} promoted to Official!`, "success");
      setAdminLookupResult({
        ...adminLookupResult,
        globalRole: "official",
        frame: "assets/frames/official_frame.png",
      });
    } catch {
      showToast("Failed to promote", "error");
    }
    setAdminLoading(false);
  };

  const handleDemoteOfficial = async () => {
    if (!adminLookupResult) return;
    setAdminLoading(true);
    try {
      await removeOfficialRole(adminLookupResult.uid);
      showToast(`${adminLookupResult.name} demoted to User`, "info");
      setAdminLookupResult({ ...adminLookupResult, globalRole: "user", frame: undefined });
    } catch {
      showToast("Failed to demote", "error");
    }
    setAdminLoading(false);
  };

  // ---------- Backpack / Store ----------
  const handleEquip = async (itemId: string) => {
    setStoreLoading(itemId);
    try {
      await equipItem(user.uid, itemId);
      const item = getStoreItem(itemId);
      const updatedInv = { ...(user.inventory || {}) };
      for (const [k, v] of Object.entries(updatedInv)) {
        const si = getStoreItem(v.itemId);
        if (si && item && si.category === item.category) updatedInv[k] = { ...v, equipped: false };
      }
      if (updatedInv[itemId]) updatedInv[itemId] = { ...updatedInv[itemId], equipped: true };
      const updates: Partial<typeof user> = { inventory: updatedInv };
      if (item?.category === "frame") updates.equippedFrame = itemId;
      if (item?.category === "entry") updates.equippedEntry = itemId;
      if (item?.category === "theme") updates.equippedTheme = itemId;
      onUpdate({ ...user, ...updates });
      showToast(`${item?.name || "Item"} equipped!`, "success");
    } catch {
      showToast("Equip failed", "error");
    }
    setStoreLoading(null);
  };

  const handleUnequip = async (itemId: string) => {
    setStoreLoading(itemId);
    try {
      await unequipItem(user.uid, itemId);
      const item = getStoreItem(itemId);
      const updatedInv = { ...(user.inventory || {}) };
      if (updatedInv[itemId]) updatedInv[itemId] = { ...updatedInv[itemId], equipped: false };
      const updates: Partial<typeof user> = { inventory: updatedInv };
      if (item?.category === "frame") updates.equippedFrame = undefined;
      if (item?.category === "entry") updates.equippedEntry = undefined;
      if (item?.category === "theme") updates.equippedTheme = undefined;
      onUpdate({ ...user, ...updates });
      showToast("Item unequipped", "info");
    } catch {
      showToast("Unequip failed", "error");
    }
    setStoreLoading(null);
  };

  // ---------- Menu Actions ----------
  const handleMenu = (action: string) => {
    if (action === "edit") onEditProfile();
    if (action === "wallet") {
      if (onRecharge) onRecharge();
      return;
    }
    if (action === "achievements") {
      openSubPage("achievements");
      setShowAchievements(true);
    }
    if (action === "daily") { openSubPage("tasks"); setShowTasksPanel(true); }
    if (action === "privacyPolicy") {
      openSubPage("privacyPolicy");
      setShowPrivacyPolicy(true);
    }
    if (action === "blocked") {
      openSubPage("blocked");
      setShowBlocked(true);
      loadBlocked();
    }
    if (action === "friendRequests") {
      openSubPage("friendRequests");
      setShowFriendRequests(true);
    }
    if (action === "friendsList") {
      openSubPage("friendsList");
      setShowFriendsList(true);
      loadFriends();
    }
    if (action === "store") {
      setShowStorePage(true);
      return;
    }
    if (action === "backpack") {
      openSubPage("backpack");
      setShowBackpack(true);
      setBackpackCategory("frame");
    }
    if (action === "report") {
      openSubPage("report");
      setShowReport(true);
    }
    if (action === "search") {
      openSubPage("search");
      setShowSearch(true);
    }
    if (action === "feedback") {
      openSubPage("feedback");
      setShowFeedback(true);
    }
    if (action === "help") {
      openSubPage("help");
      setShowHelp(true);
    }
    if (action === "admin") {
      openSubPage("admin");
      setShowAdminPanel(true);
      setAdminPromoteId("");
      setAdminLookupResult(null);
    }
    if (action === "officialRules") {
      openSubPage("officialRules");
      setShowOfficialRules(true);
    }
    if (action === "apply") {
      openSubPage("apply");
      setShowApply(true);
    }
    if (action === "reportQueue") {
      openSubPage("reportQueue");
      setShowReportQueue(true);
      getReportQueue(reportQueueFilter).then(setReportQueue).catch(() => {});
    }
    if (action === "family") {
      openSubPage("family");
      setShowFamily(true);
      setFamilyLoading(true);
      getUserFamily(user.uid)
        .then((f) => setMyFamily(f))
        .catch(() => {});
      getAllFamilies()
        .then((f) => setAllFamilies(f.sort((a, b) => b.weeklyGifts - a.weeklyGifts)))
        .catch(() => {});
      setFamilyLoading(false);
    }
    if (action === "language") {
      openSubPage("language");
      setShowLanguage(true);
    }
  };

  const PROFILE_FUNCTIONS = [
    { icon: "💰", label: "Wallet", color: "#f59e0b", glow: "rgba(245,158,11,0.35)", action: "wallet" },
    { icon: "🛍️", label: "Store", color: "#a855f7", glow: "rgba(168,85,247,0.35)", action: "store" },
    { icon: "🎒", label: "Backpack", color: "#ec4899", glow: "rgba(236,72,153,0.35)", action: "backpack" },
    { icon: "🎤", label: "Be a Host", color: "#FFD700", glow: "rgba(255,215,0,0.35)", action: "apply" },
    { icon: "💡", label: "Help", color: "#22c55e", glow: "rgba(34,197,94,0.35)", action: "help" },
    { icon: "💬", label: "Feedback", color: "#06b6d4", glow: "rgba(6,182,212,0.35)", action: "feedback" },
  ];

  // ---------- CONDITIONAL RENDERS ----------
  if (showLevelPage) {
    return <UserLevelPage user={user} onBack={() => setShowLevelPage(false)} onUpdate={onUpdate} />;
  }
  if (showStorePage) {
    return <StorePage user={user} onBack={() => setShowStorePage(false)} onUpdate={onUpdate} />;
  }

  // ---------- MAIN RENDER ----------
  return (
    <div className="page-scroll no-screenshot" style={{ background: "#0a0820" }}>
      <div className="pf-hero">
        <img
          src="https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=1200&q=80"
          alt=""
          className="pf-hero-bg-img"
        />
        <div className="pf-hero-gradient" />

        <div className="pf-hero-top">
          <button className="pf-id-glass" onClick={handleCopyId}>
            <span className="pf-id-text">ID: {user.userId || "N/A"}</span>
            <span style={{ fontSize: 11 }}>📋</span>
          </button>
          <button
            className="pf-settings-btn"
            onClick={() => {
              openSubPage("settings");
              setShowSettings(true);
            }}
          >
            ⚙️
          </button>
        </div>

        <div className="pf-avatar-area">
          <div className="pf-avatar-wrap" onClick={onEditProfile}>
            <div className="pf-avatar-glow">
              <div className="pf-avatar-inner">
                {isAdmin ? (
                  <SuperAdminAvatar src={user.avatar} userId={user.userId || ""} size={92} onClick={onEditProfile} />
                ) : user.equippedFrame === "fantasy_gold_frame" ? (
                  <FantasyFrame size={92} variant="gold" animated>
                    {user.avatar?.startsWith("http") ? (
                      <img
                        src={user.avatar}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = "none";
                          const span = document.createElement("span");
                          span.style.fontSize = "28px";
                          span.style.color = "#fff";
                          span.textContent = user.name?.slice(0, 2).toUpperCase() || "👤";
                          img.parentElement!.appendChild(span);
                        }}
                      />
                    ) : (
                      <span className="pf-avatar-text">{user.name?.slice(0, 2).toUpperCase() || "👤"}</span>
                    )}
                  </FantasyFrame>
                ) : user.avatar?.startsWith?.("http") ? (
                  <img
                    src={user.avatar}
                    alt=""
                    className="pf-avatar-img"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = "none";
                      const span = document.createElement("span");
                      span.style.fontSize = "28px";
                      span.style.color = "#fff";
                      span.textContent = user.name?.slice(0, 2).toUpperCase() || "👤";
                      img.parentElement!.appendChild(span);
                    }}
                  />
                ) : (
                  <span className="pf-avatar-text">{user.name?.slice(0, 2).toUpperCase() || "👤"}</span>
                )}
              </div>
            </div>
            <div className="pf-avatar-edit-badge">✏️</div>
          </div>
        </div>
      </div>

      <div className="pf-info-block">
        <h2 className="pf-name">{user.name}</h2>
        {user.bio && <p className="pf-bio">{user.bio}</p>}

        <div className="pf-badge-line">
          <span className="pf-pink-badge">18</span>
          <span className="pf-flag">🇮🇳</span>
          <span className="pf-grey-pill" onClick={() => setShowLevelPage(true)} style={{ cursor: "pointer" }}>
            Lv.{user.level}
          </span>
          <span className="pf-grey-pill">Diamond</span>
          {user.vip && <span className="pf-verified-pill">👑</span>}
          {!isAdmin && user.globalRole === "official" ? (
            <OfficialBadge size="sm" />
          ) : (
            <span className="pf-home-icon">🏠</span>
          )}
        </div>

        <div className="pf-stats-row">
          {[
            { label: "Following", val: user.following || 0, action: () => { setShowFollowingList(true); loadFollowing(); } },
            { label: "Followers", val: user.followers || 0, action: () => { setShowFollowersList(true); loadFollowers(); } },
            { label: "Visitors", val: momentCount, dot: true },
          ].map((s) => (
            <div key={s.label} className="pf-stat-btn" onClick={s.action}>
              <p className="pf-stat-value">{s.val}</p>
              <p className="pf-stat-label">{s.label}</p>
              {s.dot && <div className="pf-stat-dot" />}
            </div>
          ))}
        </div>

        <div className="pf-level-badge-row" onClick={() => setShowLevelPage(true)} style={{ cursor: "pointer" }}>
          <div className="pf-level-badge">
            <div className="pf-level-badge-core">{user.level}</div>
            <span className="pf-wing">✦</span>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 9,
                color: "rgba(162,155,254,0.4)",
                marginBottom: 4,
              }}
            >
              <span>Lv.{user.level}</span>
              <span>{user.xp.toLocaleString()}/{(user.level * 1000).toLocaleString()} XP</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  borderRadius: 2,
                  width: `${xpPct}%`,
                  background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
                  transition: "width 0.5s",
                }}
              />
            </div>
          </div>
          <span className="pf-chevron">›</span>
        </div>
      </div>

      <div className="pf-functions-section">
        <p className="pf-section-title">Functions</p>
        <div className="pf-func-grid">
          {PROFILE_FUNCTIONS.map((item) => (
            <button key={item.label} className="pf-func-card" onClick={() => handleMenu(item.action)}>
              <div
                className="pf-func-bubble"
                style={{
                  background: `radial-gradient(circle at 30% 25%, ${item.color}33, ${item.color}0d 60%, transparent 100%), linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.2))`,
                  borderColor: `${item.color}55`,
                  boxShadow: `0 0 18px ${item.glow}, inset 0 1px 0 rgba(255,255,255,0.12)`,
                }}
              >
                <span className="pf-func-icon" style={{ filter: `drop-shadow(0 0 6px ${item.glow})` }}>
                  {item.icon}
                </span>
              </div>
              <span className="pf-func-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 16px", paddingBottom: 100 }}>
        <p
          style={{
            textAlign: "center",
            fontSize: 9,
            color: "rgba(139,122,170,0.2)",
            padding: "16px 0",
          }}
        >
          Galaxy Voice Chat v2.0 · UID: {user.uid.slice(0, 10).toUpperCase()}
        </p>
      </div>

      {/* ===== SETTINGS ===== */}
      {showSettings && (
        <SettingsPage
          user={user}
          isAdmin={isAdmin}
          friendRequestsCount={friendRequests.length}
          onMenuAction={handleMenu}
          onOpenSubPage={openSubPage}
          onCloseSubPage={closeSubPage}
          onLogout={handleLogout}
          onAdminRecharge={onAdminRecharge}
          onClose={() => {
            closeSubPage();
            setShowSettings(false);
          }}
        />
      )}

      {/* ===== ACHIEVEMENTS ===== */}
      {showAchievements && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowAchievements(false);
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>🏆 Achievements ({unlockedCount}/{achievements.length})</h2>
            <button
              onClick={() => {
                closeSubPage();
                setShowAchievements(false);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "rgba(162,155,254,0.5)",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {achievements.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  background: a.unlocked ? "rgba(108,92,231,0.1)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${a.unlocked ? "rgba(108,92,231,0.3)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 14,
                  opacity: a.unlocked ? 1 : 0.5,
                }}
              >
                <span style={{ fontSize: 28, filter: a.unlocked ? "none" : "grayscale(1)" }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: a.unlocked ? "#fff" : "rgba(255,255,255,0.5)" }}>
                    {a.title}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)" }}>{a.description}</p>
                </div>
                {a.unlocked && <span style={{ fontSize: 20 }}>✅</span>}
              </div>
            ))}
          </div>
        </BottomSheet>
      )}

      {/* ===== PRIVACY POLICY ===== */}
      {showPrivacyPolicy && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowPrivacyPolicy(false);
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#00ffff" }}>📜 Privacy Policy</h2>
            <button
              onClick={() => {
                closeSubPage();
                setShowPrivacyPolicy(false);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "rgba(162,155,254,0.5)",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0 20px 0" }}>
            <p style={{ fontSize: 11, color: "rgba(0,255,255,0.5)", marginBottom: 12 }}>
              Effective Date: May 15, 2026<br />
              Developed by: Galaxy Development Team
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#FFD700", marginTop: 8, marginBottom: 4 }}>
              1. Information We Collect
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, marginBottom: 12 }}>
              To provide a seamless and secure social experience, we collect the following information:<br />
              • Account Information: Your mobile number and password provided during registration to secure your identity.<br />
              • User Profile: Details such as your display name, avatar, gender, and date of birth.<br />
              • Activity Data: Metadata regarding your interactions, such as which voice rooms you join and the duration of your stay. We do not monitor or record private voice conversations.<br />
              • Technical Data: For security and anti-spam purposes, we collect device identifiers (Android ID/IMEI), IP addresses, and operating system versions.
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#FFD700", marginBottom: 4 }}>
              2. Permissions & Features
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, marginBottom: 12 }}>
              The App requires the following system permissions to function:<br />
              • Microphone Access: To enable real-time voice chat within rooms via the integrated SDK.<br />
              • Storage/Photo Library: To allow you to upload profile pictures and share media within the community.<br />
              • Push Notifications: To send alerts regarding room invitations, virtual gifts, and system updates.
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#FFD700", marginBottom: 4 }}>
              3. Data Usage & Security
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, marginBottom: 12 }}>
              • Service Optimization: We use your data to manage your account level (XP), VIP status, and digital badges.<br />
              • Security Measures: We utilize secure, encrypted servers to ensure your personal information is protected against unauthorized access.<br />
              • Third-Party Services: We use high-quality voice streaming SDKs that operate under their own strict privacy standards to ensure data integrity.
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#FFD700", marginBottom: 4 }}>
              4. Safety & Age Restriction
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, marginBottom: 12 }}>
              Galaxy Voice Chat is strictly for individuals aged 18 and older. We do not knowingly permit minors to use the platform. If we discover that a user is under the age of 18, their account will be terminated immediately.
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#FFD700", marginBottom: 4 }}>
              5. Account Deletion
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, marginBottom: 12 }}>
              Users may request to delete their account at any time through the App settings. Please ensure that all virtual balances (diamonds) are cleared before deletion, as this data cannot be recovered once the account is removed.
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#FFD700", marginBottom: 4 }}>
              6. Contact Support
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
              If you have any questions, technical issues, or wish to appeal an account ban, please contact our official support team at:<br />
              📧 <span style={{ color: "#00ffff" }}>galaxyvoicechat.support@gmail.com</span>
            </p>
          </div>
        </BottomSheet>
      )}

      {/* ===== FRIEND REQUESTS ===== */}
      {showFriendRequests && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowFriendRequests(false);
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>🤝 Friend Requests</h2>
            <button
              onClick={() => {
                closeSubPage();
                setShowFriendRequests(false);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "rgba(162,155,254,0.5)",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {friendRequests.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No pending requests</p>
            ) : (
              friendRequests.map((req) => (
                <div
                  key={req.id}
                  className="card"
                  style={{ padding: 14, marginBottom: 10, border: "1px solid rgba(108,92,231,0.15)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        fontSize: 24,
                        background: "rgba(108,92,231,0.12)",
                        border: "2px solid rgba(108,92,231,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {req.fromAvatar?.startsWith("http") ? (
                        <img
                          src={req.fromAvatar}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                        />
                      ) : (
                        <span>{req.fromAvatar || "👤"}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {req.fromName}
                      </p>
                      <p style={{ fontSize: 10, color: "rgba(162,155,254,0.35)", marginTop: 2 }}>
                        {new Date(req.timestamp).toLocaleDateString()} · wants to be friends
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleFriendResponse(req.id, true)}
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        borderRadius: 12,
                        border: "none",
                        cursor: "pointer",
                        background: "linear-gradient(135deg, rgba(0,230,118,0.2), rgba(0,230,118,0.08))",
                        color: "#00e676",
                        fontSize: 13,
                        fontWeight: 800,
                        fontFamily: "inherit",
                        boxShadow: "0 0 12px rgba(0,230,118,0.15)",
                      }}
                    >
                      ✔ Accept
                    </button>
                    <button
                      onClick={() => handleFriendResponse(req.id, false)}
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        borderRadius: 12,
                        border: "none",
                        cursor: "pointer",
                        background: "linear-gradient(135deg, rgba(255,82,82,0.2), rgba(255,82,82,0.08))",
                        color: "#ff5252",
                        fontSize: 13,
                        fontWeight: 800,
                        fontFamily: "inherit",
                        boxShadow: "0 0 12px rgba(255,82,82,0.15)",
                      }}
                    >
                      ✕ Decline
                    </button>
                    <button
                      onClick={() => handleFriendBlock(req)}
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        borderRadius: 12,
                        border: "none",
                        cursor: "pointer",
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 13,
                        fontWeight: 800,
                        fontFamily: "inherit",
                      }}
                    >
                      🚫 Block
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {/* ===== FRIENDS LIST ===== */}
      {showFriendsList && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowFriendsList(false);
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>👥 Friends ({user.friends || 0})</h2>
            <button
              onClick={() => {
                closeSubPage();
                setShowFriendsList(false);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "rgba(162,155,254,0.5)",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {friendProfiles.map((fp) => (
              <div
                key={fp.uid}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div
                  onClick={() => {
                    setShowFriendsList(false);
                    closeSubPage();
                    setViewingProfile(fp);
                    openSubPage("viewProfile");
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    fontSize: 20,
                    background: "rgba(108,92,231,0.15)",
                    border: "2px solid rgba(108,92,231,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                >
                  {fp.avatar?.startsWith("http") ? (
                    <img
                      src={fp.avatar}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).parentElement!.textContent = "👤";
                      }}
                    />
                  ) : fp.avatar && fp.avatar.length <= 4 ? (
                    fp.avatar
                  ) : (
                    "👤"
                  )}
                </div>
                <div
                  onClick={() => {
                    setShowFriendsList(false);
                    closeSubPage();
                    setViewingProfile(fp);
                    openSubPage("viewProfile");
                  }}
                  style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                >
                  <p style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {fp.name}
                  </p>
                  <p style={{ fontSize: 10, color: fp.online ? "#00e676" : "rgba(162,155,254,0.35)" }}>
                    {fp.online ? "Online" : "Offline"}
                  </p>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: 10, padding: "4px 10px", borderRadius: 10 }}
                  onClick={async () => {
                    try {
                      await getOrCreateConversation(
                        user.uid,
                        user.name,
                        user.avatar,
                        fp.uid,
                        fp.name,
                        fp.avatar
                      );
                      setShowFriendsList(false);
                      closeSubPage();
                      if (onMessage) onMessage(fp.uid);
                    } catch {
                      showToast("Could not open chat", "error");
                    }
                  }}
                >
                  💬
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 10, padding: "4px 10px" }}
                  onClick={() => handleRemoveFriend(fp.uid)}
                >
                  Remove
                </button>
              </div>
            ))}
            {friendProfiles.length === 0 && <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No friends yet</p>}
          </div>
        </BottomSheet>
      )}

      {/* ===== FOLLOWERS ===== */}
      {showFollowersList && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowFollowersList(false);
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>👥 Followers ({user.followers || 0})</h2>
            <button
              onClick={() => {
                closeSubPage();
                setShowFollowersList(false);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "rgba(162,155,254,0.5)",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {followerLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div className="skeleton skeleton-circle" style={{ width: 40, height: 40, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-text" style={{ width: "50%" }} />
                  </div>
                </div>
              ))
            ) : followerProfiles.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No followers yet</p>
            ) : (
              followerProfiles.map((fp) => (
                <div
                  key={fp.uid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div
                    onClick={() => {
                      setShowFollowersList(false);
                      closeSubPage();
                      setViewingProfile(fp);
                      openSubPage("viewProfile");
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      fontSize: 20,
                      background: "rgba(108,92,231,0.15)",
                      border: "2px solid rgba(108,92,231,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                      cursor: "pointer",
                    }}
                  >
                    {fp.avatar?.startsWith("http") ? (
                      <img
                        src={fp.avatar}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (e.target as HTMLImageElement).parentElement!.textContent = "👤";
                        }}
                      />
                    ) : fp.avatar && fp.avatar.length <= 4 ? (
                      fp.avatar
                    ) : (
                      "👤"
                    )}
                  </div>
                  <div
                    onClick={() => {
                      setShowFollowersList(false);
                      closeSubPage();
                      setViewingProfile(fp);
                      openSubPage("viewProfile");
                    }}
                    style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                  >
                    <p style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {fp.name}
                    </p>
                    <p style={{ fontSize: 10, color: fp.online ? "#00e676" : "rgba(162,155,254,0.35)" }}>
                      {fp.online ? "Online" : "Offline"}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: 10, padding: "4px 10px", borderRadius: 10 }}
                    onClick={async () => {
                      try {
                        await getOrCreateConversation(
                          user.uid,
                          user.name,
                          user.avatar,
                          fp.uid,
                          fp.name,
                          fp.avatar
                        );
                        setShowFollowersList(false);
                        closeSubPage();
                        if (onMessage) onMessage(fp.uid);
                      } catch {
                        showToast("Could not open chat", "error");
                      }
                    }}
                  >
                    💬 Chat
                  </button>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {/* ===== FOLLOWING ===== */}
      {showFollowingList && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowFollowingList(false);
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>👥 Following ({user.following || 0})</h2>
            <button
              onClick={() => {
                closeSubPage();
                setShowFollowingList(false);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "rgba(162,155,254,0.5)",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {followingLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div className="skeleton skeleton-circle" style={{ width: 40, height: 40, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-text" style={{ width: "50%" }} />
                  </div>
                </div>
              ))
            ) : followingProfiles.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No one followed yet</p>
            ) : (
              followingProfiles.map((fp) => (
                <div
                  key={fp.uid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div
                    onClick={() => {
                      setShowFollowingList(false);
                      closeSubPage();
                      setViewingProfile(fp);
                      openSubPage("viewProfile");
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      fontSize: 20,
                      background: "rgba(108,92,231,0.15)",
                      border: "2px solid rgba(108,92,231,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                      cursor: "pointer",
                    }}
                  >
                    {fp.avatar?.startsWith("http") ? (
                      <img
                        src={fp.avatar}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (e.target as HTMLImageElement).parentElement!.textContent = "👤";
                        }}
                      />
                    ) : fp.avatar && fp.avatar.length <= 4 ? (
                      fp.avatar
                    ) : (
                      "👤"
                    )}
                  </div>
                  <div
                    onClick={() => {
                      setShowFollowingList(false);
                      closeSubPage();
                      setViewingProfile(fp);
                      openSubPage("viewProfile");
                    }}
                    style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                  >
                    <p style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {fp.name}
                    </p>
                    <p style={{ fontSize: 10, color: fp.online ? "#00e676" : "rgba(162,155,254,0.35)" }}>
                      {fp.online ? "Online" : "Offline"}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: 10, padding: "4px 10px", borderRadius: 10 }}
                    onClick={async () => {
                      try {
                        await getOrCreateConversation(
                          user.uid,
                          user.name,
                          user.avatar,
                          fp.uid,
                          fp.name,
                          fp.avatar
                        );
                        setShowFollowingList(false);
                        closeSubPage();
                        if (onMessage) onMessage(fp.uid);
                      } catch {
                        showToast("Could not open chat", "error");
                      }
                    }}
                  >
                    💬 Chat
                  </button>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {/* ===== VIEW PROFILE ===== */}
      {viewingProfile && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setViewingProfile(null);
            setShowBanMenu(false);
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>Profile</h2>
            <button
              onClick={() => {
                closeSubPage();
                setViewingProfile(null);
                setShowBanMenu(false);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "rgba(162,155,254,0.5)",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingBottom: 16 }}>
            <div style={{ position: "relative" }}>
              <div
                className={viewingProfile.vip ? "vip-glow-border" : ""}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  fontSize: 40,
                  background: "rgba(108,92,231,0.15)",
                  border: viewingProfile.vip ? undefined : "3px solid rgba(108,92,231,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxShadow: viewingProfile.vip ? undefined : "0 0 15px rgba(108,92,231,0.2)",
                  transition: "all 0.3s ease",
                }}
              >
                {viewingProfile.avatar?.startsWith("http") ? (
                  <img
                    src={viewingProfile.avatar}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 40 }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).parentElement!.textContent = "👤";
                    }}
                  />
                ) : viewingProfile.avatar && viewingProfile.avatar.length <= 4 ? (
                  viewingProfile.avatar
                ) : (
                  "👤"
                )}
              </div>
              {viewingProfile.globalRole === "official" && !isSuperAdmin(viewingProfile) && (
                <OfficialBadge size="sm" />
              )}
            </div>
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <p style={{ fontSize: 18, fontWeight: 900 }}>{viewingProfile.name}</p>
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginTop: 4 }}>
                Level {viewingProfile.level} · {viewingProfile.xp} XP
              </p>
              {viewingProfile.bio && (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 6, lineHeight: 1.5 }}>
                  {viewingProfile.bio}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 900 }}>{viewingProfile.followers || 0}</p>
                <p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>Followers</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 900 }}>{viewingProfile.following || 0}</p>
                <p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>Following</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 900 }}>{viewingProfile.friends || 0}</p>
                <p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>Friends</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 900 }}>🎁 {viewingProfile.totalEarnings || 0}</p>
                <p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>Gifts</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8, width: "100%" }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, fontSize: 13, padding: "12px 0", borderRadius: 14 }}
                onClick={async () => {
                  try {
                    await getOrCreateConversation(
                      user.uid,
                      user.name,
                      user.avatar,
                      viewingProfile!.uid,
                      viewingProfile!.name,
                      viewingProfile!.avatar
                    );
                    setViewingProfile(null);
                    closeSubPage();
                    if (onMessage) onMessage(viewingProfile!.uid);
                  } catch {
                    showToast("Could not open chat", "error");
                  }
                }}
              >
                💬 Message
              </button>
              <button
                className="btn btn-ghost"
                style={{ flex: 1, fontSize: 13, padding: "12px 0", borderRadius: 14 }}
                onClick={async () => {
                  try {
                    const isF = (user.followingList || []).includes(viewingProfile!.uid);
                    if (isF) {
                      showToast("Already following!", "info");
                    } else {
                      const res = await followUser(user.uid, viewingProfile!.uid);
                      showToast(res.isMutual ? "You're now friends!" : "Followed!", "success");
                    }
                  } catch {
                    showToast("Follow failed", "error");
                  }
                }}
              >
                {(user.followingList || []).includes(viewingProfile.uid) ? "✅ Following" : "➕ Follow"}
              </button>
              <button
                className="btn btn-ghost"
                style={{ flex: 1, fontSize: 13, padding: "12px 0", borderRadius: 14 }}
                onClick={async () => {
                  try {
                    await sendFriendRequest(user.uid, user.name, user.avatar, viewingProfile!.uid);
                    showToast("Friend request sent!", "success");
                  } catch {
                    showToast("Request failed", "error");
                  }
                }}
              >
                🤝 Add Friend
              </button>
            </div>

            {isAdmin && viewingProfile && !isSuperAdmin(viewingProfile) && (
              <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 8 }}>
                <button
                  disabled={modLoading}
                  onClick={async () => {
                    if (!confirm(`Delete ${viewingProfile!.name}'s profile picture?`)) return;
                    setModLoading(true);
                    try {
                      await deleteUserAvatar(viewingProfile!.uid);
                      const refreshed = await getUser(viewingProfile!.uid);
                      if (refreshed) setViewingProfile(refreshed);
                      showToast("Profile picture deleted", "success");
                    } catch {
                      showToast("Failed to delete DP", "error");
                    }
                    setModLoading(false);
                  }}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    borderRadius: 12,
                    background: "rgba(255,60,60,0.08)",
                    border: "1px solid rgba(255,60,60,0.2)",
                    color: "#ff5555",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    opacity: modLoading ? 0.5 : 1,
                  }}
                >
                  🗑️ Delete DP
                </button>
                <button
                  disabled={modLoading}
                  onClick={async () => {
                    if (!confirm(`Reset ${viewingProfile!.name}'s name to "Galaxy User"?`)) return;
                    setModLoading(true);
                    try {
                      await resetUserName(viewingProfile!.uid);
                      const refreshed = await getUser(viewingProfile!.uid);
                      if (refreshed) setViewingProfile(refreshed);
                      showToast("Name reset to Galaxy User", "success");
                    } catch {
                      showToast("Failed to reset name", "error");
                    }
                    setModLoading(false);
                  }}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    borderRadius: 12,
                    background: "rgba(255,165,0,0.08)",
                    border: "1px solid rgba(255,165,0,0.2)",
                    color: "#ff9933",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    opacity: modLoading ? 0.5 : 1,
                  }}
                >
                  🔄 Reset Name
                </button>
              </div>
            )}

            {isAdmin && viewingProfile && !isSuperAdmin(viewingProfile) && (
              <div style={{ width: "100%", marginTop: 8 }}>
                <button
                  onClick={() => setShowBanMenu(!showBanMenu)}
                  style={{
                    width: "100%",
                    padding: "13px 0",
                    borderRadius: 14,
                    background: "linear-gradient(135deg, rgba(80,20,60,0.4), rgba(40,10,30,0.6))",
                    border: "1px solid rgba(255,60,60,0.25)",
                    color: "#ff6666",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  🛡️ Manage User {showBanMenu ? "▲" : "▼"}
                </button>

                {showBanMenu && (
                  <div
                    style={{
                      marginTop: 10,
                      background: "linear-gradient(135deg, rgba(30,10,25,0.95), rgba(20,8,35,0.98))",
                      border: "1px solid rgba(255,60,60,0.15)",
                      borderRadius: 16,
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 11,
                        color: "rgba(255,150,150,0.5)",
                        fontWeight: 600,
                        textAlign: "center",
                        marginBottom: 4,
                      }}
                    >
                      {isUserBanned(viewingProfile) ? "🔴 User is currently BANNED" : "🟢 User is active"}
                    </p>

                    {(["4h", "24h", "7d", "permanent"] as const).map((duration) => {
                      let label = "";
                      let desc = "";
                      let icon = "";
                      if (duration === "4h") {
                        label = "4 Hours Ban";
                        desc = "Temporary restriction";
                        icon = "⏰";
                      } else if (duration === "24h") {
                        label = "24 Hours Ban";
                        desc = "Daily restriction";
                        icon = "📅";
                      } else if (duration === "7d") {
                        label = "7 Days Ban";
                        desc = "Weekly restriction";
                        icon = "📆";
                      } else {
                        label = "Permanent ID Ban";
                        desc = "Total access block";
                        icon = "🚫";
                      }
                      return (
                        <button
                          key={duration}
                          disabled={banLoading}
                          onClick={async () => {
                            if (
                              !confirm(
                                `Are you sure you want to apply "${label}" to ${viewingProfile!.name}?`
                              )
                            )
                              return;
                            setBanLoading(true);
                            try {
                              await banUser(viewingProfile!.uid, duration, user.uid);
                              const refreshed = await getUser(viewingProfile!.uid);
                              if (refreshed) setViewingProfile(refreshed);
                              showToast(`${viewingProfile!.name} has been banned (${label})`, "success");
                            } catch {
                              showToast("Ban failed", "error");
                            }
                            setBanLoading(false);
                          }}
                          style={{
                            padding: "11px 14px",
                            borderRadius: 12,
                            background: "rgba(255,40,40,0.08)",
                            border: "1px solid rgba(255,60,60,0.15)",
                            color: duration === "permanent" ? "#ff3333" : "#ff5555",
                            fontWeight: duration === "permanent" ? 800 : 600,
                            fontSize: 13,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            textAlign: "left",
                            opacity: banLoading ? 0.5 : 1,
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{icon}</span>
                          <div>
                            <div>{label}</div>
                            <div style={{ fontSize: 10, color: "rgba(255,150,150,0.4)", fontWeight: 400 }}>
                              {desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

                    <button
                      disabled={banLoading || !isUserBanned(viewingProfile)}
                      onClick={async () => {
                        if (
                          !confirm(
                            `Remove ban from ${viewingProfile!.name}? They will be able to access the app again.`
                          )
                        )
                          return;
                        setBanLoading(true);
                        try {
                          await unbanUser(viewingProfile!.uid, user.uid);
                          const refreshed = await getUser(viewingProfile!.uid);
                          if (refreshed) setViewingProfile(refreshed);
                          showToast(`${viewingProfile!.name} has been unbanned`, "success");
                        } catch {
                          showToast("Unban failed", "error");
                        }
                        setBanLoading(false);
                      }}
                      style={{
                        padding: "11px 14px",
                        borderRadius: 12,
                        background: "rgba(0,200,100,0.08)",
                        border: "1px solid rgba(0,200,100,0.2)",
                        color: isUserBanned(viewingProfile) ? "#00cc66" : "rgba(0,200,100,0.3)",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: isUserBanned(viewingProfile) ? "pointer" : "default",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        opacity: banLoading || !isUserBanned(viewingProfile) ? 0.4 : 1,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>✅</span>
                      <div>
                        <div>Remove Ban</div>
                        <div style={{ fontSize: 10, color: "rgba(0,200,100,0.4)", fontWeight: 400 }}>
                          Restore access
                        </div>
                      </div>
                    </button>

                    <button
                      disabled={banLoading}
                      onClick={async () => {
                        if (
                          !confirm(
                            `Device ban ${viewingProfile!.name}? Their device will be permanently blocked.`
                          )
                        )
                          return;
                        setBanLoading(true);
                        try {
                          await deviceBanUser(viewingProfile!.uid, user.uid);
                          const refreshed = await getUser(viewingProfile!.uid);
                          if (refreshed) setViewingProfile(refreshed);
                          showToast(`${viewingProfile!.name} device banned!`, "success");
                        } catch {
                          showToast("Device ban failed", "error");
                        }
                        setBanLoading(false);
                      }}
                      style={{
                        padding: "11px 14px",
                        borderRadius: 12,
                        background: viewingProfile.deviceBanned
                          ? "rgba(255,60,60,0.04)"
                          : "rgba(255,60,60,0.08)",
                        border: "1px solid rgba(255,60,60,0.15)",
                        color: viewingProfile.deviceBanned ? "rgba(255,60,60,0.35)" : "#ff5555",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: viewingProfile.deviceBanned ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        opacity: banLoading || viewingProfile.deviceBanned ? 0.4 : 1,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>📱</span>
                      <div>
                        <div>{viewingProfile.deviceBanned ? "Already Device Banned" : "Device Ban"}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,150,150,0.4)", fontWeight: 400 }}>
                          Block device permanently
                        </div>
                      </div>
                    </button>

                    {viewingProfile.deviceBanned && (
                      <button
                        disabled={banLoading}
                        onClick={async () => {
                          if (!confirm(`Remove device ban from ${viewingProfile!.name}?`)) return;
                          setBanLoading(true);
                          try {
                            await unbanUser(viewingProfile!.uid, user.uid);
                            const { update: fbUpdate, ref: fbRef } = await import("firebase/database");
                            const { db: fbDb } = await import("../lib/firebase");
                            await fbUpdate(fbRef(fbDb, `users/${viewingProfile!.uid}`), { deviceBanned: false });
                            const refreshed = await getUser(viewingProfile!.uid);
                            if (refreshed) setViewingProfile(refreshed);
                            showToast(`${viewingProfile!.name} device ban removed!`, "success");
                          } catch {
                            showToast("Failed to remove device ban", "error");
                          }
                          setBanLoading(false);
                        }}
                        style={{
                          padding: "11px 14px",
                          borderRadius: 12,
                          background: "rgba(0,200,100,0.08)",
                          border: "1px solid rgba(0,200,100,0.2)",
                          color: "#00cc66",
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          opacity: banLoading ? 0.4 : 1,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>✅</span>
                        <div>
                          <div>Remove Device Ban</div>
                          <div style={{ fontSize: 10, color: "rgba(0,200,100,0.4)", fontWeight: 400 }}>
                            Unblock device
                          </div>
                        </div>
                      </button>
                    )}

                    <div style={{ height: 1, background: "rgba(191,0,255,0.1)", margin: "4px 0" }} />

                    <button
                      disabled={banLoading || viewingProfile.shadowBanned}
                      onClick={async () => {
                        if (
                          !confirm(
                            `Shadow ban ${viewingProfile!.name}? They can still use the app but messages will be hidden.`
                          )
                        )
                          return;
                        setBanLoading(true);
                        try {
                          await shadowBanUser(viewingProfile!.uid, user.uid);
                          const refreshed = await getUser(viewingProfile!.uid);
                          if (refreshed) setViewingProfile(refreshed);
                          showToast(`${viewingProfile!.name} shadow banned!`, "success");
                        } catch {
                          showToast("Shadow ban failed", "error");
                        }
                        setBanLoading(false);
                      }}
                      style={{
                        padding: "11px 14px",
                        borderRadius: 12,
                        background: viewingProfile.shadowBanned
                          ? "rgba(191,0,255,0.04)"
                          : "rgba(191,0,255,0.08)",
                        border: "1px solid rgba(191,0,255,0.15)",
                        color: viewingProfile.shadowBanned ? "rgba(191,0,255,0.35)" : "#bf00ff",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: viewingProfile.shadowBanned ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        opacity: banLoading || viewingProfile.shadowBanned ? 0.4 : 1,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>👻</span>
                      <div>
                        <div>{viewingProfile.shadowBanned ? "Already Shadow Banned" : "Shadow Ban"}</div>
                        <div style={{ fontSize: 10, color: "rgba(191,0,255,0.4)", fontWeight: 400 }}>
                          Hide messages silently
                        </div>
                      </div>
                    </button>

                    {viewingProfile.shadowBanned && (
                      <button
                        disabled={banLoading}
                        onClick={async () => {
                          if (!confirm(`Lift shadow ban from ${viewingProfile!.name}?`)) return;
                          setBanLoading(true);
                          try {
                            await removeShadowBan(viewingProfile!.uid, user.uid);
                            const refreshed = await getUser(viewingProfile!.uid);
                            if (refreshed) setViewingProfile(refreshed);
                            showToast(`Shadow ban lifted from ${viewingProfile!.name}`, "success");
                          } catch {
                            showToast("Failed to lift shadow ban", "error");
                          }
                          setBanLoading(false);
                        }}
                        style={{
                          padding: "11px 14px",
                          borderRadius: 12,
                          background: "rgba(0,200,100,0.08)",
                          border: "1px solid rgba(0,200,100,0.2)",
                          color: "#00cc66",
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          opacity: banLoading ? 0.4 : 1,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>✅</span>
                        <div>
                          <div>Lift Shadow Ban</div>
                          <div style={{ fontSize: 10, color: "rgba(0,200,100,0.4)", fontWeight: 400 }}>
                            Restore message visibility
                          </div>
                        </div>
                      </button>
                    )}

                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {viewingProfile.isBanned && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: 8,
                            background: "rgba(255,60,60,0.15)",
                            border: "1px solid rgba(255,60,60,0.3)",
                            color: "#ff5555",
                          }}
                        >
                          🔴 BANNED
                        </span>
                      )}
                      {viewingProfile.deviceBanned && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: 8,
                            background: "rgba(255,60,60,0.15)",
                            border: "1px solid rgba(255,60,60,0.3)",
                            color: "#ff3333",
                          }}
                        >
                          📱 DEVICE BANNED
                        </span>
                      )}
                      {viewingProfile.shadowBanned && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: 8,
                            background: "rgba(191,0,255,0.15)",
                            border: "1px solid rgba(191,0,255,0.3)",
                            color: "#bf00ff",
                          }}
                        >
                          👻 SHADOW BANNED
                        </span>
                      )}
                      {!viewingProfile.isBanned &&
                        !viewingProfile.deviceBanned &&
                        !viewingProfile.shadowBanned && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              padding: "3px 8px",
                              borderRadius: 8,
                              background: "rgba(0,230,118,0.1)",
                              border: "1px solid rgba(0,230,118,0.25)",
                              color: "#00e676",
                            }}
                          >
                            🟢 ACTIVE
                          </span>
                        )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {/* ===== BLOCKED USERS ===== */}
      {showBlocked && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowBlocked(false);
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>🚫 Blocked Users</h2>
            <button
              onClick={() => {
                closeSubPage();
                setShowBlocked(false);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "rgba(162,155,254,0.5)",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {blockedProfiles.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No blocked users</p>
            ) : (
              blockedProfiles.map((bp) => (
                <div
                  key={bp.uid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <span style={{ fontSize: 24 }}>{bp.avatar}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{bp.name}</p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 10, padding: "4px 10px" }}
                    onClick={() => handleUnblock(bp.uid)}
                  >
                    Unblock
                  </button>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {/* ===== REPORT ===== */}
      {showReport && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowReport(false);
            setReportAttachment(null);
            setReportAttachments([]);
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>⚠️ Report Issue</h2>
            <button
              onClick={() => { closeSubPage(); setShowReport(false); setReportAttachment(null); setReportAttachments([]); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}
            >✕</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input
              className="input-field"
              placeholder="User ID (optional)"
              value={reportTarget}
              onChange={(e) => setReportTarget(e.target.value)}
              style={{ borderRadius: 14, padding: "12px 14px" }}
            />

            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(162,155,254,0.6)", margin: "0 0 8px 0" }}>Select Reason</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["Underage", "Abuse", "Spam", "Illegal", "App issues", "Room violations", "Violence", "Other"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setReportReason(r)}
                    style={{
                      padding: "8px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: "inherit",
                      background: reportReason === r ? "rgba(255,70,110,0.25)" : "rgba(255,255,255,0.04)",
                      color: reportReason === r ? "#ff6482" : "rgba(162,155,254,0.5)",
                      fontSize: 12, fontWeight: 600,
                      boxShadow: reportReason === r ? "0 0 8px rgba(255,100,130,0.3)" : "none",
                      transition: "all 0.2s",
                    }}
                  >{r}</button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(162,155,254,0.6)", margin: "0 0 6px 0" }}>Details</p>
              <div style={{ position: "relative" }}>
                <textarea
                  className="input-field"
                  placeholder="Describe the issue you are experiencing..."
                  value={reportDetails}
                  onChange={(e) => { if (e.target.value.length <= 200) setReportDetails(e.target.value); }}
                  rows={3}
                  style={{ borderRadius: 14, padding: "12px 14px 28px 14px", resize: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
                />
                <span style={{
                  position: "absolute", bottom: 8, right: 12, fontSize: 11, pointerEvents: "none",
                  color: reportDetails.length >= 180 ? "#f43f5e" : "rgba(162,155,254,0.4)",
                }}>{reportDetails.length}/200</span>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(162,155,254,0.6)", margin: 0 }}>Evidence (Optional)</p>
                <span style={{ fontSize: 11, color: "rgba(162,155,254,0.4)" }}>{reportAttachments.length}/3</span>
              </div>
              {reportAttachments.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  {reportAttachments.map((file, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <div style={{
                        width: 60, height: 60, borderRadius: 10,
                        background: "rgba(255,70,110,0.1)", border: "1px solid rgba(255,100,130,0.2)",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        fontSize: 20, gap: 2,
                      }}>
                        <span>{file.type.startsWith("image/") ? "🖼️" : "🎬"}</span>
                        <span style={{ fontSize: 9, color: "rgba(255,100,130,0.6)" }}>
                          {(file.size / 1024 / 1024).toFixed(1)}MB
                        </span>
                      </div>
                      <button
                        onClick={() => setReportAttachments(prev => prev.filter((_, j) => j !== i))}
                        style={{
                          position: "absolute", top: -6, right: -6, width: 18, height: 18,
                          background: "#ff4757", border: "none", borderRadius: "50%", color: "#fff",
                          cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center",
                          justifyContent: "center", padding: 0,
                        }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
              {reportAttachments.length < 3 && (
                <button
                  onClick={() => setShowReportAttachPicker(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "13px 16px",
                    background: "rgba(255,255,255,0.04)", border: "1.5px dashed rgba(255,100,130,0.28)",
                    borderRadius: 14, cursor: "pointer", width: "100%", fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: 20 }}>📎</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "rgba(162,155,254,0.5)", textAlign: "left" }}>
                    Add evidence · Max 3 photos OR 1 video + 2 photos
                  </span>
                  <span style={{ fontSize: 22, color: "rgba(255,100,130,0.35)", fontWeight: 300, lineHeight: 1 }}>+</span>
                </button>
              )}
            </div>

            {showReportAttachPicker && (
              <div
                style={{ position: "fixed", inset: 0, zIndex: 6000, background: "rgba(0,0,0,0.72)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
                onClick={() => setShowReportAttachPicker(false)}
              >
                <div
                  style={{
                    background: "linear-gradient(180deg,#1e0f1e,#0d0926)",
                    borderRadius: "24px 24px 0 0", padding: "20px 16px 40px",
                    border: "1px solid rgba(255,100,130,0.12)", maxWidth: 400, width: "100%", margin: "0 auto",
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,100,130,0.3)" }} />
                  </div>
                  <p style={{ textAlign: "center", fontSize: 15, fontWeight: 800, color: "#fff", margin: "0 0 18px 0" }}>Add Evidence</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "15px 18px",
                      background: "rgba(255,70,110,0.08)", border: "1px solid rgba(255,100,130,0.2)",
                      borderRadius: 16, cursor: "pointer",
                    }}>
                      <span style={{ fontSize: 26 }}>📷</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 15, color: "#fff" }}>Picture</p>
                        <p style={{ margin: 0, fontSize: 12, color: "rgba(162,155,254,0.5)" }}>Select photos from gallery</p>
                      </div>
                      <input type="file" accept="image/*" multiple style={{ display: "none" }}
                        onChange={(e) => {
                          setShowReportAttachPicker(false);
                          const files = Array.from(e.target.files || []);
                          const photoCount = reportAttachments.filter(f => f.type.startsWith("image/")).length;
                          const videoCount = reportAttachments.filter(f => f.type.startsWith("video/")).length;
                          const toAdd: File[] = [];
                          for (const f of files) {
                            const curPhoto = photoCount + toAdd.length;
                            const canAdd = videoCount === 0 ? curPhoto < 3 : curPhoto < 2;
                            if (!canAdd) { showToast("Select up to 3 items: Max 3 photos OR 1 video + 2 photos", "warning"); break; }
                            toAdd.push(f);
                          }
                          if (toAdd.length) setReportAttachments(prev => [...prev, ...toAdd]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <label style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "15px 18px",
                      background: "rgba(255,70,110,0.08)", border: "1px solid rgba(255,100,130,0.2)",
                      borderRadius: 16, cursor: "pointer",
                    }}>
                      <span style={{ fontSize: 26 }}>🎬</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 15, color: "#fff" }}>Video</p>
                        <p style={{ margin: 0, fontSize: 12, color: "rgba(162,155,254,0.5)" }}>Max 20MB · 1 video per submission</p>
                      </div>
                      <input type="file" accept="video/*" style={{ display: "none" }}
                        onChange={(e) => {
                          setShowReportAttachPicker(false);
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > 20 * 1024 * 1024) { showToast("Size of a single video cannot exceed 20 MB", "warning"); e.target.value = ""; return; }
                          const videoCount = reportAttachments.filter(x => x.type.startsWith("video/")).length;
                          const photoCount = reportAttachments.filter(x => x.type.startsWith("image/")).length;
                          if (videoCount >= 1 || photoCount > 2) { showToast("Select up to 3 items: Max 3 photos OR 1 video + 2 photos", "warning"); e.target.value = ""; return; }
                          setReportAttachments(prev => [...prev, f]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      onClick={() => setShowReportAttachPicker(false)}
                      style={{
                        padding: "15px 0", borderRadius: 16, border: "none",
                        background: "rgba(255,255,255,0.06)", color: "rgba(162,155,254,0.7)",
                        fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer",
                      }}
                    >Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <button
              style={{
                width: "100%", padding: "15px 0", borderRadius: 22, border: "none",
                background: "linear-gradient(90deg, #ff4757, #c0392b)",
                color: "#fff", fontWeight: 800, fontSize: 15, cursor: reportUploading ? "default" : "pointer",
                opacity: reportUploading ? 0.6 : 1,
                boxShadow: "0 0 18px rgba(255,71,87,0.4)",
                transition: "all 0.2s", fontFamily: "inherit",
              }}
              onClick={() => handleReport(false)}
              disabled={reportUploading}
            >
              {reportUploading ? "Uploading..." : "Submit Report"}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ===== SEARCH ===== */}
      {showSearch && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowSearch(false);
            setSearchResults([]);
            setSearchQuery("");
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>🔍 Find Users</h2>
            <button
              onClick={() => {
                closeSubPage();
                setShowSearch(false);
                setSearchResults([]);
                setSearchQuery("");
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "rgba(162,155,254,0.5)",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              className="input-field"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              style={{ flex: 1, borderRadius: 14, padding: "12px 14px" }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleSearch}>
              🔍
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {searchResults.map((sr) => {
              const isFriend = (user.friendsList || []).includes(sr.uid);
              return (
                <div
                  key={sr.uid}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <span style={{ fontSize: 24 }}>{sr.avatar}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{sr.name}</p>
                    <p style={{ fontSize: 10, color: "rgba(162,155,254,0.35)" }}>Lv.{sr.level}</p>
                  </div>
                  {isFriend ? (
                    <span style={{ fontSize: 11, color: "#00e676", fontWeight: 600 }}>Friends</span>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: 10, padding: "4px 10px" }}
                      onClick={() => handleAddFriend(sr)}
                    >
                      Add Friend
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </BottomSheet>
      )}

      {/* ===== FEEDBACK ===== */}
      {showFeedback && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowFeedback(false);
            setFeedbackCategory("");
            setFeedbackMessage("");
            setFeedbackAttachments([]);
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>💬 Send Feedback</h2>
            <button
              onClick={() => {
                closeSubPage();
                setShowFeedback(false);
                setFeedbackCategory("");
                setFeedbackMessage("");
                setFeedbackAttachments([]);
              }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}
            >✕</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(162,155,254,0.6)", margin: "0 0 10px 0" }}>Select Category</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["Underage", "App problems", "Suggestion", "Hashtag", "Recharge", "Room", "Login", "Others"].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFeedbackCategory(cat)}
                    style={{
                      padding: "8px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                      fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                      background: feedbackCategory === cat
                        ? "linear-gradient(90deg, #C084FC, #818CF8)"
                        : "rgba(255,255,255,0.05)",
                      color: feedbackCategory === cat ? "#fff" : "rgba(162,155,254,0.55)",
                      boxShadow: feedbackCategory === cat ? "0 0 10px rgba(192,132,252,0.4)" : "none",
                      transition: "all 0.2s",
                    }}
                  >{cat}</button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(162,155,254,0.6)", margin: "0 0 6px 0" }}>Description</p>
              <div style={{ position: "relative" }}>
                <textarea
                  className="input-field"
                  placeholder="Describe your feedback in detail..."
                  value={feedbackMessage}
                  onChange={(e) => { if (e.target.value.length <= 200) setFeedbackMessage(e.target.value); }}
                  rows={4}
                  style={{ borderRadius: 14, padding: "12px 14px 28px 14px", resize: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
                />
                <span style={{
                  position: "absolute", bottom: 8, right: 12, fontSize: 11, pointerEvents: "none",
                  color: feedbackMessage.length >= 180 ? "#f43f5e" : "rgba(162,155,254,0.4)",
                }}>{feedbackMessage.length}/200</span>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(162,155,254,0.6)", margin: 0 }}>Attachments (Optional)</p>
                <span style={{ fontSize: 11, color: "rgba(162,155,254,0.4)" }}>{feedbackAttachments.length}/3</span>
              </div>

              {feedbackAttachments.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  {feedbackAttachments.map((file, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: 10,
                        background: "rgba(108,92,231,0.15)", border: "1px solid rgba(162,155,254,0.15)",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        fontSize: 22, gap: 2,
                      }}>
                        <span>{file.type.startsWith("image/") ? "🖼️" : "🎬"}</span>
                        <span style={{ fontSize: 9, color: "rgba(162,155,254,0.5)" }}>
                          {(file.size / 1024 / 1024).toFixed(1)}MB
                        </span>
                      </div>
                      <button
                        onClick={() => setFeedbackAttachments(prev => prev.filter((_, j) => j !== i))}
                        style={{
                          position: "absolute", top: -6, right: -6, width: 18, height: 18,
                          background: "#ff4757", border: "none", borderRadius: "50%", color: "#fff",
                          cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center",
                          justifyContent: "center", padding: 0, lineHeight: 1,
                        }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {feedbackAttachments.length < 3 && (
                <button
                  onClick={() => setShowFeedbackAttachPicker(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "13px 16px",
                    background: "rgba(255,255,255,0.04)", border: "1.5px dashed rgba(162,155,254,0.28)",
                    borderRadius: 14, cursor: "pointer", width: "100%", fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: 20 }}>📎</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "rgba(162,155,254,0.5)", textAlign: "left" }}>
                    Add photo/video · Max 3 photos OR 1 video + 2 photos
                  </span>
                  <span style={{ fontSize: 22, color: "rgba(162,155,254,0.35)", fontWeight: 300, lineHeight: 1 }}>+</span>
                </button>
              )}
            </div>

            {showFeedbackAttachPicker && (
              <div
                style={{ position: "fixed", inset: 0, zIndex: 6000, background: "rgba(0,0,0,0.72)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
                onClick={() => setShowFeedbackAttachPicker(false)}
              >
                <div
                  style={{
                    background: "linear-gradient(180deg,#1e1040,#0d0926)",
                    borderRadius: "24px 24px 0 0", padding: "20px 16px 40px",
                    border: "1px solid rgba(162,155,254,0.12)", maxWidth: 400, width: "100%", margin: "0 auto",
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(162,155,254,0.3)" }} />
                  </div>
                  <p style={{ textAlign: "center", fontSize: 15, fontWeight: 800, color: "#fff", margin: "0 0 18px 0" }}>Add Attachment</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "15px 18px",
                      background: "rgba(108,92,231,0.1)", border: "1px solid rgba(108,92,231,0.25)",
                      borderRadius: 16, cursor: "pointer",
                    }}>
                      <span style={{ fontSize: 26 }}>📷</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 15, color: "#fff" }}>Picture</p>
                        <p style={{ margin: 0, fontSize: 12, color: "rgba(162,155,254,0.5)" }}>Select photos from gallery</p>
                      </div>
                      <input type="file" accept="image/*" multiple style={{ display: "none" }}
                        onChange={(e) => {
                          setShowFeedbackAttachPicker(false);
                          const files = Array.from(e.target.files || []);
                          const photoCount = feedbackAttachments.filter(f => f.type.startsWith("image/")).length;
                          const videoCount = feedbackAttachments.filter(f => f.type.startsWith("video/")).length;
                          const toAdd: File[] = [];
                          for (const f of files) {
                            const curPhoto = photoCount + toAdd.length;
                            const canAdd = videoCount === 0 ? curPhoto < 3 : curPhoto < 2;
                            if (!canAdd) { showToast("Select up to 3 items: Max 3 photos OR 1 video + 2 photos", "warning"); break; }
                            toAdd.push(f);
                          }
                          if (toAdd.length) setFeedbackAttachments(prev => [...prev, ...toAdd]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <label style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "15px 18px",
                      background: "rgba(108,92,231,0.1)", border: "1px solid rgba(108,92,231,0.25)",
                      borderRadius: 16, cursor: "pointer",
                    }}>
                      <span style={{ fontSize: 26 }}>🎬</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 15, color: "#fff" }}>Video</p>
                        <p style={{ margin: 0, fontSize: 12, color: "rgba(162,155,254,0.5)" }}>Max 20MB · 1 video per submission</p>
                      </div>
                      <input type="file" accept="video/*" style={{ display: "none" }}
                        onChange={(e) => {
                          setShowFeedbackAttachPicker(false);
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > 20 * 1024 * 1024) { showToast("Size of a single video cannot exceed 20 MB", "warning"); e.target.value = ""; return; }
                          const videoCount = feedbackAttachments.filter(x => x.type.startsWith("video/")).length;
                          const photoCount = feedbackAttachments.filter(x => x.type.startsWith("image/")).length;
                          if (videoCount >= 1 || photoCount > 2) { showToast("Select up to 3 items: Max 3 photos OR 1 video + 2 photos", "warning"); e.target.value = ""; return; }
                          setFeedbackAttachments(prev => [...prev, f]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      onClick={() => setShowFeedbackAttachPicker(false)}
                      style={{
                        padding: "15px 0", borderRadius: 16, border: "none",
                        background: "rgba(255,255,255,0.06)", color: "rgba(162,155,254,0.7)",
                        fontFamily: "inherit", fontSize: 15, fontWeight: 700, cursor: "pointer",
                      }}
                    >Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => handleReport(true)}
              disabled={feedbackSending}
              style={{
                width: "100%", padding: "16px 0", borderRadius: 22, border: "none",
                background: "radial-gradient(ellipse at center, #7c3aed 0%, #4f46e5 100%)",
                color: "#fff", fontWeight: 800, fontSize: 15,
                cursor: feedbackSending ? "default" : "pointer",
                opacity: feedbackSending ? 0.6 : 1,
                boxShadow: "0 0 20px rgba(124,58,237,0.45)",
                transition: "all 0.2s",
                fontFamily: "inherit",
              }}
            >
              {feedbackSending ? "Sending..." : "Submit Feedback"}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ===== HELP ===== */}
      {showHelp && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowHelp(false);
            setShowHelpArticle(null);
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            {showHelpArticle ? (
              <button
                onClick={() => setShowHelpArticle(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#A29BFE",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ‹ Back
              </button>
            ) : (
              <h2 style={{ fontSize: 18, fontWeight: 900 }}>❓ Help Center</h2>
            )}
            <button
              onClick={() => {
                closeSubPage();
                setShowHelp(false);
                setShowHelpArticle(null);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "rgba(162,155,254,0.5)",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {showHelpArticle ? (
              (() => {
                const article = HELP_ARTICLES.find((a) => a.id === showHelpArticle);
                if (!article) return null;
                return (
                  <div style={{ padding: "0 4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: 32 }}>{article.icon}</span>
                      <h3 style={{ fontSize: 17, fontWeight: 800 }}>{article.title}</h3>
                    </div>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.8 }}>
                      {article.content}
                    </p>
                  </div>
                );
              })()
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {HELP_ARTICLES.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => setShowHelpArticle(article.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 12px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 14,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      width: "100%",
                      transition: "background 0.15s",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(108,92,231,0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  >
                    <span style={{ fontSize: 22, width: 28, textAlign: "center" }}>{article.icon}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
                      {article.title}
                    </span>
                    <span style={{ color: "rgba(162,155,254,0.3)", fontSize: 14 }}>›</span>
                  </button>
                ))}
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.3)" }}>
                    Need more help? Send us feedback!
                  </p>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: 8, fontSize: 11 }}
                    onClick={() => {
                      setShowHelp(false);
                      setShowFeedback(true);
                    }}
                  >
                    💬 Send Feedback
                  </button>
                </div>
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {/* ===== ADMIN PANEL ===== */}
      {showAdminPanel && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowAdminPanel(false);
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#FFD700" }}>🛡️ Admin Panel</h2>
            <button
              onClick={() => {
                closeSubPage();
                setShowAdminPanel(false);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "rgba(162,155,254,0.5)",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {/* Official Promoter */}
            <div className="card" style={{ padding: 16, marginBottom: 14, border: "1px solid rgba(255,215,0,0.2)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#FFD700" }}>
                👑 Official Promoter
              </h3>
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 10 }}>
                Enter a User ID to promote or demote as Official
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={adminPromoteId}
                  onChange={(e) => {
                    setAdminPromoteId(e.target.value);
                    setAdminLookupResult(null);
                  }}
                  placeholder="Enter User ID..."
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,215,0,0.2)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#fff",
                    fontSize: 13,
                    fontFamily: "monospace",
                    outline: "none",
                  }}
                />
                <button
                  className="btn btn-sm"
                  style={{
                    background: "rgba(255,215,0,0.15)",
                    color: "#FFD700",
                    border: "1px solid rgba(255,215,0,0.3)",
                    fontWeight: 700,
                    padding: "8px 16px",
                  }}
                  onClick={handleAdminLookup}
                  disabled={adminLoading}
                >
                  {adminLoading ? "..." : "🔍"}
                </button>
              </div>
              {adminLookupResult && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: "rgba(255,215,0,0.05)",
                    border: "1px solid rgba(255,215,0,0.15)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        fontSize: 22,
                        background: "rgba(108,92,231,0.12)",
                        border:
                          adminLookupResult.globalRole === "official"
                            ? "2px solid #FFD700"
                            : "2px solid rgba(108,92,231,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {adminLookupResult.avatar?.startsWith("http") ? (
                        <img
                          src={adminLookupResult.avatar}
                          alt=""
                          style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        adminLookupResult.avatar
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {adminLookupResult.name}
                      </p>
                      <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontFamily: "monospace" }}>
                        ID: {adminLookupResult.userId}
                      </p>
                      <p
                        style={{
                          fontSize: 10,
                          color: adminLookupResult.globalRole === "official" ? "#FFD700" : "rgba(162,155,254,0.4)",
                          fontWeight: 700,
                          marginTop: 2,
                        }}
                      >
                        {adminLookupResult.globalRole === "official" ? "🛡️ Official" : "👤 Regular User"}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {adminLookupResult.globalRole !== "official" ? (
                      <button
                        className="btn btn-full btn-sm"
                        style={{
                          background: "linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,215,0,0.1))",
                          border: "1px solid rgba(255,215,0,0.4)",
                          color: "#FFD700",
                          fontWeight: 800,
                          padding: "10px 0",
                        }}
                        onClick={handlePromoteOfficial}
                        disabled={adminLoading}
                      >
                        {adminLoading ? "Processing..." : "👑 Promote to Official"}
                      </button>
                    ) : (
                      <button
                        className="btn btn-full btn-sm btn-danger"
                        style={{ padding: "10px 0", fontWeight: 800 }}
                        onClick={handleDemoteOfficial}
                        disabled={adminLoading}
                      >
                        {adminLoading ? "Processing..." : "❌ Remove Official"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Frame Assigner */}
            <div className="card" style={{ padding: 16, border: "1px solid rgba(255,215,0,0.2)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8, color: "#FFD700" }}>🖼️ Frame Assigner</h3>
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", lineHeight: 1.6 }}>
                Officials automatically receive a golden frame on their avatar. The frame{" "}
                <span style={{ color: "rgba(255,215,0,0.7)", fontFamily: "monospace" }}>
                  official_frame.png
                </span>{" "}
                is assigned when promoted.
              </p>
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(255,215,0,0.04)",
                  border: "1px solid rgba(255,215,0,0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    border: "2.5px solid #FFD700",
                    boxShadow: "0 0 12px rgba(255,215,0,0.4), 0 0 24px rgba(255,215,0,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    background: "rgba(108,92,231,0.12)",
                  }}
                >
                  👤
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#FFD700" }}>Golden Frame Preview</p>
                  <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>Active on all Official avatars</p>
                </div>
              </div>
            </div>

            {/* Wallet Admin */}
            <div
              className="card"
              style={{ padding: 16, marginTop: 14, border: "1px solid rgba(0,255,200,0.2)" }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#00ffc8" }}>💰 Wallet Admin</h3>
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 10 }}>
                Edit any user's diamond balance
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  type="text"
                  value={walletEditId}
                  onChange={(e) => {
                    setWalletEditId(e.target.value);
                    setWalletEditUser(null);
                  }}
                  placeholder="Enter User ID..."
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,255,200,0.2)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#fff",
                    fontSize: 13,
                    fontFamily: "monospace",
                    outline: "none",
                  }}
                />
                <button
                  className="btn btn-sm"
                  style={{
                    background: "rgba(0,255,200,0.12)",
                    color: "#00ffc8",
                    border: "1px solid rgba(0,255,200,0.3)",
                    fontWeight: 700,
                    padding: "8px 16px",
                  }}
                  onClick={async () => {
                    if (!walletEditId.trim()) return;
                    setWalletLoading(true);
                    try {
                      const found = await getUserByUserId(walletEditId.trim());
                      setWalletEditUser(found);
                      if (found) setWalletNewCoins(String(found.coins || 0));
                      else showToast("User not found", "warning");
                    } catch {
                      showToast("Lookup failed", "error");
                    }
                    setWalletLoading(false);
                  }}
                  disabled={walletLoading}
                >
                  {walletLoading ? "..." : "🔍"}
                </button>
              </div>
              {walletEditUser && (
                <div
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: "rgba(0,255,200,0.04)",
                    border: "1px solid rgba(0,255,200,0.12)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        fontSize: 18,
                        background: "rgba(108,92,231,0.12)",
                        border: "2px solid rgba(0,255,200,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {walletEditUser.avatar?.startsWith("http") ? (
                        <img
                          src={walletEditUser.avatar}
                          alt=""
                          style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        walletEditUser.avatar
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{walletEditUser.name}</p>
                      <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontFamily: "monospace" }}>
                        Current: 💎 {(walletEditUser.coins || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="number"
                      value={walletNewCoins}
                      onChange={(e) => setWalletNewCoins(e.target.value)}
                      placeholder="New balance..."
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,255,200,0.2)",
                        background: "rgba(255,255,255,0.04)",
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 700,
                        outline: "none",
                      }}
                    />
                    <button
                      className="btn btn-sm"
                      style={{
                        background: "rgba(0,255,200,0.15)",
                        color: "#00ffc8",
                        border: "1px solid rgba(0,255,200,0.3)",
                        fontWeight: 800,
                        padding: "10px 20px",
                      }}
                      onClick={async () => {
                        const val = parseInt(walletNewCoins);
                        if (isNaN(val) || val < 0) {
                          showToast("Enter a valid amount", "warning");
                          return;
                        }
                        if (!confirm(`Set ${walletEditUser!.name}'s diamonds to ${val.toLocaleString()}?`))
                          return;
                        setWalletLoading(true);
                        try {
                          await setUserCoins(walletEditUser!.uid, val);
                          setWalletEditUser({ ...walletEditUser!, coins: val });
                          showToast(`Diamonds updated to ${val.toLocaleString()}`, "success");
                        } catch {
                          showToast("Failed to update diamonds", "error");
                        }
                        setWalletLoading(false);
                      }}
                      disabled={walletLoading}
                    >
                      {walletLoading ? "..." : "✔ Set"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Global Notice */}
            <div className="card" style={{ padding: 16, marginTop: 14, border: "1px solid rgba(191,0,255,0.2)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#bf00ff" }}>📢 Global Notice</h3>
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 10 }}>
                Send a scrolling alert visible to all users
              </p>
              <textarea
                value={globalAlertText}
                onChange={(e) => setGlobalAlertText(e.target.value)}
                placeholder="Type your global alert message..."
                maxLength={200}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(191,0,255,0.2)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                  resize: "none",
                  minHeight: 60,
                  boxSizing: "border-box",
                }}
              />
              <p style={{ fontSize: 10, color: "rgba(162,155,254,0.3)", textAlign: "right", marginTop: 4 }}>
                {globalAlertText.length}/200
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  className="btn btn-sm"
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, rgba(191,0,255,0.2), rgba(191,0,255,0.08))",
                    border: "1px solid rgba(191,0,255,0.3)",
                    color: "#bf00ff",
                    fontWeight: 800,
                    padding: "10px 0",
                  }}
                  onClick={async () => {
                    if (!globalAlertText.trim()) {
                      showToast("Enter a message", "warning");
                      return;
                    }
                    setAlertSending(true);
                    try {
                      await sendGlobalAlert(globalAlertText.trim(), user.uid, user.name);
                      showToast("Global alert sent!", "success");
                      setGlobalAlertText("");
                    } catch {
                      showToast("Failed to send alert", "error");
                    }
                    setAlertSending(false);
                  }}
                  disabled={alertSending || !globalAlertText.trim()}
                >
                  {alertSending ? "Sending..." : "📢 Send Alert"}
                </button>
                <button
                  className="btn btn-sm"
                  style={{
                    background: "rgba(255,60,60,0.08)",
                    border: "1px solid rgba(255,60,60,0.2)",
                    color: "#ff5555",
                    fontWeight: 700,
                    padding: "10px 16px",
                  }}
                  onClick={async () => {
                    if (!confirm("Clear all global alerts?")) return;
                    try {
                      await clearGlobalAlerts();
                      showToast("All alerts cleared", "info");
                    } catch {
                      showToast("Failed to clear", "error");
                    }
                  }}
                >
                  🗑️ Clear
                </button>
              </div>
            </div>

            {/* Official Room Manager */}
            <div className="card" style={{ padding: 16, marginTop: 14, border: "1px solid rgba(0,255,255,0.2)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#00ffff" }}>🏠 Official Room Manager</h3>
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 14 }}>
                Manage Room 11111 • Official room settings
              </p>

              <div style={{ marginBottom: 14 }}>
                <label
                  style={{ fontSize: 11, color: "rgba(0,255,255,0.6)", fontWeight: 700, marginBottom: 6, display: "block" }}
                >
                  Room Name
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={ormRoomName}
                    onChange={(e) => setOrmRoomName(e.target.value)}
                    placeholder="Room name..."
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,255,255,0.2)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#fff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <button
                    className="btn btn-sm"
                    style={{
                      background: "rgba(0,255,255,0.12)",
                      color: "#00ffff",
                      border: "1px solid rgba(0,255,255,0.3)",
                      fontWeight: 700,
                      padding: "8px 16px",
                    }}
                    onClick={async () => {
                      if (!ormRoomName.trim()) return;
                      setOrmLoading(true);
                      try {
                        await updateRoomSettings("11111", { name: ormRoomName.trim() });
                        showToast("Room name updated!", "success");
                      } catch {
                        showToast("Failed", "error");
                      }
                      setOrmLoading(false);
                    }}
                    disabled={ormLoading}
                  >
                    {ormLoading ? "..." : "✔"}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label
                  style={{ fontSize: 11, color: "rgba(0,255,255,0.6)", fontWeight: 700, marginBottom: 6, display: "block" }}
                >
                  Background Theme
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ROOM_THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={async () => {
                        setOrmTheme(t.id);
                        setOrmLoading(true);
                        try {
                          await updateRoomSettings("11111", { theme: t.id });
                          showToast(`Theme set to ${t.name}`, "success");
                        } catch {
                          showToast("Failed", "error");
                        }
                        setOrmLoading(false);
                      }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 10,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 11,
                        fontWeight: 700,
                        background: ormTheme === t.id ? "rgba(0,255,255,0.15)" : "rgba(255,255,255,0.04)",
                        color: ormTheme === t.id ? "#00ffff" : "rgba(255,255,255,0.4)",
                        border:
                          ormTheme === t.id
                            ? "1px solid rgba(0,255,255,0.3)"
                            : "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label
                  style={{ fontSize: 11, color: "rgba(0,255,255,0.6)", fontWeight: 700, marginBottom: 6, display: "block" }}
                >
                  Seat Limit
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[8, 10, 12, 16, 20].map((n) => (
                    <button
                      key={n}
                      onClick={async () => {
                        setOrmSeatCount(String(n));
                        setOrmLoading(true);
                        try {
                          await setRoomSeatCount("11111", n);
                          showToast(`Seats set to ${n}`, "success");
                        } catch {
                          showToast("Failed", "error");
                        }
                        setOrmLoading(false);
                      }}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: 10,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: 13,
                        fontWeight: 800,
                        background: ormSeatCount === String(n) ? "rgba(0,255,255,0.15)" : "rgba(255,255,255,0.04)",
                        color: ormSeatCount === String(n) ? "#00ffff" : "rgba(255,255,255,0.4)",
                        border:
                          ormSeatCount === String(n)
                            ? "1px solid rgba(0,255,255,0.3)"
                            : "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 12,
                  marginBottom: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>🔒 Official Only (Lock Mic)</p>
                  <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>Only admins can use mic</p>
                </div>
                <button
                  onClick={async () => {
                    const newVal = !ormOfficialOnly;
                    setOrmOfficialOnly(newVal);
                    setOrmLoading(true);
                    try {
                      await updateRoomSettings("11111", { micPermission: newVal ? "admin_only" : "all" });
                      showToast(newVal ? "Mic locked to admins" : "Mic open for all", "success");
                    } catch {
                      showToast("Failed", "error");
                    }
                    setOrmLoading(false);
                  }}
                  style={{
                    width: 48,
                    height: 28,
                    borderRadius: 14,
                    border: "none",
                    cursor: "pointer",
                    background: ormOfficialOnly ? "#00ffff" : "rgba(255,255,255,0.12)",
                    position: "relative",
                    transition: "background 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      background: "#fff",
                      position: "absolute",
                      top: 3,
                      left: ormOfficialOnly ? 23 : 3,
                      transition: "left 0.2s",
                    }}
                  />
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 12,
                  marginBottom: 14,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>🚀 Auto-Entry</p>
                  <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>New users auto-join this room</p>
                </div>
                <button
                  onClick={async () => {
                    const newVal = !ormAutoEntry;
                    setOrmAutoEntry(newVal);
                    setOrmLoading(true);
                    try {
                      await setAutoEntryRoom("11111", newVal);
                      showToast(newVal ? "Auto-entry ON" : "Auto-entry OFF", "success");
                    } catch {
                      showToast("Failed", "error");
                    }
                    setOrmLoading(false);
                  }}
                  style={{
                    width: 48,
                    height: 28,
                    borderRadius: 14,
                    border: "none",
                    cursor: "pointer",
                    background: ormAutoEntry ? "#00ffff" : "rgba(255,255,255,0.12)",
                    position: "relative",
                    transition: "background 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      background: "#fff",
                      position: "absolute",
                      top: 3,
                      left: ormAutoEntry ? 23 : 3,
                      transition: "left 0.2s",
                    }}
                  />
                </button>
              </div>

              <button
                className="btn btn-full"
                style={{
                  padding: "12px 0",
                  background: "rgba(255,60,60,0.12)",
                  border: "1px solid rgba(255,60,60,0.25)",
                  color: "#ff5555",
                  fontWeight: 800,
                }}
                onClick={async () => {
                  if (!confirm("Delete ALL empty rooms (0 listeners) except Room 11111?")) return;
                  setOrmLoading(true);
                  try {
                    const count = await wipeDummyRooms();
                    showToast(`Wiped ${count} dummy rooms!`, "success");
                  } catch {
                    showToast("Failed to wipe rooms", "error");
                  }
                  setOrmLoading(false);
                }}
                disabled={ormLoading}
              >
                {ormLoading ? "Wiping..." : "🗑️ Wipe Test Rooms"}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* ===== BACKPACK ===== */}
      {showBackpack && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "#0F0F1A",
            display: "flex",
            flexDirection: "column",
            maxWidth: 430,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "52px 16px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <button
              onClick={() => {
                closeSubPage();
                setShowBackpack(false);
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.09)",
                cursor: "pointer",
                fontSize: 16,
                color: "#fff",
              }}
            >
              ‹
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>🎒 Backpack</h2>
            <div style={{ width: 36 }} />
          </div>

          <div
            style={{
              display: "flex",
              gap: 0,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {(
              [
                ["frame", "🖼️", "Frames"],
                ["entry", "⚡", "Entry FX"],
                ["theme", "🎨", "Themes"],
              ] as const
            ).map(([cat, ico, label]) => (
              <button
                key={cat}
                onClick={() => setBackpackCategory(cat)}
                style={{
                  flex: 1,
                  padding: "14px 0",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  background: backpackCategory === cat ? "rgba(108,92,231,0.15)" : "transparent",
                  borderBottom: backpackCategory === cat ? "2px solid #6C5CE7" : "2px solid transparent",
                  color: backpackCategory === cat ? "#A29BFE" : "rgba(162,155,254,0.45)",
                  fontSize: 13,
                  fontWeight: 700,
                  transition: "all 0.2s",
                }}
              >
                {ico} {label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
            {(() => {
              const inv = user.inventory || {};
              const categoryItems = Object.values(inv).filter((o) => {
                const si = getStoreItem(o.itemId);
                return si && si.category === backpackCategory;
              });
              if (categoryItems.length === 0) {
                return (
                  <div style={{ textAlign: "center", padding: "60px 20px" }}>
                    <span style={{ fontSize: 48, opacity: 0.3 }}>📦</span>
                    <p style={{ fontSize: 14, color: "rgba(162,155,254,0.4)", marginTop: 12 }}>No items yet</p>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: 12 }}
                      onClick={() => {
                        setShowBackpack(false);
                        setShowStorePage(true);
                        setStoreCategory(backpackCategory);
                      }}
                    >
                      Visit Store
                    </button>
                  </div>
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {categoryItems.map((owned) => {
                    const item = getStoreItem(owned.itemId);
                    if (!item) return null;
                    const rc = getRarityColor(item.rarity);
                    return (
                      <div
                        key={owned.itemId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 16px",
                          borderRadius: 16,
                          background: owned.equipped ? "rgba(108,92,231,0.1)" : "rgba(255,255,255,0.03)",
                          border: owned.equipped ? `1.5px solid ${rc}50` : "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: isAnimatedFrame(item.id) ? "50%" : 14,
                            background: isAnimatedFrame(item.id) ? "transparent" : item.preview,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 26,
                            border: isAnimatedFrame(item.id) ? "none" : `2px solid ${rc}40`,
                            boxShadow: owned.equipped && !isAnimatedFrame(item.id) ? `0 0 16px ${rc}30` : "none",
                            position: "relative",
                            overflow: "visible",
                          }}
                        >
                          {isAnimatedFrame(item.id) ? (
                            <FramePreview frameId={item.id} size={38} />
                          ) : isPngFrame(item.id) ? (
                            (() => {
                              const pp = getPngFramePath(item.id);
                              return pp ? <img src={pp} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : item.icon;
                            })()
                          ) : (
                            item.icon
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{item.name}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                            <span style={{ fontSize: 10, color: rc, fontWeight: 700, textTransform: "uppercase" }}>
                              {item.rarity}
                            </span>
                            {owned.equipped && (
                              <span style={{ fontSize: 10, color: "#00e676", fontWeight: 700 }}>• Active</span>
                            )}
                          </div>
                        </div>
                        {owned.equipped ? (
                          <button
                            onClick={() => handleUnequip(owned.itemId)}
                            disabled={storeLoading === owned.itemId}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 12,
                              border: "1px solid rgba(255,100,130,0.3)",
                              cursor: "pointer",
                              background: "rgba(255,100,130,0.1)",
                              color: "#ff6482",
                              fontSize: 12,
                              fontWeight: 800,
                              fontFamily: "inherit",
                            }}
                          >
                            {storeLoading === owned.itemId ? "..." : "Remove"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEquip(owned.itemId)}
                            disabled={storeLoading === owned.itemId}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 12,
                              border: "none",
                              cursor: "pointer",
                              background: "linear-gradient(135deg, #6C5CE7, #8B7CF6)",
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 800,
                              fontFamily: "inherit",
                              boxShadow: "0 0 12px rgba(108,92,231,0.3)",
                            }}
                          >
                            {storeLoading === owned.itemId ? "..." : isAnimatedFrame(owned.itemId) ? "Apply" : "Equip"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===== OFFICIAL RULES ===== */}
      {showOfficialRules && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowOfficialRules(false);
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#00ffff" }}>📜 Official Guidelines</h2>
            <button
              onClick={() => {
                closeSubPage();
                setShowOfficialRules(false);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "rgba(162,155,254,0.5)",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <img
                src={`${import.meta.env.BASE_URL}assets/official/official_tag.svg`}
                alt="Official"
                style={{
                  height: 28,
                  filter:
                    "drop-shadow(0 0 8px rgba(0,206,201,0.5)) drop-shadow(0 0 14px rgba(9,132,227,0.3))",
                }}
              />
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", marginTop: 8 }}>
                As an Official, you represent the app
              </p>
            </div>
            {[
              { icon: "🤝", rule: "Be respectful to all users.", color: "#00e676" },
              { icon: "⚠️", rule: "Do not abuse Kick/Mute powers.", color: "#ff9800" },
              { icon: "⚖️", rule: "Solve conflicts neutrally.", color: "#00bcd4" },
              { icon: "📢", rule: "Report severe violations to Super Admin.", color: "#ff5252" },
              { icon: "👑", rule: "Your frame and tag represent the app's reputation.", color: "#FFD700" },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 16px",
                  marginBottom: 8,
                  borderRadius: 14,
                  background: `linear-gradient(135deg, ${item.color}08, ${item.color}04)`,
                  border: `1px solid ${item.color}25`,
                }}
              >
                <span
                  style={{ fontSize: 20, flexShrink: 0, filter: `drop-shadow(0 0 4px ${item.color}60)` }}
                >
                  {item.icon}
                </span>
                <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, letterSpacing: 0.2 }}>
                  {item.rule}
                </p>
              </div>
            ))}
            <div
              style={{
                marginTop: 16,
                padding: "14px 16px",
                borderRadius: 14,
                textAlign: "center",
                background: "rgba(0,255,255,0.04)",
                border: "1px solid rgba(0,255,255,0.12)",
              }}
            >
              <p style={{ fontSize: 11, color: "rgba(0,255,255,0.6)", fontWeight: 700, lineHeight: 1.6 }}>
                Violation of these rules may result in removal of Official status.
                Always act with integrity and fairness.
              </p>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* ===== FAMILY ===== */}
      {showFamily && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowFamily(false);
            setShowCreateFamily(false);
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 900, textAlign: "center", marginBottom: 16 }}>👪 Family</h3>
          {myFamily ? (
            <div>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 40 }}>{myFamily.icon}</span>
                <h4 style={{ fontSize: 16, fontWeight: 800, marginTop: 8 }}>{myFamily.name}</h4>
                <p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)" }}>
                  Level {myFamily.level} • {myFamily.memberCount}/{myFamily.maxMembers} members
                </p>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", marginTop: 4 }}>
                  {myFamily.description}
                </p>
              </div>
              {myFamily.announcement && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "rgba(108,92,231,0.08)",
                    border: "1px solid rgba(108,92,231,0.15)",
                    marginBottom: 12,
                  }}
                >
                  <p style={{ fontSize: 12, color: "rgba(162,155,254,0.7)" }}>📢 {myFamily.announcement}</p>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "10px 0",
                    borderRadius: 12,
                    background: "rgba(255,215,0,0.06)",
                    border: "1px solid rgba(255,215,0,0.15)",
                  }}
                >
                  <p style={{ fontSize: 16, fontWeight: 900, color: "#FFD700" }}>{myFamily.totalGifts.toLocaleString()}</p>
                  <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>Total Gifts</p>
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "10px 0",
                    borderRadius: 12,
                    background: "rgba(108,92,231,0.06)",
                    border: "1px solid rgba(108,92,231,0.15)",
                  }}
                >
                  <p style={{ fontSize: 16, fontWeight: 900, color: "#A29BFE" }}>{myFamily.weeklyGifts.toLocaleString()}</p>
                  <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>This Week</p>
                </div>
              </div>
              <h5 style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: "rgba(255,255,255,0.7)" }}>Members</h5>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {Object.values(myFamily.members || {})
                  .sort((a: any, b: any) => {
                    const order: Record<string, number> = { leader: 0, elder: 1, member: 2 };
                    return (order[a.role] || 2) - (order[b.role] || 2);
                  })
                  .map((m: any) => (
                    <div
                      key={m.uid}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                          background: "rgba(108,92,231,0.12)",
                        }}
                      >
                        {m.avatar?.length <= 2 ? m.avatar : "👤"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</p>
                        <p
                          style={{
                            fontSize: 10,
                            color:
                              m.role === "leader"
                                ? "#FFD700"
                                : m.role === "elder"
                                ? "#A29BFE"
                                : "rgba(162,155,254,0.4)",
                          }}
                        >
                          {m.role === "leader" ? "👑 Leader" : m.role === "elder" ? "⭐ Elder" : "Member"} •{" "}
                          {m.contribution.toLocaleString()} diamonds
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
              {myFamily.leaderId !== user.uid && (
                <button
                  className="btn btn-danger btn-full"
                  style={{ marginTop: 16, fontSize: 13 }}
                  onClick={async () => {
                    try {
                      await leaveFamily(myFamily.id, user.uid);
                      setMyFamily(null);
                      showToast("Left family", "info");
                    } catch (e: any) {
                      showToast(e.message, "error");
                    }
                  }}
                >
                  Leave Family
                </button>
              )}
            </div>
          ) : showCreateFamily ? (
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, justifyContent: "center" }}>
                {getFamilyIcons().map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewFamilyIcon(icon)}
                    style={{
                      fontSize: 24,
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      border:
                        newFamilyIcon === icon ? "2px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                      background: newFamilyIcon === icon ? "rgba(108,92,231,0.15)" : "rgba(255,255,255,0.03)",
                      cursor: "pointer",
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <input
                className="input-field"
                placeholder="Family Name"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <textarea
                className="input-field"
                placeholder="Description (optional)"
                value={newFamilyDesc}
                onChange={(e) => setNewFamilyDesc(e.target.value)}
                rows={2}
                style={{ marginBottom: 12 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setShowCreateFamily(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-full"
                  disabled={!newFamilyName.trim()}
                  onClick={async () => {
                    try {
                      setFamilyLoading(true);
                      await createFamily(
                        user.uid,
                        user.name,
                        user.avatar,
                        newFamilyName.trim(),
                        newFamilyIcon,
                        newFamilyDesc.trim()
                      );
                      const f = await getUserFamily(user.uid);
                      setMyFamily(f);
                      setShowCreateFamily(false);
                      showToast("Family created!", "success");
                    } catch (e: any) {
                      showToast(e.message, "error");
                    }
                    setFamilyLoading(false);
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                className="btn btn-primary btn-full"
                style={{ marginBottom: 16 }}
                onClick={() => setShowCreateFamily(true)}
              >
                ✨ Create Family
              </button>
              <h5 style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: "rgba(255,255,255,0.6)" }}>
                Top Families
              </h5>
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {allFamilies.slice(0, 20).map((f, i) => (
                  <div
                    key={f.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: i < 3 ? "#FFD700" : "rgba(162,155,254,0.4)",
                        width: 20,
                      }}
                    >
                      #{i + 1}
                    </span>
                    <span style={{ fontSize: 22 }}>{f.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{f.name}</p>
                      <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>
                        Lv.{f.level} • {f.memberCount} members • {f.weeklyGifts.toLocaleString()} weekly
                      </p>
                    </div>
                    {f.isRecruiting && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: 10, padding: "4px 10px" }}
                        onClick={async () => {
                          try {
                            await joinFamily(f.id, user.uid, user.name, user.avatar, user.level);
                            const mf = await getUserFamily(user.uid);
                            setMyFamily(mf);
                            showToast(`Joined ${f.name}!`, "success");
                          } catch (e: any) {
                            showToast(e.message, "error");
                          }
                        }}
                      >
                        Join
                      </button>
                    )}
                  </div>
                ))}
                {allFamilies.length === 0 && (
                  <p style={{ textAlign: "center", fontSize: 13, color: "rgba(162,155,254,0.4)", padding: 24 }}>
                    No families yet. Be the first!
                  </p>
                )}
              </div>
            </div>
          )}
        </BottomSheet>
      )}

      {/* ===== LANGUAGE ===== */}
      {showLanguage && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowLanguage(false);
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 900, textAlign: "center", marginBottom: 16 }}>🌍 Language</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setCurrentLang(lang.code);
                  document.documentElement.dir = lang.code === "ar" || lang.code === "ur" ? "rtl" : "ltr";
                  showToast(`Language changed to ${lang.nativeName}`, "success");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  borderRadius: 14,
                  border:
                    currentLang === lang.code ? "1.5px solid #6C5CE7" : "1px solid rgba(255,255,255,0.06)",
                  background: currentLang === lang.code ? "rgba(108,92,231,0.12)" : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 24 }}>{lang.flag}</span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: currentLang === lang.code ? "#A29BFE" : "rgba(255,255,255,0.8)",
                    }}
                  >
                    {lang.nativeName}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)" }}>{lang.name}</p>
                </div>
                {currentLang === lang.code && <span style={{ color: "#6C5CE7", fontSize: 18 }}>✓</span>}
              </button>
            ))}
          </div>
        </BottomSheet>
      )}

      {/* ===== REPORT QUEUE ===== */}
      {showReportQueue && isAdmin && (
        <BottomSheet
          onClose={() => {
            closeSubPage();
            setShowReportQueue(false);
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 900, textAlign: "center", marginBottom: 12 }}>📋 Report Queue</h3>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
            {["pending", "action_taken", "dismissed"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setReportQueueFilter(s);
                  getReportQueue(s).then(setReportQueue).catch(() => {});
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  background: reportQueueFilter === s ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.04)",
                  color: reportQueueFilter === s ? "#A29BFE" : "rgba(162,155,254,0.5)",
                }}
              >
                {s === "pending" ? "⏳ Pending" : s === "action_taken" ? "✅ Actioned" : "❌ Dismissed"}
              </button>
            ))}
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {reportQueue.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,100,130,0.8)" }}>
                    vs {r.reportedName}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(162,155,254,0.3)" }}>
                    {new Date(r.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "rgba(162,155,254,0.6)", marginBottom: 4 }}>
                  <strong>By:</strong> {r.reporterName} • <strong>Category:</strong> {r.category}
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                  {r.reason} — {r.details || "No details"}
                </p>
                {r.status === "pending" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ flex: 1, fontSize: 10 }}
                      onClick={async () => {
                        await reviewReport(r.id, user.uid, "action_taken", "Reviewed by admin", "warned");
                        getReportQueue(reportQueueFilter).then(setReportQueue).catch(() => {});
                        showToast("Action taken", "success");
                      }}
                    >
                      ⚡ Action
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1, fontSize: 10 }}
                      onClick={async () => {
                        await reviewReport(r.id, user.uid, "dismissed", "Dismissed by admin");
                        getReportQueue(reportQueueFilter).then(setReportQueue).catch(() => {});
                        showToast("Report dismissed", "info");
                      }}
                    >
                      ✖ Dismiss
                    </button>
                  </div>
                )}
                {r.status !== "pending" && r.reviewNote && (
                  <p style={{ fontSize: 10, color: "rgba(0,255,200,0.5)", fontStyle: "italic" }}>
                    📝 {r.reviewNote}
                  </p>
                )}
              </div>
            ))}
            {reportQueue.length === 0 && (
              <p style={{ textAlign: "center", fontSize: 13, color: "rgba(162,155,254,0.4)", padding: 24 }}>
                No reports in this category
              </p>
            )}
          </div>
        </BottomSheet>
      )}

      {showTasksPanel && (
        <TasksPanel
          user={user}
          onClose={() => { closeSubPage(); setShowTasksPanel(false); }}
          onUpdate={(updated) => onUpdate(updated as typeof user)}
        />
      )}

      {showApply && (
        <HostAgencyApply
          uid={user.uid}
          userId={user.userId}
          name={user.name}
          avatar={user.avatar}
          totalEarnings={user.totalEarnings || 0}
          agencyId={user.agencyId}
          agencyRole={user.agencyRole}
          onClose={() => { closeSubPage(); setShowApply(false); }}
        />
      )}
    </div>
  );
}