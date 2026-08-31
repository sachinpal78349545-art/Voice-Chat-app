import React, { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { ref, onValue, off } from "firebase/database";
import { UserProfile, updateUser, addCoins, claimDailyReward, addTransaction, getAchievementsList, Transaction, Achievement, DAILY_TASKS, getDailyTaskProgress, blockUser, unblockUser, getUser, reportUser, updatePrivacy, subscribeFriendRequests, respondFriendRequest, FriendRequest, sendFriendRequest, removeFriend, searchUsers, isSuperAdmin, setOfficialRole, removeOfficialRole, getUserByUserId, ensureSuperAdmin, followUser, banUser, unbanUser, isUserBanned, BanDuration, setUserCoins, deleteUserAvatar, resetUserName, deviceBanUser, shadowBanUser, removeShadowBan, setUserLevelXP, transferAccountData, getAllUsers, createVipUserId, addCustomBadge, removeCustomBadge } from "../lib/userService";
import { sendGlobalAlert, clearGlobalAlerts, sendMassDM } from "../lib/notificationService";
import { setMaintenanceMode, setStoreOverrides, getStoreOverrides, updateRoomSettings, setRoomSeatCount, wipeDummyRooms, setAutoEntryRoom, getAutoEntryRoom, ensureOfficialRoom, ROOM_THEMES, Room } from "../lib/roomService";
import { submitFeedback, HELP_ARTICLES } from "../lib/supportService";
import { getOrCreateConversation } from "../lib/chatService";
import { useToast } from "../lib/toastContext";
import { STORE_ITEMS, StoreItem, OwnedItem, getStoreItem, purchaseItem, getInventory, equipItem, unequipItem, getRarityColor, isPngFrame, getPngFramePath, DEFAULT_FRAME_ID, isAnimatedFrame } from "../lib/storeService";
import SuperAdminAvatar from "../components/SuperAdminAvatar";
import FrameAvatar, { FramePreview } from "../components/frames/FrameAvatar";
import { Language, LANGUAGE_OPTIONS, getCurrentLanguage, setLanguage, isRTL, t } from "../lib/i18n";
import { Family, createFamily, joinFamily, leaveFamily, getUserFamily, getAllFamilies, searchFamilies, getFamilyIcons, getFamilyLeaderboard, updateFamilySettings, promoteMember, kickMember, transferLeadership, deleteFamily, addFamilyContribution } from "../lib/familyService";
import { Report, submitReport, getReportQueue, reviewReport, getReportStats, REPORT_CATEGORIES } from "../lib/reportService";

interface Props {
  user: UserProfile;
  onUpdate: (u: UserProfile) => void;
  onLogout: () => void;
  onEditProfile: () => void;
  onMessage?: (uid: string) => void;
  onRecharge?: () => void;
  onAdminRecharge?: () => void;
}

const MENU_ITEMS = [
  { icon: "\u270F\uFE0F", label: "Edit Profile", action: "edit" },
  { icon: "\u{1F6CD}\uFE0F", label: "Store", action: "store" },
  { icon: "\u{1F392}", label: "Backpack", action: "backpack" },
  { icon: "\u{1F4B0}", label: "My Wallet", action: "wallet" },
  { icon: "\u{1F46A}", label: "Family", action: "family" },
  { icon: "\u2705", label: "Daily Tasks", action: "dailyTasks" },
  { icon: "\u{1F381}", label: "Daily Reward", action: "daily" },
  { icon: "\u{1F91D}", label: "Friend Requests", action: "friendRequests" },
  { icon: "\u{1F465}", label: "Friends List", action: "friendsList" },
  { icon: "\u{1F3C6}", label: "Achievements", action: "achievements" },
  { icon: "\u{1F30D}", label: "Language", action: "language" },
  { icon: "\u{1F512}", label: "Privacy & Settings", action: "privacy" },
  { icon: "\u{1F6AB}", label: "Blocked Users", action: "blocked" },
  { icon: "\u{1F50D}", label: "Find Users", action: "search" },
  { icon: "\u{1F4AC}", label: "Send Feedback", action: "feedback" },
  { icon: "\u2753", label: "Help Center", action: "help" },
  { icon: "\u26A0\uFE0F", label: "Report a Problem", action: "report" },
];

const RECHARGE_PACKAGES = [
  { coins: 100, price: "$0.99", bonus: "" },
  { coins: 500, price: "$3.99", bonus: "+50 Bonus" },
  { coins: 1000, price: "$6.99", bonus: "+150 Bonus" },
  { coins: 5000, price: "$29.99", bonus: "+1000 Bonus" },
];

const REPORT_REASONS = ["Harassment", "Spam", "Inappropriate Content", "Fake Profile", "Scam", "Other"];

export default function ProfilePage({ user, onUpdate, onLogout, onEditProfile, onMessage, onRecharge, onAdminRecharge }: Props) {
  const [showWallet, setShowWallet] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDailyTasks, setShowDailyTasks] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showHelpArticle, setShowHelpArticle] = useState<string | null>(null);
  const [showStore, setShowStore] = useState(false);
  const [showBackpack, setShowBackpack] = useState(false);
  const [storeCategory, setStoreCategory] = useState<"frame" | "entry" | "theme">("frame");
  const [storeLoading, setStoreLoading] = useState<string | null>(null);
  const [ownedItems, setOwnedItems] = useState<OwnedItem[]>([]);
  const [backpackCategory, setBackpackCategory] = useState<"frame" | "entry" | "theme">("frame");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showOfficialRules, setShowOfficialRules] = useState(false);
  const [adminPromoteId, setAdminPromoteId] = useState("");
  const [adminLookupResult, setAdminLookupResult] = useState<UserProfile | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"feedback" | "bug" | "suggestion">("feedback");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [recharging, setRecharging] = useState<number | null>(null);
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
  const [showBanMenu, setShowBanMenu] = useState(false);
  const [banLoading, setBanLoading] = useState(false);
  const [walletEditId, setWalletEditId] = useState("");
  const [walletEditUser, setWalletEditUser] = useState<UserProfile | null>(null);
  const [walletNewCoins, setWalletNewCoins] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [globalAlertText, setGlobalAlertText] = useState("");
  const [alertSending, setAlertSending] = useState(false);
  const [modLoading, setModLoading] = useState(false);
  const [showGodMode, setShowGodMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [godTab, setGodTab] = useState<string>("deviceBan");
  const [godUserId, setGodUserId] = useState("");
  const [godUser, setGodUser] = useState<UserProfile | null>(null);
  const [godLoading, setGodLoading] = useState(false);
  const [godLevel, setGodLevel] = useState("");
  const [godXp, setGodXp] = useState("");
  const [godTransferTo, setGodTransferTo] = useState("");
  const [godMassDM, setGodMassDM] = useState("");
  const [godMaintMsg, setGodMaintMsg] = useState("");
  const [godMaintOn, setGodMaintOn] = useState(false);
  const [godVipId, setGodVipId] = useState("");
  const [godBadgeName, setGodBadgeName] = useState("");
  const [godBadgeIcon, setGodBadgeIcon] = useState("");
  const [godStoreItemId, setGodStoreItemId] = useState("");
  const [godStorePrice, setGodStorePrice] = useState("");
  const [ormRoomName, setOrmRoomName] = useState("");
  const [ormTheme, setOrmTheme] = useState("galaxy");
  const [ormSeatCount, setOrmSeatCount] = useState("12");
  const [ormOfficialOnly, setOrmOfficialOnly] = useState(false);
  const [ormAutoEntry, setOrmAutoEntry] = useState(false);
  const [ormLoading, setOrmLoading] = useState(false);
  const [ormLoaded, setOrmLoaded] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const [myFamily, setMyFamily] = useState<Family | null>(null);
  const [allFamilies, setAllFamilies] = useState<Family[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);
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
  const [privacy, setPrivacy] = useState<NonNullable<UserProfile["privacy"]>>(user.privacy || {
    profileVisible: true, showOnline: true, allowMessages: "everyone", allowGifts: true,
    pushNotifications: true, messageNotifications: true, giftNotifications: true, roomInviteNotifications: true,
  });
  const { showToast } = useToast();

  const xpPct = Math.min(100, (user.xp / (user.level * 1000)) * 100);
  const achievements = getAchievementsList(user);
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const dailyTasks = getDailyTaskProgress(user);
  const transactions: Transaction[] = user.transactions ? Object.values(user.transactions).sort((a, b) => b.timestamp - a.timestamp) : [];

  const isAdmin = isSuperAdmin(user);

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
        } catch (e) { console.error("ORM load error:", e); }
      })();
    }
  }, [isAdmin, user.uid]);

  useEffect(() => {
    const momentsRef = ref(db, "moments");
    const handler = onValue(momentsRef, snap => {
      if (!snap.exists()) { setMomentCount(0); return; }
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
      const list = user.followersList || [];
      const profiles: UserProfile[] = [];
      for (const uid of list.slice(0, 50)) {
        const p = await getUser(uid);
        if (p) profiles.push(p);
      }
      setFollowerProfiles(profiles);
    } catch { showToast("Failed to load followers", "error"); }
    finally { setFollowerLoading(false); }
  };

  const loadFollowing = async () => {
    setFollowingLoading(true);
    try {
      const list = user.followingList || [];
      const profiles: UserProfile[] = [];
      for (const uid of list.slice(0, 50)) {
        const p = await getUser(uid);
        if (p) profiles.push(p);
      }
      setFollowingProfiles(profiles);
    } catch { showToast("Failed to load following", "error"); }
    finally { setFollowingLoading(false); }
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

  const handleLogout = async () => {
    try { await signOut(auth); } catch (err) { console.error("Logout error:", err); }
    onLogout();
  };

  const handleRecharge = async (coins: number, idx: number) => {
    setRecharging(idx);
    try {
      await new Promise(r => setTimeout(r, 1200));
      await addCoins(user.uid, coins);
      await addTransaction(user.uid, { type: "recharge", amount: coins, description: `Recharged ${coins} coins` });
      onUpdate({ ...user, coins: user.coins + coins });
      setShowWallet(false);
      showToast(`+${coins} coins added!`, "success", "\u{1F48E}");
    } catch {
      showToast("Recharge failed. Try again.", "error");
    } finally {
      setRecharging(null);
    }
  };

  const handleDailyReward = async () => {
    const result = await claimDailyReward(user.uid, user);
    if (result) {
      showToast(`Daily reward: +${result.coins} coins! Day ${result.streak} streak! \u{1F525}`, "success", "\u{1F381}");
    } else {
      showToast("Already claimed today! Come back tomorrow", "warning");
    }
  };

  const handleFriendResponse = async (reqId: string, accept: boolean) => {
    const req = friendRequests.find(r => r.id === reqId);
    await respondFriendRequest(user.uid, reqId, accept);
    setFriendRequests(prev => prev.filter(r => r.id !== reqId));
    if (accept && req) {
      showToast(`${req.fromName} added as friend! You can now chat.`, "success");
      try {
        await getOrCreateConversation(user.uid, user.name, user.avatar, req.fromUid, req.fromName, req.fromAvatar || "");
      } catch {}
    } else {
      showToast("Request declined", "info");
    }
  };

  const handleFriendBlock = async (req: FriendRequest) => {
    await respondFriendRequest(user.uid, req.id, false);
    await blockUser(user.uid, req.fromUid);
    setFriendRequests(prev => prev.filter(r => r.id !== req.id));
    showToast(`${req.fromName} blocked`, "info");
  };

  const handleUnblock = async (uid: string) => {
    await unblockUser(user.uid, uid);
    setBlockedProfiles(prev => prev.filter(p => p.uid !== uid));
    showToast("User unblocked", "info");
  };

  const handleRemoveFriend = async (uid: string) => {
    await removeFriend(user.uid, uid);
    setFriendProfiles(prev => prev.filter(p => p.uid !== uid));
    showToast("Friend removed", "info");
  };

  const handleSavePrivacy = async () => {
    try {
      await updatePrivacy(user.uid, privacy);
      showToast("Settings saved", "success");
      setShowPrivacy(false);
    } catch {
      showToast("Failed to save settings. Try again.", "error");
    }
  };

  const handleReport = async () => {
    if (!reportReason) { showToast("Please select a reason", "warning"); return; }
    try {
      await reportUser(user.uid, reportTarget || "general", reportReason, reportDetails);
      showToast("Report submitted. Thank you!", "success");
      setShowReport(false);
      setReportReason("");
      setReportDetails("");
      setReportTarget("");
    } catch {
      showToast("Failed to submit report. Try again.", "error");
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    const results = await searchUsers(searchQuery.trim());
    setSearchResults(results.filter(u => u.uid !== user.uid));
  };

  const handleAddFriend = async (target: UserProfile) => {
    await sendFriendRequest(user.uid, user.name, user.avatar, target.uid);
    showToast(`Friend request sent to ${target.name}!`, "success");
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      showToast("Please fill in all fields", "warning");
      return;
    }
    setFeedbackSending(true);
    try {
      await submitFeedback(user.uid, user.name, feedbackType, feedbackSubject.trim(), feedbackMessage.trim());
      showToast("Thank you for your feedback!", "success");
      setShowFeedback(false);
      setFeedbackSubject("");
      setFeedbackMessage("");
      setFeedbackType("feedback");
    } catch {
      showToast("Failed to send feedback. Try again.", "error");
    }
    setFeedbackSending(false);
  };

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
      setAdminLookupResult({ ...adminLookupResult, globalRole: "official", frame: "assets/frames/official_frame.png" });
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

  const loadInventory = async () => {
    const items = await getInventory(user.uid);
    setOwnedItems(items);
  };

  const handlePurchase = async (item: StoreItem) => {
    if (user.coins < item.price) { showToast("Not enough coins!", "warning"); return; }
    const owned = user.inventory || {};
    if (owned[item.id]) { showToast("Already owned!", "info"); return; }
    setStoreLoading(item.id);
    try {
      const ok = await purchaseItem(user.uid, item.id, user.coins);
      if (ok) {
        onUpdate({ ...user, coins: user.coins - item.price, inventory: { ...owned, [item.id]: { itemId: item.id, purchasedAt: Date.now(), equipped: false } } });
        showToast(`${item.name} purchased!`, "success");
      } else {
        showToast("Purchase failed", "error");
      }
    } catch { showToast("Purchase failed", "error"); }
    setStoreLoading(null);
  };

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
      await loadInventory();
      showToast(`${item?.name || "Item"} equipped!`, "success");
    } catch { showToast("Equip failed", "error"); }
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
      await loadInventory();
      showToast("Item unequipped", "info");
    } catch { showToast("Unequip failed", "error"); }
    setStoreLoading(null);
  };

  const handleMenu = (action: string) => {
    if (action === "edit") onEditProfile();
    if (action === "wallet") setShowWallet(true);
    if (action === "achievements") setShowAchievements(true);
    if (action === "daily") handleDailyReward();
    if (action === "dailyTasks") setShowDailyTasks(true);
    if (action === "privacy") setShowPrivacy(true);
    if (action === "blocked") { setShowBlocked(true); loadBlocked(); }
    if (action === "friendRequests") setShowFriendRequests(true);
    if (action === "friendsList") { setShowFriendsList(true); loadFriends(); }
    if (action === "store") { setShowStore(true); setStoreCategory("frame"); }
    if (action === "backpack") { loadInventory(); setShowBackpack(true); setBackpackCategory("frame"); }
    if (action === "report") setShowReport(true);
    if (action === "search") setShowSearch(true);
    if (action === "feedback") setShowFeedback(true);
    if (action === "help") setShowHelp(true);
    if (action === "admin") { setShowAdminPanel(true); setAdminPromoteId(""); setAdminLookupResult(null); }
    if (action === "family") {
      setShowFamily(true);
      setFamilyLoading(true);
      getUserFamily(user.uid).then(f => setMyFamily(f)).catch(() => {});
      getAllFamilies().then(f => setAllFamilies(f.sort((a, b) => b.weeklyGifts - a.weeklyGifts))).catch(() => {});
      setFamilyLoading(false);
    }
    if (action === "language") setShowLanguage(true);
    if (action === "reportQueue") {
      setShowReportQueue(true);
      getReportQueue(reportQueueFilter).then(setReportQueue).catch(() => {});
    }
  };

  const MENU_GROUPS = [
    {
      title: "My Stuff",
      items: [
        { icon: "\u{1F6CD}\uFE0F", label: "Store", action: "store", desc: "Frames, effects & themes" },
        { icon: "\u{1F392}", label: "Backpack", action: "backpack", desc: "Equipped items" },
        { icon: "\u{1F4B0}", label: "My Wallet", action: "wallet", desc: `${user.coins.toLocaleString()} coins` },
        { icon: "\u{1F46A}", label: "Family", action: "family", desc: "Join or create" },
      ],
    },
    {
      title: "Social",
      items: [
        { icon: "\u{1F91D}", label: "Friend Requests", action: "friendRequests", desc: friendRequests.length > 0 ? `${friendRequests.length} pending` : "No pending", badge: friendRequests.length || 0 },
        { icon: "\u{1F465}", label: "Friends List", action: "friendsList", desc: `${user.friends || 0} friends` },
        { icon: "\u{1F50D}", label: "Find Users", action: "search", desc: "Search by ID or name" },
      ],
    },
    {
      title: "Rewards",
      items: [
        { icon: "\u2705", label: "Daily Tasks", action: "dailyTasks", desc: "Earn bonus coins" },
        { icon: "\u{1F381}", label: "Daily Reward", action: "daily", desc: "Claim free coins" },
        { icon: "\u{1F3C6}", label: "Achievements", action: "achievements", desc: `${unlockedCount}/${achievements.length} unlocked` },
      ],
    },
    {
      title: "Settings",
      items: [
        { icon: "\u270F\uFE0F", label: "Edit Profile", action: "edit", desc: "Name, avatar & bio" },
        { icon: "\u{1F30D}", label: "Language", action: "language", desc: getCurrentLanguage().toUpperCase() },
        { icon: "\u{1F512}", label: "Privacy & Settings", action: "privacy", desc: "Control who sees you" },
        { icon: "\u{1F6AB}", label: "Blocked Users", action: "blocked", desc: `${(user.blockedList || []).length} blocked` },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: "\u{1F4AC}", label: "Send Feedback", action: "feedback", desc: "Help us improve" },
        { icon: "\u2753", label: "Help Center", action: "help", desc: "FAQs & guides" },
        { icon: "\u26A0\uFE0F", label: "Report a Problem", action: "report", desc: "Report bugs or issues" },
      ],
    },
  ];

  const handleCopyId = async () => {
    try { await navigator.clipboard.writeText(user.userId || user.uid); } catch {}
    showToast("Copied to Clipboard", "success", "\u2705");
  };

  const PROFILE_FUNCTIONS = [
    { icon: "\u{1F4B0}", label: "Wallet", color: "#f59e0b", glow: "rgba(245,158,11,0.35)", action: "wallet" },
    { icon: "\u{1F6CD}\uFE0F", label: "Store", color: "#a855f7", glow: "rgba(168,85,247,0.35)", action: "store" },
    { icon: "\u2705", label: "Task", color: "#3b82f6", glow: "rgba(59,130,246,0.35)", action: "dailyTasks" },
    { icon: "\u{1F392}", label: "Backpack", color: "#ec4899", glow: "rgba(236,72,153,0.35)", action: "backpack" },
    { icon: "\u{1F4A1}", label: "Help", color: "#22c55e", glow: "rgba(34,197,94,0.35)", action: "help" },
    { icon: "\u{1F4AC}", label: "Feedback", color: "#06b6d4", glow: "rgba(6,182,212,0.35)", action: "feedback" },
  ];

  const SETTINGS_ITEMS = [
    { icon: "\u270F\uFE0F", label: "Edit Profile", desc: "Name, avatar & bio", action: "edit" },
    { icon: "\u{1F30D}", label: "Language", desc: getCurrentLanguage().toUpperCase(), action: "language" },
    { icon: "\u{1F512}", label: "Privacy & Settings", desc: "Control who sees you", action: "privacy" },
    { icon: "\u{1F6AB}", label: "Blocked Users", desc: `${(user.blockedList || []).length} blocked`, action: "blocked" },
    { icon: "\u{1F4B0}", label: "Wallet", desc: `${user.coins.toLocaleString()} coins`, action: "wallet" },
    { icon: "\u{1F6CD}\uFE0F", label: "Store", desc: "Frames, effects & themes", action: "store" },
    { icon: "\u2705", label: "Daily Tasks", desc: "Earn bonus coins", action: "dailyTasks" },
    { icon: "\u{1F392}", label: "Backpack", desc: "Equipped items", action: "backpack" },
    { icon: "\u{1F46A}", label: "Family", desc: "Join or create", action: "family" },
    { icon: "\u{1F91D}", label: "Friend Requests", desc: friendRequests.length > 0 ? `${friendRequests.length} pending` : "No pending", action: "friendRequests", badge: friendRequests.length || 0 },
    { icon: "\u{1F465}", label: "Friends List", desc: `${user.friends || 0} friends`, action: "friendsList" },
    { icon: "\u{1F50D}", label: "Find Users", desc: "Search by ID or name", action: "search" },
    { icon: "\u{1F381}", label: "Daily Reward", desc: "Claim free coins", action: "daily" },
    { icon: "\u{1F3C6}", label: "Achievements", desc: `${unlockedCount}/${achievements.length} unlocked`, action: "achievements" },
    { icon: "\u2753", label: "Help", desc: "FAQs & guides", action: "help" },
    { icon: "\u{1F4AC}", label: "Feedback", desc: "Help us improve", action: "feedback" },
    { icon: "\u26A0\uFE0F", label: "Report a Problem", desc: "Report bugs or issues", action: "report" },
  ];

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
            <span style={{ fontSize: 11 }}>{"\u{1F4CB}"}</span>
          </button>
          <button className="pf-settings-btn" onClick={() => setShowSettings(true)}>
            {"\u2699\uFE0F"}
          </button>
        </div>

        <div className="pf-avatar-area">
          <div className="pf-avatar-wrap" onClick={onEditProfile}>
            <div className="pf-avatar-glow">
              <div className="pf-avatar-inner">
                {isAdmin ? (
                  <SuperAdminAvatar src={user.avatar} userId={user.userId || ""} size={92} onClick={onEditProfile} />
                ) : user.avatar?.startsWith?.("http") ? (
                  <img src={user.avatar} alt="" className="pf-avatar-img" onError={e => { const img = e.target as HTMLImageElement; img.style.display = "none"; const span = document.createElement("span"); span.style.fontSize = "28px"; span.style.color = "#fff"; span.textContent = user.name?.slice(0, 2).toUpperCase() || "\u{1F464}"; img.parentElement!.appendChild(span); }} />
                ) : (
                  <span className="pf-avatar-text">{user.name?.slice(0, 2).toUpperCase() || "\u{1F464}"}</span>
                )}
              </div>
            </div>
            <div className="pf-avatar-edit-badge">{"\u270F\uFE0F"}</div>
          </div>
        </div>
      </div>

      <div className="pf-info-block">
        <h2 className="pf-name">{user.name}</h2>
        {user.bio && <p className="pf-bio">{user.bio}</p>}

        <div className="pf-badge-line">
          <span className="pf-pink-badge">18</span>
          <span className="pf-flag">{"\u{1F1EE}\u{1F1F3}"}</span>
          <span className="pf-grey-pill">Lv.{user.level}</span>
          <span className="pf-grey-pill">Diamond</span>
          {user.vip && <span className="pf-verified-pill">{"\u{1F451}"}</span>}
          {!isAdmin && user.globalRole === "official" ? (
            <span className="official-chat-tag" style={{ fontSize: 8, padding: "2px 8px", marginLeft: "auto" }}>{"\u{1F6E1}\uFE0F"} OFFICIAL</span>
          ) : (
            <span className="pf-home-icon">{"\u{1F3E0}"}</span>
          )}
        </div>

        <div className="pf-stats-row">
          {[
            { label: "Following", val: user.following || 0, action: () => { setShowFollowingList(true); loadFollowing(); } },
            { label: "Followers", val: user.followers || 0, action: () => { setShowFollowersList(true); loadFollowers(); } },
            { label: "Visitors", val: momentCount, dot: true },
          ].map(s => (
            <div key={s.label} className="pf-stat-btn" onClick={s.action}>
              <p className="pf-stat-value">{s.val}</p>
              <p className="pf-stat-label">{s.label}</p>
              {s.dot && <div className="pf-stat-dot" />}
            </div>
          ))}
        </div>

        <div className="pf-level-badge-row">
          <div className="pf-level-badge">
            <div className="pf-level-badge-core">{user.level}</div>
            <span className="pf-wing">{"\u2726"}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(162,155,254,0.4)", marginBottom: 4 }}>
              <span>Lv.{user.level}</span><span>{user.xp.toLocaleString()}/{(user.level * 1000).toLocaleString()} XP</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, width: `${xpPct}%`, background: "linear-gradient(90deg, #60a5fa, #a78bfa)", transition: "width 0.5s" }} />
            </div>
          </div>
          <span className="pf-chevron">{"\u203A"}</span>
        </div>
      </div>

      <div className="pf-functions-section">
        <p className="pf-section-title">Functions</p>
        <div className="pf-func-grid">
          {PROFILE_FUNCTIONS.map(item => (
            <button
              key={item.label}
              className="pf-func-card"
              onClick={() => handleMenu(item.action)}
            >
              <div
                className="pf-func-bubble"
                style={{
                  background: `radial-gradient(circle at 30% 25%, ${item.color}33, ${item.color}0d 60%, transparent 100%), linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.2))`,
                  borderColor: `${item.color}55`,
                  boxShadow: `0 0 18px ${item.glow}, inset 0 1px 0 rgba(255,255,255,0.12)`,
                }}
              >
                <span className="pf-func-icon" style={{ filter: `drop-shadow(0 0 6px ${item.glow})` }}>{item.icon}</span>
              </div>
              <span className="pf-func-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 16px", paddingBottom: 100 }}>
        <p style={{ textAlign: "center", fontSize: 9, color: "rgba(139,122,170,0.2)", padding: "16px 0" }}>
          Galaxy Voice Chat v2.0 {"\u00B7"} UID: {user.uid.slice(0, 10).toUpperCase()}
        </p>
      </div>

      {showSettings && (
        <BottomSheet onClose={() => setShowSettings(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u2699\uFE0F"} Settings</h2>
            <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SETTINGS_ITEMS.map((item, i) => (
              <React.Fragment key={item.label}>
                <button
                  onClick={() => { setShowSettings(false); handleMenu(item.action); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    width: "100%", padding: "12px 8px", background: "none", border: "none",
                    cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s",
                    borderRadius: 12,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(168,85,247,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(168,85,247,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{item.label}</p>
                    <p style={{ fontSize: 10, color: "rgba(139,122,170,0.4)", marginTop: 1 }}>{item.desc}</p>
                  </div>
                  {"badge" in item && (item as any).badge > 0 && (
                    <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, padding: "0 5px", color: "#fff" }}>{(item as any).badge}</span>
                  )}
                  <span style={{ color: "rgba(139,122,170,0.2)", fontSize: 16, fontWeight: 300 }}>{"\u203A"}</span>
                </button>
                {i < SETTINGS_ITEMS.length - 1 && (<div style={{ height: 1, background: "rgba(168,85,247,0.04)", marginLeft: 56 }} />)}
              </React.Fragment>
            ))}
          </div>

          {(user.globalRole === "official" || isAdmin) && (
            <>
              <div style={{ height: 1, background: "rgba(255,215,0,0.1)", margin: "12px 0" }} />
              <p style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,215,0,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Administration</p>
              {(user.globalRole === "official" || isAdmin) && (
                <button onClick={() => { setShowSettings(false); setShowOfficialRules(true); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 8px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", borderRadius: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{"\u{1F4DC}"}</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, color: "#00ffff", fontWeight: 600 }}>Official Guidelines</p>
                  </div>
                  <span style={{ color: "rgba(0,255,255,0.2)", fontSize: 16 }}>{"\u203A"}</span>
                </button>
              )}
              {isAdmin && (
                <button onClick={() => { setShowSettings(false); handleMenu("admin"); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 8px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", borderRadius: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,215,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{"\u{1F6E1}\uFE0F"}</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, color: "#FFD700", fontWeight: 600 }}>Admin Panel</p>
                  </div>
                  <span style={{ color: "rgba(255,215,0,0.2)", fontSize: 16 }}>{"\u203A"}</span>
                </button>
              )}
              {isAdmin && (
                <button onClick={() => { setShowSettings(false); if (onAdminRecharge) onAdminRecharge(); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 8px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", borderRadius: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,230,118,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{"\u{1F4B3}"}</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, color: "#00e676", fontWeight: 600 }}>Recharge Approvals</p>
                    <p style={{ fontSize: 10, color: "rgba(0,230,118,0.5)" }}>Approve UPI recharge requests</p>
                  </div>
                  <span style={{ color: "rgba(0,230,118,0.2)", fontSize: 16 }}>{"\u203A"}</span>
                </button>
              )}
              {isAdmin && (
                <button onClick={() => { setShowSettings(false); setShowGodMode(true); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 8px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", borderRadius: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, rgba(191,0,255,0.15), rgba(0,255,255,0.08))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{"\u26A1"}</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}><span style={{ color: "#bf00ff" }}>God</span> <span style={{ color: "#00ffff" }}>Mode</span></p>
                  </div>
                  <span style={{ color: "rgba(191,0,255,0.2)", fontSize: 16 }}>{"\u203A"}</span>
                </button>
              )}
              {isAdmin && (
                <button onClick={() => { setShowSettings(false); handleMenu("reportQueue"); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 8px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", borderRadius: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,150,50,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{"\u{1F4CB}"}</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, color: "#FFA726", fontWeight: 600 }}>Report Queue</p>
                  </div>
                  <span style={{ color: "rgba(255,150,50,0.2)", fontSize: 16 }}>{"\u203A"}</span>
                </button>
              )}
            </>
          )}

          <div style={{ height: 1, background: "rgba(255,100,130,0.08)", margin: "12px 0" }} />
          <button onClick={() => { setShowSettings(false); handleLogout(); }} className="pf-logout-btn">{"\u{1F6AA}"} Log Out</button>
        </BottomSheet>
      )}

      {showWallet && (
        <BottomSheet onClose={() => setShowWallet(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F4B0}"} My Wallet</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowHistory(true); setShowWallet(false); }} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>{"\u{1F4CB}"} History</button>
              <button onClick={() => setShowWallet(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
            </div>
          </div>
          {/* Coin balance */}
          <div style={{
            display: "flex", alignItems: "center", gap: 16, padding: "18px 20px",
            background: "linear-gradient(135deg,rgba(108,92,231,0.18),rgba(167,139,250,0.08))",
            border: "1px solid rgba(167,139,250,0.25)", borderRadius: 18, marginBottom: 18,
          }}>
            <span style={{ fontSize: 42 }}>{"\u{1F48E}"}</span>
            <div>
              <p style={{ fontSize: 12, color: "rgba(162,155,254,0.6)", fontWeight: 600 }}>YOUR BALANCE</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: "#c4b5fd", lineHeight: 1 }}>{user.coins.toLocaleString()}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>coins</p>
            </div>
          </div>
          {/* Recharge CTA */}
          <button
            onClick={() => { setShowWallet(false); if (onRecharge) onRecharge(); }}
            style={{
              width: "100%", padding: "15px 0", borderRadius: 16, border: "none",
              background: "linear-gradient(135deg,#7c3aed,#a855f7)",
              color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer",
              fontFamily: "inherit", marginBottom: 12,
              boxShadow: "0 0 24px rgba(124,58,237,0.45)",
            }}
          >
            {"\u{1F4B3}"} Recharge via UPI
          </button>
          <p style={{ fontSize: 11, color: "rgba(162,155,254,0.35)", textAlign: "center" }}>
            Pay via GPay, PhonePe or Paytm {"\u2022"} Instant approval
          </p>
        </BottomSheet>
      )}

      {showHistory && (
        <BottomSheet onClose={() => setShowHistory(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F4CB}"} Transaction History</h2>
            <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {transactions.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No transactions yet</p>
            ) : (
              transactions.slice(0, 50).map(tx => (
                <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 20 }}>
                    {tx.type === "recharge" ? "\u{1F48E}" : tx.type === "gift_sent" ? "\u{1F381}" : tx.type === "gift_received" ? "\u{1F4E5}" : tx.type === "daily_reward" ? "\u{1F31F}" : tx.type === "task_reward" ? "\u2705" : "\u2B50"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{tx.description}</p>
                    <p style={{ fontSize: 10, color: "rgba(162,155,254,0.35)" }}>
                      {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: tx.amount >= 0 ? "#00e676" : "#ff6482" }}>{tx.amount >= 0 ? "+" : ""}{tx.amount}</span>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {showAchievements && (
        <BottomSheet onClose={() => setShowAchievements(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F3C6}"} Achievements ({unlockedCount}/{achievements.length})</h2>
            <button onClick={() => setShowAchievements(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {achievements.map(a => (
              <div key={a.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                background: a.unlocked ? "rgba(108,92,231,0.1)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${a.unlocked ? "rgba(108,92,231,0.3)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 14, opacity: a.unlocked ? 1 : 0.5,
              }}>
                <span style={{ fontSize: 28, filter: a.unlocked ? "none" : "grayscale(1)" }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: a.unlocked ? "#fff" : "rgba(255,255,255,0.5)" }}>{a.title}</p>
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)" }}>{a.description}</p>
                </div>
                {a.unlocked && <span style={{ fontSize: 20 }}>{"\u2705"}</span>}
              </div>
            ))}
          </div>
        </BottomSheet>
      )}

      {showDailyTasks && (
        <BottomSheet onClose={() => setShowDailyTasks(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u2705"} Daily Tasks</h2>
            <button onClick={() => setShowDailyTasks(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dailyTasks.map(task => (
              <div key={task.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                background: task.completed ? "rgba(0,230,118,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${task.completed ? "rgba(0,230,118,0.2)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 14,
              }}>
                <span style={{ fontSize: 24, filter: task.completed ? "none" : "grayscale(0.5)" }}>{task.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: task.completed ? "#00e676" : "#fff" }}>{task.title}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.07)" }}>
                      <div style={{
                        height: "100%", borderRadius: 2,
                        width: `${Math.min(100, (task.progress / task.target) * 100)}%`,
                        background: task.completed ? "#00e676" : "linear-gradient(90deg,#6C5CE7,#A29BFE)",
                        transition: "width 0.3s",
                      }} />
                    </div>
                    <span style={{ fontSize: 10, color: "rgba(162,155,254,0.45)", whiteSpace: "nowrap" }}>{task.progress}/{task.target}</span>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: task.completed ? "#00e676" : "#FFD700" }}>
                    {task.completed ? "\u2705" : `+${task.reward}`}
                  </span>
                  {!task.completed && <p style={{ fontSize: 8, color: "rgba(162,155,254,0.3)" }}>coins</p>}
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "rgba(162,155,254,0.3)", textAlign: "center", marginTop: 14 }}>
            Tasks reset daily at midnight
          </p>
        </BottomSheet>
      )}

      {showPrivacy && (
        <BottomSheet onClose={() => setShowPrivacy(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F512}"} Privacy & Settings</h2>
            <button onClick={() => setShowPrivacy(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: "rgba(162,155,254,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>Privacy</p>
            <PrivacyToggle label="Profile Visible" value={privacy.profileVisible} onChange={v => setPrivacy({ ...privacy, profileVisible: v })} />
            <PrivacyToggle label="Show Online Status" value={privacy.showOnline} onChange={v => setPrivacy({ ...privacy, showOnline: v })} />
            <PrivacyToggle label="Allow Gifts" value={privacy.allowGifts} onChange={v => setPrivacy({ ...privacy, allowGifts: v })} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 8 }}>Who can message you</p>
              <div style={{ display: "flex", gap: 8 }}>
                {(["everyone", "friends", "nobody"] as const).map(opt => (
                  <button key={opt} onClick={() => setPrivacy({ ...privacy, allowMessages: opt })} style={{
                    flex: 1, padding: "10px 0", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
                    background: privacy.allowMessages === opt ? "rgba(108,92,231,0.3)" : "rgba(255,255,255,0.04)",
                    color: privacy.allowMessages === opt ? "#A29BFE" : "rgba(162,155,254,0.4)",
                    fontSize: 12, fontWeight: 700, textTransform: "capitalize",
                  }}>{opt}</button>
                ))}
              </div>
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
            <p style={{ fontSize: 12, fontWeight: 800, color: "rgba(162,155,254,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>Notifications</p>
            <PrivacyToggle label="Push Notifications" value={privacy.pushNotifications !== false} onChange={v => setPrivacy({ ...privacy, pushNotifications: v })} />
            <PrivacyToggle label="Message Notifications" value={privacy.messageNotifications !== false} onChange={v => setPrivacy({ ...privacy, messageNotifications: v })} />
            <PrivacyToggle label="Gift Notifications" value={privacy.giftNotifications !== false} onChange={v => setPrivacy({ ...privacy, giftNotifications: v })} />
            <PrivacyToggle label="Room Invite Notifications" value={privacy.roomInviteNotifications !== false} onChange={v => setPrivacy({ ...privacy, roomInviteNotifications: v })} />
          </div>
          <button className="btn btn-primary btn-full" style={{ marginTop: 20 }} onClick={handleSavePrivacy}>Save Settings</button>
        </BottomSheet>
      )}

      {showFriendRequests && (
        <BottomSheet onClose={() => setShowFriendRequests(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F91D}"} Friend Requests</h2>
            <button onClick={() => setShowFriendRequests(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {friendRequests.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No pending requests</p>
            ) : (
              friendRequests.map(req => (
                <div key={req.id} className="card" style={{ padding: 14, marginBottom: 10, border: "1px solid rgba(108,92,231,0.15)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 24, fontSize: 24,
                      background: "rgba(108,92,231,0.12)",
                      border: "2px solid rgba(108,92,231,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden",
                    }}>
                      {req.fromAvatar?.startsWith("http")
                        ? <img src={req.fromAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                        : <span>{req.fromAvatar || "\u{1F464}"}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.fromName}</p>
                      <p style={{ fontSize: 10, color: "rgba(162,155,254,0.35)", marginTop: 2 }}>
                        {new Date(req.timestamp).toLocaleDateString()} {"\u00B7"} wants to be friends
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleFriendResponse(req.id, true)}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 12, border: "none", cursor: "pointer",
                        background: "linear-gradient(135deg, rgba(0,230,118,0.2), rgba(0,230,118,0.08))",
                        color: "#00e676", fontSize: 13, fontWeight: 800, fontFamily: "inherit",
                        boxShadow: "0 0 12px rgba(0,230,118,0.15)",
                      }}
                    >{"\u2714"} Accept</button>
                    <button
                      onClick={() => handleFriendResponse(req.id, false)}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 12, border: "none", cursor: "pointer",
                        background: "linear-gradient(135deg, rgba(255,82,82,0.2), rgba(255,82,82,0.08))",
                        color: "#ff5252", fontSize: 13, fontWeight: 800, fontFamily: "inherit",
                        boxShadow: "0 0 12px rgba(255,82,82,0.15)",
                      }}
                    >{"\u2715"} Decline</button>
                    <button
                      onClick={() => handleFriendBlock(req)}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 12, border: "none", cursor: "pointer",
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 800, fontFamily: "inherit",
                      }}
                    >{"\u{1F6AB}"} Block</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {showFriendsList && (
        <BottomSheet onClose={() => setShowFriendsList(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F465}"} Friends ({user.friends || 0})</h2>
            <button onClick={() => setShowFriendsList(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {friendProfiles.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No friends yet</p>
            ) : (
              friendProfiles.map(fp => (
                <div key={fp.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div onClick={() => { setShowFriendsList(false); setViewingProfile(fp); }} style={{
                    width: 40, height: 40, borderRadius: 20, fontSize: 20,
                    background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, cursor: "pointer",
                  }}>
                    {fp.avatar?.startsWith("http")
                      ? <img src={fp.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
                      : (fp.avatar && fp.avatar.length <= 4 ? fp.avatar : "\u{1F464}")}
                  </div>
                  <div onClick={() => { setShowFriendsList(false); setViewingProfile(fp); }} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                    <p style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fp.name}</p>
                    <p style={{ fontSize: 10, color: fp.online ? "#00e676" : "rgba(162,155,254,0.35)" }}>{fp.online ? "Online" : "Offline"}</p>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: "4px 10px", borderRadius: 10 }} onClick={async () => {
                    try {
                      await getOrCreateConversation(user.uid, user.name, user.avatar, fp.uid, fp.name, fp.avatar);
                      setShowFriendsList(false);
                      if (onMessage) onMessage(fp.uid);
                    } catch { showToast("Could not open chat", "error"); }
                  }}>{"\u{1F4AC}"}</button>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "4px 10px" }} onClick={() => handleRemoveFriend(fp.uid)}>Remove</button>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {showFollowersList && (
        <BottomSheet onClose={() => setShowFollowersList(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F465}"} Followers ({user.followers || 0})</h2>
            <button onClick={() => setShowFollowersList(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {followerLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="skeleton skeleton-circle" style={{ width: 40, height: 40, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}><div className="skeleton skeleton-text" style={{ width: "50%" }} /></div>
                </div>
              ))
            ) : followerProfiles.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No followers yet</p>
            ) : (
              followerProfiles.map(fp => (
                <div key={fp.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div onClick={() => { setShowFollowersList(false); setViewingProfile(fp); }} style={{
                    width: 40, height: 40, borderRadius: 20, fontSize: 20,
                    background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, cursor: "pointer",
                  }}>
                    {fp.avatar?.startsWith("http")
                      ? <img src={fp.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
                      : (fp.avatar && fp.avatar.length <= 4 ? fp.avatar : "\u{1F464}")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => { setShowFollowersList(false); setViewingProfile(fp); }}>
                    <p style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fp.name}</p>
                    <p style={{ fontSize: 10, color: fp.online ? "#00e676" : "rgba(162,155,254,0.35)" }}>{fp.online ? "Online" : "Offline"}</p>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: "4px 10px", borderRadius: 10 }} onClick={async () => {
                    try {
                      await getOrCreateConversation(user.uid, user.name, user.avatar, fp.uid, fp.name, fp.avatar);
                      setShowFollowersList(false);
                      if (onMessage) onMessage(fp.uid);
                    } catch { showToast("Could not open chat", "error"); }
                  }}>{"\u{1F4AC}"} Chat</button>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {showFollowingList && (
        <BottomSheet onClose={() => setShowFollowingList(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F465}"} Following ({user.following || 0})</h2>
            <button onClick={() => setShowFollowingList(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {followingLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="skeleton skeleton-circle" style={{ width: 40, height: 40, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}><div className="skeleton skeleton-text" style={{ width: "50%" }} /></div>
                </div>
              ))
            ) : followingProfiles.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No one followed yet</p>
            ) : (
              followingProfiles.map(fp => (
                <div key={fp.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div onClick={() => { setShowFollowingList(false); setViewingProfile(fp); }} style={{
                    width: 40, height: 40, borderRadius: 20, fontSize: 20,
                    background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, cursor: "pointer",
                  }}>
                    {fp.avatar?.startsWith("http")
                      ? <img src={fp.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
                      : (fp.avatar && fp.avatar.length <= 4 ? fp.avatar : "\u{1F464}")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => { setShowFollowingList(false); setViewingProfile(fp); }}>
                    <p style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fp.name}</p>
                    <p style={{ fontSize: 10, color: fp.online ? "#00e676" : "rgba(162,155,254,0.35)" }}>{fp.online ? "Online" : "Offline"}</p>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: "4px 10px", borderRadius: 10 }} onClick={async () => {
                    try {
                      await getOrCreateConversation(user.uid, user.name, user.avatar, fp.uid, fp.name, fp.avatar);
                      setShowFollowingList(false);
                      if (onMessage) onMessage(fp.uid);
                    } catch { showToast("Could not open chat", "error"); }
                  }}>{"\u{1F4AC}"} Chat</button>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {viewingProfile && (
        <BottomSheet onClose={() => { setViewingProfile(null); setShowBanMenu(false); }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>Profile</h2>
            <button onClick={() => { setViewingProfile(null); setShowBanMenu(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingBottom: 16 }}>
            <div style={{ position: "relative" }}>
              <div className={viewingProfile.vip ? "vip-glow-border" : ""} style={{
                width: 80, height: 80, borderRadius: 40, fontSize: 40,
                background: "rgba(108,92,231,0.15)",
                border: viewingProfile.vip ? undefined : "3px solid rgba(108,92,231,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                boxShadow: viewingProfile.vip ? undefined : "0 0 15px rgba(108,92,231,0.2)",
                transition: "all 0.3s ease",
              }}>
                {viewingProfile.avatar?.startsWith("http")
                  ? <img src={viewingProfile.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 40 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
                  : (viewingProfile.avatar && viewingProfile.avatar.length <= 4 ? viewingProfile.avatar : "\u{1F464}")}
              </div>
              {viewingProfile.globalRole === "official" && !isSuperAdmin(viewingProfile) && (
                <img src={`${import.meta.env.BASE_URL}assets/official/official_badge_new.png`} alt="Official" style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", height: 18 }} />
              )}
            </div>
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <p style={{ fontSize: 18, fontWeight: 900 }}>{viewingProfile.name}</p>
              {viewingProfile.globalRole === "official" && !isSuperAdmin(viewingProfile) && (
                <span className="official-chat-tag" style={{ fontSize: 9, padding: "2px 10px", borderRadius: 8 }}>{"\u{1F6E1}\uFE0F"} OFFICIAL</span>
              )}
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginTop: 4 }}>Level {viewingProfile.level} {"\u00B7"} {viewingProfile.xp} XP</p>
              {viewingProfile.bio && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 6, lineHeight: 1.5 }}>{viewingProfile.bio}</p>}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}><p style={{ fontSize: 16, fontWeight: 900 }}>{viewingProfile.followers || 0}</p><p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>Followers</p></div>
              <div style={{ textAlign: "center" }}><p style={{ fontSize: 16, fontWeight: 900 }}>{viewingProfile.following || 0}</p><p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>Following</p></div>
              <div style={{ textAlign: "center" }}><p style={{ fontSize: 16, fontWeight: 900 }}>{viewingProfile.friends || 0}</p><p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>Friends</p></div>
              <div style={{ textAlign: "center" }}><p style={{ fontSize: 16, fontWeight: 900 }}>{"\u{1F381}"} {viewingProfile.totalEarnings || 0}</p><p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>Gifts</p></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8, width: "100%" }}>
              <button className="btn btn-primary" style={{ flex: 1, fontSize: 13, padding: "12px 0", borderRadius: 14 }} onClick={async () => {
                try {
                  await getOrCreateConversation(user.uid, user.name, user.avatar, viewingProfile!.uid, viewingProfile!.name, viewingProfile!.avatar);
                  setViewingProfile(null);
                  if (onMessage) onMessage(viewingProfile!.uid);
                } catch { showToast("Could not open chat", "error"); }
              }}>{"\u{1F4AC}"} Message</button>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13, padding: "12px 0", borderRadius: 14 }} onClick={async () => {
                try {
                  const isF = (user.followingList || []).includes(viewingProfile!.uid);
                  if (isF) { showToast("Already following!", "info"); }
                  else {
                    const res = await followUser(user.uid, viewingProfile!.uid);
                    showToast(res.isMutual ? "You're now friends!" : "Followed!", "success");
                  }
                } catch { showToast("Follow failed", "error"); }
              }}>{(user.followingList || []).includes(viewingProfile.uid) ? "\u2705 Following" : "\u2795 Follow"}</button>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13, padding: "12px 0", borderRadius: 14 }} onClick={async () => {
                try {
                  await sendFriendRequest(user.uid, user.name, user.avatar, viewingProfile!.uid);
                  showToast("Friend request sent!", "success");
                } catch { showToast("Request failed", "error"); }
              }}>{"\u{1F91D}"} Add Friend</button>
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
                    } catch { showToast("Failed to delete DP", "error"); }
                    setModLoading(false);
                  }}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 12,
                    background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)",
                    color: "#ff5555", fontWeight: 700, fontSize: 12, cursor: "pointer",
                    opacity: modLoading ? 0.5 : 1,
                  }}
                >{"\u{1F5D1}\uFE0F"} Delete DP</button>
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
                    } catch { showToast("Failed to reset name", "error"); }
                    setModLoading(false);
                  }}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 12,
                    background: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.2)",
                    color: "#ff9933", fontWeight: 700, fontSize: 12, cursor: "pointer",
                    opacity: modLoading ? 0.5 : 1,
                  }}
                >{"\u{1F504}"} Reset Name</button>
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
                >{"\u{1F6E1}\uFE0F"} Manage User {showBanMenu ? "\u25B2" : "\u25BC"}</button>

                {showBanMenu && (
                  <div style={{
                    marginTop: 10,
                    background: "linear-gradient(135deg, rgba(30,10,25,0.95), rgba(20,8,35,0.98))",
                    border: "1px solid rgba(255,60,60,0.15)",
                    borderRadius: 16,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}>
                    <p style={{ fontSize: 11, color: "rgba(255,150,150,0.5)", fontWeight: 600, textAlign: "center", marginBottom: 4 }}>
                      {isUserBanned(viewingProfile) ? "\u{1F534} User is currently BANNED" : "\u{1F7E2} User is active"}
                    </p>

                    {([
                      { duration: "4h" as BanDuration, label: "4 Hours Ban", desc: "Temporary restriction", icon: "\u23F0" },
                      { duration: "24h" as BanDuration, label: "24 Hours Ban", desc: "Daily restriction", icon: "\u{1F4C5}" },
                      { duration: "7d" as BanDuration, label: "7 Days Ban", desc: "Weekly restriction", icon: "\u{1F4C6}" },
                      { duration: "permanent" as BanDuration, label: "Permanent ID Ban", desc: "Total access block", icon: "\u{1F6AB}" },
                    ]).map(opt => (
                      <button
                        key={opt.duration}
                        disabled={banLoading}
                        onClick={async () => {
                          if (!confirm(`Are you sure you want to apply "${opt.label}" to ${viewingProfile!.name}?`)) return;
                          setBanLoading(true);
                          try {
                            await banUser(viewingProfile!.uid, opt.duration, user.uid);
                            const refreshed = await getUser(viewingProfile!.uid);
                            if (refreshed) setViewingProfile(refreshed);
                            showToast(`${viewingProfile!.name} has been banned (${opt.label})`, "success");
                          } catch { showToast("Ban failed", "error"); }
                          setBanLoading(false);
                        }}
                        style={{
                          padding: "11px 14px",
                          borderRadius: 12,
                          background: "rgba(255,40,40,0.08)",
                          border: "1px solid rgba(255,60,60,0.15)",
                          color: opt.duration === "permanent" ? "#ff3333" : "#ff5555",
                          fontWeight: opt.duration === "permanent" ? 800 : 600,
                          fontSize: 13,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          textAlign: "left",
                          opacity: banLoading ? 0.5 : 1,
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{opt.icon}</span>
                        <div>
                          <div>{opt.label}</div>
                          <div style={{ fontSize: 10, color: "rgba(255,150,150,0.4)", fontWeight: 400 }}>{opt.desc}</div>
                        </div>
                      </button>
                    ))}

                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

                    <button
                      disabled={banLoading || !isUserBanned(viewingProfile)}
                      onClick={async () => {
                        if (!confirm(`Remove ban from ${viewingProfile!.name}? They will be able to access the app again.`)) return;
                        setBanLoading(true);
                        try {
                          await unbanUser(viewingProfile!.uid, user.uid);
                          const refreshed = await getUser(viewingProfile!.uid);
                          if (refreshed) setViewingProfile(refreshed);
                          showToast(`${viewingProfile!.name} has been unbanned`, "success");
                        } catch { showToast("Unban failed", "error"); }
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
                      <span style={{ fontSize: 18 }}>{"\u2705"}</span>
                      <div>
                        <div>Remove Ban</div>
                        <div style={{ fontSize: 10, color: "rgba(0,200,100,0.4)", fontWeight: 400 }}>Restore access</div>
                      </div>
                    </button>

                    <button
                      disabled={banLoading}
                      onClick={async () => {
                        if (!confirm(`Device ban ${viewingProfile!.name}? Their device will be permanently blocked.`)) return;
                        setBanLoading(true);
                        try {
                          await deviceBanUser(viewingProfile!.uid, user.uid);
                          const refreshed = await getUser(viewingProfile!.uid);
                          if (refreshed) setViewingProfile(refreshed);
                          showToast(`${viewingProfile!.name} device banned!`, "success");
                        } catch { showToast("Device ban failed", "error"); }
                        setBanLoading(false);
                      }}
                      style={{
                        padding: "11px 14px",
                        borderRadius: 12,
                        background: viewingProfile.deviceBanned ? "rgba(255,60,60,0.04)" : "rgba(255,60,60,0.08)",
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
                      <span style={{ fontSize: 18 }}>{"\u{1F4F1}"}</span>
                      <div>
                        <div>{viewingProfile.deviceBanned ? "Already Device Banned" : "Device Ban"}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,150,150,0.4)", fontWeight: 400 }}>Block device permanently</div>
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
                          } catch { showToast("Failed to remove device ban", "error"); }
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
                        <span style={{ fontSize: 18 }}>{"\u2705"}</span>
                        <div>
                          <div>Remove Device Ban</div>
                          <div style={{ fontSize: 10, color: "rgba(0,200,100,0.4)", fontWeight: 400 }}>Unblock device</div>
                        </div>
                      </button>
                    )}

                    <div style={{ height: 1, background: "rgba(191,0,255,0.1)", margin: "4px 0" }} />

                    <button
                      disabled={banLoading || viewingProfile.shadowBanned}
                      onClick={async () => {
                        if (!confirm(`Shadow ban ${viewingProfile!.name}? They can still use the app but messages will be hidden.`)) return;
                        setBanLoading(true);
                        try {
                          await shadowBanUser(viewingProfile!.uid, user.uid);
                          const refreshed = await getUser(viewingProfile!.uid);
                          if (refreshed) setViewingProfile(refreshed);
                          showToast(`${viewingProfile!.name} shadow banned!`, "success");
                        } catch { showToast("Shadow ban failed", "error"); }
                        setBanLoading(false);
                      }}
                      style={{
                        padding: "11px 14px",
                        borderRadius: 12,
                        background: viewingProfile.shadowBanned ? "rgba(191,0,255,0.04)" : "rgba(191,0,255,0.08)",
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
                      <span style={{ fontSize: 18 }}>{"\u{1F47B}"}</span>
                      <div>
                        <div>{viewingProfile.shadowBanned ? "Already Shadow Banned" : "Shadow Ban"}</div>
                        <div style={{ fontSize: 10, color: "rgba(191,0,255,0.4)", fontWeight: 400 }}>Hide messages silently</div>
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
                          } catch { showToast("Failed to lift shadow ban", "error"); }
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
                        <span style={{ fontSize: 18 }}>{"\u2705"}</span>
                        <div>
                          <div>Lift Shadow Ban</div>
                          <div style={{ fontSize: 10, color: "rgba(0,200,100,0.4)", fontWeight: 400 }}>Restore message visibility</div>
                        </div>
                      </button>
                    )}

                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {viewingProfile.isBanned && (
                        <span style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 8, background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,60,60,0.3)", color: "#ff5555" }}>{"\u{1F534}"} BANNED</span>
                      )}
                      {viewingProfile.deviceBanned && (
                        <span style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 8, background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,60,60,0.3)", color: "#ff3333" }}>{"\u{1F4F1}"} DEVICE BANNED</span>
                      )}
                      {viewingProfile.shadowBanned && (
                        <span style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 8, background: "rgba(191,0,255,0.15)", border: "1px solid rgba(191,0,255,0.3)", color: "#bf00ff" }}>{"\u{1F47B}"} SHADOW BANNED</span>
                      )}
                      {!viewingProfile.isBanned && !viewingProfile.deviceBanned && !viewingProfile.shadowBanned && (
                        <span style={{ fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 8, background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.25)", color: "#00e676" }}>{"\u{1F7E2}"} ACTIVE</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {showBlocked && (
        <BottomSheet onClose={() => setShowBlocked(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F6AB}"} Blocked Users</h2>
            <button onClick={() => setShowBlocked(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {blockedProfiles.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No blocked users</p>
            ) : (
              blockedProfiles.map(bp => (
                <div key={bp.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 24 }}>{bp.avatar}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{bp.name}</p>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "4px 10px" }} onClick={() => handleUnblock(bp.uid)}>Unblock</button>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {showReport && (
        <BottomSheet onClose={() => setShowReport(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u26A0\uFE0F"} Report Issue</h2>
            <button onClick={() => setShowReport(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input className="input-field" placeholder="User ID (optional)" value={reportTarget} onChange={e => setReportTarget(e.target.value)} style={{ borderRadius: 14, padding: "12px 14px" }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {REPORT_REASONS.map(r => (
                <button key={r} onClick={() => setReportReason(r)} style={{
                  padding: "8px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: reportReason === r ? "rgba(255,100,130,0.2)" : "rgba(255,255,255,0.04)",
                  color: reportReason === r ? "#ff6482" : "rgba(162,155,254,0.5)",
                  fontSize: 12, fontWeight: 600,
                }}>{r}</button>
              ))}
            </div>
            <textarea
              className="input-field"
              placeholder="Describe the issue..."
              value={reportDetails}
              onChange={e => setReportDetails(e.target.value)}
              rows={3}
              style={{ borderRadius: 14, padding: "12px 14px", resize: "none", fontFamily: "inherit" }}
            />
            <button className="btn btn-danger btn-full" onClick={handleReport}>Submit Report</button>
          </div>
        </BottomSheet>
      )}

      {showSearch && (
        <BottomSheet onClose={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(""); }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F50D}"} Find Users</h2>
            <button onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input className="input-field" placeholder="Search by name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              style={{ flex: 1, borderRadius: 14, padding: "12px 14px" }} />
            <button className="btn btn-primary btn-sm" onClick={handleSearch}>{"\u{1F50D}"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {searchResults.map(sr => {
              const isFriend = (user.friendsList || []).includes(sr.uid);
              return (
                <div key={sr.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 24 }}>{sr.avatar}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{sr.name}</p>
                    <p style={{ fontSize: 10, color: "rgba(162,155,254,0.35)" }}>Lv.{sr.level}</p>
                  </div>
                  {isFriend ? (
                    <span style={{ fontSize: 11, color: "#00e676", fontWeight: 600 }}>Friends</span>
                  ) : (
                    <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: "4px 10px" }} onClick={() => handleAddFriend(sr)}>Add Friend</button>
                  )}
                </div>
              );
            })}
          </div>
        </BottomSheet>
      )}

      {showFeedback && (
        <BottomSheet onClose={() => setShowFeedback(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F4AC}"} Send Feedback</h2>
            <button onClick={() => setShowFeedback(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {(["feedback", "bug", "suggestion"] as const).map(t => (
                <button key={t} onClick={() => setFeedbackType(t)} style={{
                  flex: 1, padding: "10px 0", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: feedbackType === t ? "rgba(108,92,231,0.3)" : "rgba(255,255,255,0.04)",
                  color: feedbackType === t ? "#A29BFE" : "rgba(162,155,254,0.4)",
                  fontSize: 12, fontWeight: 700, textTransform: "capitalize",
                }}>
                  {t === "feedback" ? "\u{1F4DD}" : t === "bug" ? "\u{1F41B}" : "\u{1F4A1}"} {t}
                </button>
              ))}
            </div>
            <input
              className="input-field"
              placeholder="Subject"
              value={feedbackSubject}
              onChange={e => setFeedbackSubject(e.target.value)}
              style={{ borderRadius: 14, padding: "12px 14px" }}
            />
            <textarea
              className="input-field"
              placeholder="Tell us what's on your mind..."
              value={feedbackMessage}
              onChange={e => setFeedbackMessage(e.target.value)}
              rows={4}
              style={{ borderRadius: 14, padding: "12px 14px", resize: "none", fontFamily: "inherit" }}
            />
            <button className="btn btn-primary btn-full" onClick={handleSubmitFeedback} disabled={feedbackSending}>
              {feedbackSending ? "Sending..." : "Submit Feedback"}
            </button>
          </div>
        </BottomSheet>
      )}

      {showHelp && (
        <BottomSheet onClose={() => { setShowHelp(false); setShowHelpArticle(null); }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            {showHelpArticle ? (
              <button onClick={() => setShowHelpArticle(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#A29BFE", fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                {"\u2039"} Back
              </button>
            ) : (
              <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u2753"} Help Center</h2>
            )}
            <button onClick={() => { setShowHelp(false); setShowHelpArticle(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {showHelpArticle ? (() => {
              const article = HELP_ARTICLES.find(a => a.id === showHelpArticle);
              if (!article) return null;
              return (
                <div style={{ padding: "0 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 32 }}>{article.icon}</span>
                    <h3 style={{ fontSize: 17, fontWeight: 800 }}>{article.title}</h3>
                  </div>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.8 }}>{article.content}</p>
                </div>
              );
            })() : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {HELP_ARTICLES.map(article => (
                  <button key={article.id} onClick={() => setShowHelpArticle(article.id)} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 12px",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 14, cursor: "pointer", fontFamily: "inherit", width: "100%", transition: "background 0.15s",
                    textAlign: "left",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(108,92,231,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  >
                    <span style={{ fontSize: 22, width: 28, textAlign: "center" }}>{article.icon}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{article.title}</span>
                    <span style={{ color: "rgba(162,155,254,0.3)", fontSize: 14 }}>{"\u203A"}</span>
                  </button>
                ))}
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.3)" }}>Need more help? Send us feedback!</p>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, fontSize: 11 }} onClick={() => { setShowHelp(false); setShowFeedback(true); }}>
                    {"\u{1F4AC}"} Send Feedback
                  </button>
                </div>
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {showAdminPanel && (
        <BottomSheet onClose={() => setShowAdminPanel(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#FFD700" }}>{"\u{1F6E1}\uFE0F"} Admin Panel</h2>
            <button onClick={() => setShowAdminPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div className="card" style={{ padding: 16, marginBottom: 14, border: "1px solid rgba(255,215,0,0.2)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#FFD700" }}>{"\u{1F451}"} Official Promoter</h3>
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 10 }}>
                Enter a User ID to promote or demote as Official
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={adminPromoteId}
                  onChange={e => { setAdminPromoteId(e.target.value); setAdminLookupResult(null); }}
                  placeholder="Enter User ID..."
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,215,0,0.2)",
                    background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 13, fontFamily: "monospace",
                    outline: "none",
                  }}
                />
                <button className="btn btn-sm" style={{ background: "rgba(255,215,0,0.15)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.3)", fontWeight: 700, padding: "8px 16px" }}
                  onClick={handleAdminLookup} disabled={adminLoading}>
                  {adminLoading ? "..." : "\u{1F50D}"}
                </button>
              </div>
              {adminLookupResult && (
                <div style={{
                  padding: 14, borderRadius: 14,
                  background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.15)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 22, fontSize: 22,
                      background: "rgba(108,92,231,0.12)",
                      border: adminLookupResult.globalRole === "official" ? "2px solid #FFD700" : "2px solid rgba(108,92,231,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {adminLookupResult.avatar?.startsWith("http")
                        ? <img src={adminLookupResult.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                        : adminLookupResult.avatar}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adminLookupResult.name}</p>
                      <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontFamily: "monospace" }}>ID: {adminLookupResult.userId}</p>
                      <p style={{ fontSize: 10, color: adminLookupResult.globalRole === "official" ? "#FFD700" : "rgba(162,155,254,0.4)", fontWeight: 700, marginTop: 2 }}>
                        {adminLookupResult.globalRole === "official" ? "\u{1F6E1}\uFE0F Official" : "\u{1F464} Regular User"}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {adminLookupResult.globalRole !== "official" ? (
                      <button className="btn btn-full btn-sm" style={{
                        background: "linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,215,0,0.1))",
                        border: "1px solid rgba(255,215,0,0.4)", color: "#FFD700", fontWeight: 800, padding: "10px 0",
                      }} onClick={handlePromoteOfficial} disabled={adminLoading}>
                        {adminLoading ? "Processing..." : "\u{1F451} Promote to Official"}
                      </button>
                    ) : (
                      <button className="btn btn-full btn-sm btn-danger" style={{ padding: "10px 0", fontWeight: 800 }}
                        onClick={handleDemoteOfficial} disabled={adminLoading}>
                        {adminLoading ? "Processing..." : "\u274C Remove Official"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 16, border: "1px solid rgba(255,215,0,0.2)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8, color: "#FFD700" }}>{"\u{1F5BC}\uFE0F"} Frame Assigner</h3>
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", lineHeight: 1.6 }}>
                Officials automatically receive a golden frame on their avatar.
                The frame <span style={{ color: "rgba(255,215,0,0.7)", fontFamily: "monospace" }}>official_frame.png</span> is assigned when promoted.
              </p>
              <div style={{
                marginTop: 12, padding: 12, borderRadius: 12,
                background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.1)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 20,
                  border: "2.5px solid #FFD700",
                  boxShadow: "0 0 12px rgba(255,215,0,0.4), 0 0 24px rgba(255,215,0,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, background: "rgba(108,92,231,0.12)",
                }}>{"\u{1F464}"}</div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#FFD700" }}>Golden Frame Preview</p>
                  <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>Active on all Official avatars</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 16, marginTop: 14, border: "1px solid rgba(0,255,200,0.2)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#00ffc8" }}>{"\u{1F4B0}"} Wallet Admin</h3>
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 10 }}>
                Edit any user's coin balance
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  type="text"
                  value={walletEditId}
                  onChange={e => { setWalletEditId(e.target.value); setWalletEditUser(null); }}
                  placeholder="Enter User ID..."
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(0,255,200,0.2)",
                    background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 13, fontFamily: "monospace", outline: "none",
                  }}
                />
                <button className="btn btn-sm" style={{ background: "rgba(0,255,200,0.12)", color: "#00ffc8", border: "1px solid rgba(0,255,200,0.3)", fontWeight: 700, padding: "8px 16px" }}
                  onClick={async () => {
                    if (!walletEditId.trim()) return;
                    setWalletLoading(true);
                    try {
                      const found = await getUserByUserId(walletEditId.trim());
                      setWalletEditUser(found);
                      if (found) setWalletNewCoins(String(found.coins || 0));
                      else showToast("User not found", "warning");
                    } catch { showToast("Lookup failed", "error"); }
                    setWalletLoading(false);
                  }} disabled={walletLoading}>
                  {walletLoading ? "..." : "\u{1F50D}"}
                </button>
              </div>
              {walletEditUser && (
                <div style={{
                  padding: 14, borderRadius: 14,
                  background: "rgba(0,255,200,0.04)", border: "1px solid rgba(0,255,200,0.12)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 18, fontSize: 18,
                      background: "rgba(108,92,231,0.12)", border: "2px solid rgba(0,255,200,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                    }}>
                      {walletEditUser.avatar?.startsWith("http")
                        ? <img src={walletEditUser.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                        : walletEditUser.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{walletEditUser.name}</p>
                      <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontFamily: "monospace" }}>Current: {"\u{1F48E}"} {(walletEditUser.coins || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="number"
                      value={walletNewCoins}
                      onChange={e => setWalletNewCoins(e.target.value)}
                      placeholder="New balance..."
                      style={{
                        flex: 1, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(0,255,200,0.2)",
                        background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 14, fontWeight: 700, outline: "none",
                      }}
                    />
                    <button className="btn btn-sm" style={{
                      background: "rgba(0,255,200,0.15)", color: "#00ffc8", border: "1px solid rgba(0,255,200,0.3)",
                      fontWeight: 800, padding: "10px 20px",
                    }} onClick={async () => {
                      const val = parseInt(walletNewCoins);
                      if (isNaN(val) || val < 0) { showToast("Enter a valid amount", "warning"); return; }
                      if (!confirm(`Set ${walletEditUser!.name}'s coins to ${val.toLocaleString()}?`)) return;
                      setWalletLoading(true);
                      try {
                        await setUserCoins(walletEditUser!.uid, val);
                        setWalletEditUser({ ...walletEditUser!, coins: val });
                        showToast(`Coins updated to ${val.toLocaleString()}`, "success");
                      } catch { showToast("Failed to update coins", "error"); }
                      setWalletLoading(false);
                    }} disabled={walletLoading}>
                      {walletLoading ? "..." : "\u2714 Set"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 16, marginTop: 14, border: "1px solid rgba(191,0,255,0.2)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#bf00ff" }}>{"\u{1F4E2}"} Global Notice</h3>
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 10 }}>
                Send a scrolling alert visible to all users
              </p>
              <textarea
                value={globalAlertText}
                onChange={e => setGlobalAlertText(e.target.value)}
                placeholder="Type your global alert message..."
                maxLength={200}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 12,
                  border: "1px solid rgba(191,0,255,0.2)", background: "rgba(255,255,255,0.04)",
                  color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none",
                  resize: "none", minHeight: 60, boxSizing: "border-box",
                }}
              />
              <p style={{ fontSize: 10, color: "rgba(162,155,254,0.3)", textAlign: "right", marginTop: 4 }}>
                {globalAlertText.length}/200
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn-sm" style={{
                  flex: 1, background: "linear-gradient(135deg, rgba(191,0,255,0.2), rgba(191,0,255,0.08))",
                  border: "1px solid rgba(191,0,255,0.3)", color: "#bf00ff", fontWeight: 800, padding: "10px 0",
                }} onClick={async () => {
                  if (!globalAlertText.trim()) { showToast("Enter a message", "warning"); return; }
                  setAlertSending(true);
                  try {
                    await sendGlobalAlert(globalAlertText.trim(), user.uid, user.name);
                    showToast("Global alert sent!", "success");
                    setGlobalAlertText("");
                  } catch { showToast("Failed to send alert", "error"); }
                  setAlertSending(false);
                }} disabled={alertSending || !globalAlertText.trim()}>
                  {alertSending ? "Sending..." : "\u{1F4E2} Send Alert"}
                </button>
                <button className="btn btn-sm" style={{
                  background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)",
                  color: "#ff5555", fontWeight: 700, padding: "10px 16px",
                }} onClick={async () => {
                  if (!confirm("Clear all global alerts?")) return;
                  try {
                    await clearGlobalAlerts();
                    showToast("All alerts cleared", "info");
                  } catch { showToast("Failed to clear", "error"); }
                }}>
                  {"\u{1F5D1}\uFE0F"} Clear
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: 16, marginTop: 14, border: "1px solid rgba(0,255,255,0.2)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#00ffff" }}>{"\u{1F3E0}"} Official Room Manager</h3>
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 14 }}>
                Manage Room 11111 &bull; Official room settings
              </p>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: "rgba(0,255,255,0.6)", fontWeight: 700, marginBottom: 6, display: "block" }}>Room Name</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="text" value={ormRoomName} onChange={e => setOrmRoomName(e.target.value)}
                    placeholder="Room name..."
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 12,
                      border: "1px solid rgba(0,255,255,0.2)", background: "rgba(255,255,255,0.04)",
                      color: "#fff", fontSize: 13, outline: "none",
                    }}
                  />
                  <button className="btn btn-sm" style={{
                    background: "rgba(0,255,255,0.12)", color: "#00ffff",
                    border: "1px solid rgba(0,255,255,0.3)", fontWeight: 700, padding: "8px 16px",
                  }} onClick={async () => {
                    if (!ormRoomName.trim()) return;
                    setOrmLoading(true);
                    try {
                      await updateRoomSettings("11111", { name: ormRoomName.trim() });
                      showToast("Room name updated!", "success");
                    } catch { showToast("Failed", "error"); }
                    setOrmLoading(false);
                  }} disabled={ormLoading}>
                    {ormLoading ? "..." : "\u2714"}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: "rgba(0,255,255,0.6)", fontWeight: 700, marginBottom: 6, display: "block" }}>Background Theme</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ROOM_THEMES.map(t => (
                    <button key={t.id} onClick={async () => {
                      setOrmTheme(t.id);
                      setOrmLoading(true);
                      try {
                        await updateRoomSettings("11111", { theme: t.id });
                        showToast(`Theme set to ${t.name}`, "success");
                      } catch { showToast("Failed", "error"); }
                      setOrmLoading(false);
                    }} style={{
                      padding: "6px 14px", borderRadius: 10, cursor: "pointer",
                      fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                      background: ormTheme === t.id ? "rgba(0,255,255,0.15)" : "rgba(255,255,255,0.04)",
                      color: ormTheme === t.id ? "#00ffff" : "rgba(255,255,255,0.4)",
                      border: ormTheme === t.id ? "1px solid rgba(0,255,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    }}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: "rgba(0,255,255,0.6)", fontWeight: 700, marginBottom: 6, display: "block" }}>Seat Limit</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[8, 10, 12, 16, 20].map(n => (
                    <button key={n} onClick={async () => {
                      setOrmSeatCount(String(n));
                      setOrmLoading(true);
                      try {
                        await setRoomSeatCount("11111", n);
                        showToast(`Seats set to ${n}`, "success");
                      } catch { showToast("Failed", "error"); }
                      setOrmLoading(false);
                    }} style={{
                      flex: 1, padding: "8px 0", borderRadius: 10, cursor: "pointer",
                      fontFamily: "inherit", fontSize: 13, fontWeight: 800,
                      background: ormSeatCount === String(n) ? "rgba(0,255,255,0.15)" : "rgba(255,255,255,0.04)",
                      color: ormSeatCount === String(n) ? "#00ffff" : "rgba(255,255,255,0.4)",
                      border: ormSeatCount === String(n) ? "1px solid rgba(0,255,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", borderRadius: 12, marginBottom: 10,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{"\u{1F512}"} Official Only (Lock Mic)</p>
                  <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>Only admins can use mic</p>
                </div>
                <button onClick={async () => {
                  const newVal = !ormOfficialOnly;
                  setOrmOfficialOnly(newVal);
                  setOrmLoading(true);
                  try {
                    await updateRoomSettings("11111", { micPermission: newVal ? "admin_only" : "all" });
                    showToast(newVal ? "Mic locked to admins" : "Mic open for all", "success");
                  } catch { showToast("Failed", "error"); }
                  setOrmLoading(false);
                }} style={{
                  width: 48, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
                  background: ormOfficialOnly ? "#00ffff" : "rgba(255,255,255,0.12)",
                  position: "relative", transition: "background 0.2s",
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 11, background: "#fff",
                    position: "absolute", top: 3,
                    left: ormOfficialOnly ? 23 : 3,
                    transition: "left 0.2s",
                  }} />
                </button>
              </div>

              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", borderRadius: 12, marginBottom: 14,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{"\u{1F680}"} Auto-Entry</p>
                  <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>New users auto-join this room</p>
                </div>
                <button onClick={async () => {
                  const newVal = !ormAutoEntry;
                  setOrmAutoEntry(newVal);
                  setOrmLoading(true);
                  try {
                    await setAutoEntryRoom("11111", newVal);
                    showToast(newVal ? "Auto-entry ON" : "Auto-entry OFF", "success");
                  } catch { showToast("Failed", "error"); }
                  setOrmLoading(false);
                }} style={{
                  width: 48, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
                  background: ormAutoEntry ? "#00ffff" : "rgba(255,255,255,0.12)",
                  position: "relative", transition: "background 0.2s",
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 11, background: "#fff",
                    position: "absolute", top: 3,
                    left: ormAutoEntry ? 23 : 3,
                    transition: "left 0.2s",
                  }} />
                </button>
              </div>

              <button className="btn btn-full" style={{
                padding: "12px 0",
                background: "rgba(255,60,60,0.12)", border: "1px solid rgba(255,60,60,0.25)",
                color: "#ff5555", fontWeight: 800,
              }} onClick={async () => {
                if (!confirm("Delete ALL empty rooms (0 listeners) except Room 11111?")) return;
                setOrmLoading(true);
                try {
                  const count = await wipeDummyRooms();
                  showToast(`Wiped ${count} dummy rooms!`, "success");
                } catch { showToast("Failed to wipe rooms", "error"); }
                setOrmLoading(false);
              }} disabled={ormLoading}>
                {ormLoading ? "Wiping..." : "\u{1F5D1}\uFE0F Wipe Test Rooms"}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {showGodMode && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1200, background: "#0a0618",
          display: "flex", flexDirection: "column", maxWidth: 430, margin: "0 auto",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "52px 16px 12px",
            background: "linear-gradient(180deg, rgba(191,0,255,0.15) 0%, transparent 100%)",
            borderBottom: "1px solid rgba(191,0,255,0.2)",
          }}>
            <button onClick={() => setShowGodMode(false)} style={{
              width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(191,0,255,0.3)", cursor: "pointer", fontSize: 16, color: "#fff",
            }}>{"\u2039"}</button>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#00ffff", textShadow: "0 0 12px rgba(0,255,255,0.4)" }}>
              {"\u26A1"} God Mode
            </h2>
            <div style={{ width: 36 }} />
          </div>

          <div style={{
            display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            overflowX: "auto",
          }}>
            {([
              ["deviceBan", "\u{1F4F1}", "Device Ban"],
              ["shadowBan", "\u{1F47B}", "Shadow Ban"],
              ["roomHijack", "\u{1F3E0}", "Room Hijack"],
              ["coinTracker", "\u{1F4B0}", "Coin Tracker"],
              ["massDM", "\u{1F4E8}", "Mass DM"],
              ["maintenance", "\u{1F6E0}\uFE0F", "Maintenance"],
              ["idTransfer", "\u{1F504}", "ID Transfer"],
              ["vipId", "\u{1F451}", "VIP ID Gen"],
              ["ghostMode", "\u{1F47B}", "Ghost Mode"],
              ["storeEditor", "\u{1F6CD}\uFE0F", "Store Editor"],
              ["levelBooster", "\u{1F4CA}", "Level Boost"],
              ["badgeTool", "\u{1F396}\uFE0F", "Badges"],
              ["antiScreenshot", "\u{1F6E1}\uFE0F", "Anti-SS"],
              ["vanishChat", "\u{1F4A8}", "Vanish Chat"],
              ["ipTracker", "\u{1F310}", "IP Tracker"],
            ] as const).map(([id, icon, label]) => (
              <button key={id} onClick={() => setGodTab(id)} style={{
                padding: "8px 14px", borderRadius: 12, cursor: "pointer",
                fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                minWidth: 68,
                background: godTab === id ? "rgba(0,255,255,0.15)" : "rgba(255,255,255,0.04)",
                color: godTab === id ? "#00ffff" : "rgba(255,255,255,0.4)",
                border: godTab === id ? "1px solid rgba(0,255,255,0.3)" : "1px solid rgba(255,255,255,0.06)",
                whiteSpace: "nowrap", transition: "all 0.2s",
              }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {(godTab === "deviceBan" || godTab === "shadowBan" || godTab === "coinTracker" || godTab === "levelBooster" || godTab === "badgeTool" || godTab === "idTransfer") && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input
                    type="text" value={godUserId}
                    onChange={e => { setGodUserId(e.target.value); setGodUser(null); }}
                    placeholder="Enter User ID..."
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 12,
                      border: "1px solid rgba(0,255,255,0.2)", background: "rgba(255,255,255,0.04)",
                      color: "#fff", fontSize: 13, fontFamily: "monospace", outline: "none",
                    }}
                  />
                  <button className="btn btn-sm" style={{
                    background: "rgba(0,255,255,0.12)", color: "#00ffff",
                    border: "1px solid rgba(0,255,255,0.3)", fontWeight: 700, padding: "8px 16px",
                  }} onClick={async () => {
                    if (!godUserId.trim()) return;
                    setGodLoading(true);
                    try {
                      const found = await getUserByUserId(godUserId.trim());
                      setGodUser(found);
                      if (found) {
                        setGodLevel(String(found.level || 1));
                        setGodXp(String(found.xp || 0));
                      } else showToast("User not found", "warning");
                    } catch { showToast("Lookup failed", "error"); }
                    setGodLoading(false);
                  }} disabled={godLoading}>
                    {godLoading ? "..." : "\u{1F50D}"}
                  </button>
                </div>
                {godUser && (
                  <div style={{
                    padding: 12, borderRadius: 14, marginBottom: 12,
                    background: "rgba(0,255,255,0.04)", border: "1px solid rgba(0,255,255,0.12)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 18, fontSize: 18,
                        background: "rgba(108,92,231,0.12)", border: "2px solid rgba(0,255,255,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                      }}>
                        {godUser.avatar?.startsWith("http")
                          ? <img src={godUser.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                          : godUser.avatar}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700 }}>{godUser.name}</p>
                        <p style={{ fontSize: 10, color: "rgba(162,155,254,0.5)", fontFamily: "monospace" }}>
                          ID: {godUser.userId} | Lv.{godUser.level || 1} | {"\u{1F48E}"}{(godUser.coins || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: (godUser.isBanned || godUser.deviceBanned || godUser.shadowBanned) ? 10 : 0 }}>
                      {godUser.isBanned && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 8, background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,60,60,0.3)", color: "#ff5555" }}>{"\u{1F534}"} BANNED</span>
                      )}
                      {godUser.deviceBanned && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 8, background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,60,60,0.3)", color: "#ff3333" }}>{"\u{1F4F1}"} DEVICE BANNED</span>
                      )}
                      {godUser.shadowBanned && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 8, background: "rgba(191,0,255,0.15)", border: "1px solid rgba(191,0,255,0.3)", color: "#bf00ff" }}>{"\u{1F47B}"} SHADOW BANNED</span>
                      )}
                      {!godUser.isBanned && !godUser.deviceBanned && !godUser.shadowBanned && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 8, background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.25)", color: "#00e676" }}>{"\u{1F7E2}"} ACTIVE</span>
                      )}
                    </div>

                    {(godUser.isBanned || godUser.deviceBanned || godUser.shadowBanned) && (
                      <button className="btn btn-full" style={{
                        padding: "13px 0", fontSize: 14, fontWeight: 800,
                        background: "rgba(0,230,118,0.15)",
                        border: "2px solid rgba(0,230,118,0.4)",
                        color: "#00e676",
                        borderRadius: 12,
                        cursor: "pointer",
                      }} onClick={async () => {
                        if (!confirm(`Remove ALL bans from ${godUser.name}? (ID ban, Device ban, Shadow ban — sab hata denge)`)) return;
                        setGodLoading(true);
                        try {
                          const { update: fbUpdate, ref: fbRef } = await import("firebase/database");
                          const { db: fbDb } = await import("../lib/firebase");
                          await fbUpdate(fbRef(fbDb, `users/${godUser.uid}`), {
                            isBanned: false,
                            banUntil: null,
                            bannedBy: null,
                            banReason: null,
                            deviceBanned: false,
                            shadowBanned: false,
                          });
                          showToast(`${godUser.name} — sab bans hata diye!`, "success");
                          setGodUser({ ...godUser, isBanned: false, banUntil: null, deviceBanned: false, shadowBanned: false });
                        } catch { showToast("Unban failed", "error"); }
                        setGodLoading(false);
                      }} disabled={godLoading}>
                        {"\u2705"} Remove All Bans
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {godTab === "deviceBan" && godUser && (
              <div className="card" style={{ padding: 16, border: "1px solid rgba(255,60,60,0.2)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#ff5555", marginBottom: 8 }}>{"\u{1F4F1}"} Device ID Ban</h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
                  Permanently ban this user's device. They cannot create new accounts on the same device.
                </p>

                {godUser.isBanned && (
                  <div style={{
                    padding: 10, borderRadius: 12, marginBottom: 12, textAlign: "center",
                    background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)",
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#ff5555" }}>{"\u{1F534}"} User is currently BANNED</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" style={{
                    flex: 1, padding: "12px 0",
                    background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,60,60,0.3)",
                    color: "#ff5555", fontWeight: 800,
                  }} onClick={async () => {
                    if (!confirm(`Device ban ${godUser.name}? This bans their device permanently.`)) return;
                    setGodLoading(true);
                    try {
                      await deviceBanUser(godUser.uid, user.uid);
                      showToast(`${godUser.name} device banned!`, "success");
                      setGodUser({ ...godUser, deviceBanned: true, isBanned: true });
                    } catch { showToast("Failed to device ban", "error"); }
                    setGodLoading(false);
                  }} disabled={godLoading || godUser.deviceBanned}>
                    {godUser.deviceBanned ? "\u{1F534} Already Device Banned" : "\u{1F6AB} Device Ban"}
                  </button>

                  {(godUser.deviceBanned || godUser.isBanned) && (
                    <button className="btn" style={{
                      flex: 1, padding: "12px 0",
                      background: "rgba(0,230,118,0.12)", border: "1px solid rgba(0,230,118,0.3)",
                      color: "#00e676", fontWeight: 800,
                    }} onClick={async () => {
                      if (!confirm(`Remove device ban and unban ${godUser.name}? They will be able to access the app again.`)) return;
                      setGodLoading(true);
                      try {
                        await unbanUser(godUser.uid, user.uid);
                        const { update: fbUpdate } = await import("firebase/database");
                        const { ref: fbRef } = await import("firebase/database");
                        const { db: fbDb } = await import("../lib/firebase");
                        await fbUpdate(fbRef(fbDb, `users/${godUser.uid}`), { deviceBanned: false });
                        showToast(`${godUser.name} fully unbanned!`, "success");
                        setGodUser({ ...godUser, deviceBanned: false, isBanned: false });
                      } catch { showToast("Failed to unban", "error"); }
                      setGodLoading(false);
                    }} disabled={godLoading}>
                      {"\u2705"} Remove Device Ban
                    </button>
                  )}
                </div>
              </div>
            )}

            {godTab === "shadowBan" && godUser && (
              <div className="card" style={{ padding: 16, border: `1px solid ${godUser.shadowBanned ? "rgba(0,230,118,0.2)" : "rgba(191,0,255,0.2)"}` }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#bf00ff", marginBottom: 8 }}>{"\u{1F47B}"} Shadow Ban</h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
                  User can still use the app but their messages are hidden from others. They won't know they're banned.
                </p>

                {godUser.shadowBanned && (
                  <div style={{
                    padding: 10, borderRadius: 12, marginBottom: 12, textAlign: "center",
                    background: "rgba(191,0,255,0.08)", border: "1px solid rgba(191,0,255,0.2)",
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#ff5555" }}>{"\u{1F534}"} User is SHADOW BANNED</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  {!godUser.shadowBanned && (
                    <button className="btn" style={{
                      flex: 1, padding: "12px 0",
                      background: "rgba(191,0,255,0.15)",
                      border: "1px solid rgba(191,0,255,0.3)",
                      color: "#bf00ff", fontWeight: 800,
                    }} onClick={async () => {
                      setGodLoading(true);
                      try {
                        await shadowBanUser(godUser.uid, user.uid);
                        showToast(`${godUser.name} shadow banned!`, "success");
                        setGodUser({ ...godUser, shadowBanned: true });
                      } catch { showToast("Failed", "error"); }
                      setGodLoading(false);
                    }} disabled={godLoading}>
                      {"\u{1F47B}"} Apply Shadow Ban
                    </button>
                  )}

                  {godUser.shadowBanned && (
                    <button className="btn" style={{
                      flex: 1, padding: "14px 0",
                      background: "rgba(0,230,118,0.15)",
                      border: "2px solid rgba(0,230,118,0.4)",
                      color: "#00e676", fontWeight: 800, fontSize: 14,
                    }} onClick={async () => {
                      setGodLoading(true);
                      try {
                        await removeShadowBan(godUser.uid, user.uid);
                        showToast(`Shadow ban removed from ${godUser.name}`, "success");
                        setGodUser({ ...godUser, shadowBanned: false });
                      } catch { showToast("Failed", "error"); }
                      setGodLoading(false);
                    }} disabled={godLoading}>
                      {"\u2705"} Lift Shadow Ban
                    </button>
                  )}
                </div>
              </div>
            )}

            {godTab === "roomHijack" && (
              <div className="card" style={{ padding: 16, border: "1px solid rgba(0,255,255,0.2)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#00ffff", marginBottom: 8 }}>{"\u{1F3E0}"} Room Hijack</h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", lineHeight: 1.6, marginBottom: 12 }}>
                  As Super Admin, you automatically bypass all room passwords and join as Owner with full control.
                  This is always active.
                </p>
                <div style={{
                  padding: 14, borderRadius: 14,
                  background: "rgba(0,255,255,0.06)", border: "1px solid rgba(0,255,255,0.15)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{"\u{1F6E1}\uFE0F"}</div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#00ffff" }}>ACTIVE</p>
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginTop: 4 }}>
                    Password bypass + Owner role in all rooms
                  </p>
                </div>
              </div>
            )}

            {godTab === "coinTracker" && godUser && (
              <div className="card" style={{ padding: 16, border: "1px solid rgba(255,215,0,0.2)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#FFD700", marginBottom: 8 }}>{"\u{1F4B0}"} Coin Tracker</h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
                  View user's transaction history and coin balance
                </p>
                <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.1)" }}>
                  <p style={{ fontSize: 18, fontWeight: 900, color: "#FFD700", marginBottom: 8 }}>
                    {"\u{1F48E}"} {(godUser.coins || 0).toLocaleString()} coins
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)" }}>
                    Level {godUser.level || 1} | XP: {godUser.xp || 0} | VIP: {godUser.vip ? "Yes" : "No"}
                  </p>
                  {godUser.transactions && (
                    <div style={{ marginTop: 12, maxHeight: 200, overflowY: "auto" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,215,0,0.6)", marginBottom: 6 }}>Recent Transactions</p>
                      {Object.values(godUser.transactions as Record<string, Transaction>).sort((a, b) => b.timestamp - a.timestamp).slice(0, 20).map((tx, i) => (
                        <div key={i} style={{
                          padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
                          display: "flex", justifyContent: "space-between", fontSize: 11,
                        }}>
                          <span style={{ color: "rgba(255,255,255,0.6)" }}>{tx.description || tx.type}</span>
                          <span style={{ color: tx.amount > 0 ? "#00e676" : "#ff5555", fontWeight: 700 }}>
                            {tx.amount > 0 ? "+" : ""}{tx.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {godTab === "massDM" && (
              <div className="card" style={{ padding: 16, border: "1px solid rgba(255,165,0,0.2)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#ffa500", marginBottom: 8 }}>{"\u{1F4E8}"} Mass DM</h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
                  Send a notification to ALL users
                </p>
                <textarea
                  value={godMassDM}
                  onChange={e => setGodMassDM(e.target.value)}
                  placeholder="Type your message to all users..."
                  maxLength={500}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 12,
                    border: "1px solid rgba(255,165,0,0.2)", background: "rgba(255,255,255,0.04)",
                    color: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none",
                    resize: "none", minHeight: 80, boxSizing: "border-box",
                  }}
                />
                <p style={{ fontSize: 10, color: "rgba(162,155,254,0.3)", textAlign: "right", marginTop: 4 }}>
                  {godMassDM.length}/500
                </p>
                <button className="btn btn-full" style={{
                  marginTop: 8, padding: "12px 0",
                  background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.3)",
                  color: "#ffa500", fontWeight: 800,
                }} onClick={async () => {
                  if (!godMassDM.trim()) return;
                  if (!confirm(`Send this message to ALL users?`)) return;
                  setGodLoading(true);
                  try {
                    const count = await sendMassDM(user.uid, user.name, godMassDM.trim());
                    showToast(`Mass DM sent to ${count} users!`, "success");
                    setGodMassDM("");
                  } catch { showToast("Failed to send", "error"); }
                  setGodLoading(false);
                }} disabled={godLoading || !godMassDM.trim()}>
                  {godLoading ? "Sending..." : "\u{1F4E8} Send to All Users"}
                </button>
              </div>
            )}

            {godTab === "maintenance" && (
              <div className="card" style={{ padding: 16, border: "1px solid rgba(255,100,100,0.2)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#ff6464", marginBottom: 8 }}>{"\u{1F6E0}\uFE0F"} Server Maintenance</h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
                  Toggle maintenance mode. Non-admin users will see a maintenance screen.
                </p>
                <input
                  type="text" value={godMaintMsg}
                  onChange={e => setGodMaintMsg(e.target.value)}
                  placeholder="Maintenance message (optional)..."
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 12, marginBottom: 12,
                    border: "1px solid rgba(255,100,100,0.2)", background: "rgba(255,255,255,0.04)",
                    color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" style={{
                    flex: 1, padding: "12px 0",
                    background: "rgba(255,60,60,0.15)", border: "1px solid rgba(255,60,60,0.3)",
                    color: "#ff5555", fontWeight: 800,
                  }} onClick={async () => {
                    setGodLoading(true);
                    try {
                      await setMaintenanceMode(true, godMaintMsg || undefined);
                      setGodMaintOn(true);
                      showToast("Maintenance mode ON", "success");
                    } catch { showToast("Failed", "error"); }
                    setGodLoading(false);
                  }} disabled={godLoading}>
                    {"\u{1F6D1}"} Enable
                  </button>
                  <button className="btn" style={{
                    flex: 1, padding: "12px 0",
                    background: "rgba(0,230,118,0.12)", border: "1px solid rgba(0,230,118,0.3)",
                    color: "#00e676", fontWeight: 800,
                  }} onClick={async () => {
                    setGodLoading(true);
                    try {
                      await setMaintenanceMode(false);
                      setGodMaintOn(false);
                      showToast("Maintenance mode OFF", "success");
                    } catch { showToast("Failed", "error"); }
                    setGodLoading(false);
                  }} disabled={godLoading}>
                    {"\u2705"} Disable
                  </button>
                </div>
              </div>
            )}

            {godTab === "idTransfer" && godUser && (
              <div className="card" style={{ padding: 16, border: "1px solid rgba(0,200,255,0.2)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#00c8ff", marginBottom: 8 }}>{"\u{1F504}"} ID Transfer</h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
                  Transfer coins, inventory, level & items from this user to another
                </p>
                <input
                  type="text" value={godTransferTo}
                  onChange={e => setGodTransferTo(e.target.value)}
                  placeholder="Target User ID to transfer TO..."
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 12, marginBottom: 12,
                    border: "1px solid rgba(0,200,255,0.2)", background: "rgba(255,255,255,0.04)",
                    color: "#fff", fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box",
                  }}
                />
                <button className="btn btn-full" style={{
                  padding: "12px 0",
                  background: "rgba(0,200,255,0.15)", border: "1px solid rgba(0,200,255,0.3)",
                  color: "#00c8ff", fontWeight: 800,
                }} onClick={async () => {
                  if (!godTransferTo.trim()) return;
                  const target = await getUserByUserId(godTransferTo.trim());
                  if (!target) { showToast("Target user not found", "warning"); return; }
                  if (!confirm(`Transfer all data from ${godUser.name} to ${target.name}?`)) return;
                  setGodLoading(true);
                  try {
                    await transferAccountData(godUser.uid, target.uid);
                    showToast(`Transfer complete: ${godUser.name} -> ${target.name}`, "success");
                  } catch { showToast("Transfer failed", "error"); }
                  setGodLoading(false);
                }} disabled={godLoading || !godTransferTo.trim()}>
                  {godLoading ? "Transferring..." : "\u{1F504} Transfer Data"}
                </button>
              </div>
            )}

            {godTab === "vipId" && (
              <div className="card" style={{ padding: 16, border: "1px solid rgba(255,215,0,0.2)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#FFD700", marginBottom: 8 }}>{"\u{1F451}"} VIP ID Generator</h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
                  Assign a custom VIP user ID (e.g. "1", "007", "VIP") to a user
                </p>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input type="text" value={godUserId} onChange={e => { setGodUserId(e.target.value); setGodUser(null); }}
                      placeholder="Current User ID..." style={{
                        flex: 1, padding: "10px 14px", borderRadius: 12,
                        border: "1px solid rgba(255,215,0,0.2)", background: "rgba(255,255,255,0.04)",
                        color: "#fff", fontSize: 13, fontFamily: "monospace", outline: "none",
                      }}
                    />
                    <button className="btn btn-sm" style={{
                      background: "rgba(255,215,0,0.12)", color: "#FFD700",
                      border: "1px solid rgba(255,215,0,0.3)", fontWeight: 700, padding: "8px 16px",
                    }} onClick={async () => {
                      if (!godUserId.trim()) return;
                      setGodLoading(true);
                      const found = await getUserByUserId(godUserId.trim());
                      setGodUser(found);
                      if (!found) showToast("User not found", "warning");
                      setGodLoading(false);
                    }} disabled={godLoading}>{godLoading ? "..." : "\u{1F50D}"}</button>
                  </div>
                  {godUser && <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 8 }}>Found: {godUser.name} (current ID: {godUser.userId})</p>}
                </div>
                <input
                  type="text" value={godVipId}
                  onChange={e => setGodVipId(e.target.value)}
                  placeholder="New VIP ID (e.g. 007, VIP, 1)..."
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 12, marginBottom: 12,
                    border: "1px solid rgba(255,215,0,0.2)", background: "rgba(255,255,255,0.04)",
                    color: "#fff", fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box",
                  }}
                />
                <button className="btn btn-full" style={{
                  padding: "12px 0", background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.08))",
                  border: "1px solid rgba(255,215,0,0.4)", color: "#FFD700", fontWeight: 800,
                }} onClick={async () => {
                  if (!godUser || !godVipId.trim()) return;
                  if (!confirm(`Assign VIP ID "${godVipId.trim()}" to ${godUser.name}?`)) return;
                  setGodLoading(true);
                  try {
                    const ok = await createVipUserId(godVipId.trim(), godUser.uid);
                    if (ok) showToast(`VIP ID "${godVipId.trim()}" assigned!`, "success");
                    else showToast("ID already taken", "warning");
                  } catch { showToast("Failed", "error"); }
                  setGodLoading(false);
                }} disabled={godLoading || !godUser || !godVipId.trim()}>
                  {godLoading ? "Assigning..." : "\u{1F451} Assign VIP ID"}
                </button>
              </div>
            )}

            {godTab === "ghostMode" && (
              <div className="card" style={{ padding: 16, border: "1px solid rgba(150,100,255,0.2)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#9664ff", marginBottom: 8 }}>{"\u{1F47B}"} Ghost Mode</h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", lineHeight: 1.6, marginBottom: 12 }}>
                  When enabled, you appear invisible in rooms. Your seat shows empty but you can still listen and speak.
                </p>
                <button className="btn btn-full" style={{
                  padding: "14px 0",
                  background: user.ghostMode ? "rgba(0,230,118,0.12)" : "rgba(150,100,255,0.15)",
                  border: user.ghostMode ? "1px solid rgba(0,230,118,0.3)" : "1px solid rgba(150,100,255,0.3)",
                  color: user.ghostMode ? "#00e676" : "#9664ff", fontWeight: 800,
                }} onClick={async () => {
                  setGodLoading(true);
                  try {
                    await updateUser(user.uid, { ghostMode: !user.ghostMode } as any);
                    onUpdate({ ...user, ghostMode: !user.ghostMode });
                    showToast(user.ghostMode ? "Ghost Mode OFF" : "Ghost Mode ON", "success");
                  } catch { showToast("Failed", "error"); }
                  setGodLoading(false);
                }} disabled={godLoading}>
                  {user.ghostMode ? "\u{1F440} Become Visible" : "\u{1F47B} Go Ghost"}
                </button>
              </div>
            )}

            {godTab === "storeEditor" && (
              <div className="card" style={{ padding: 16, border: "1px solid rgba(0,255,200,0.2)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#00ffc8", marginBottom: 8 }}>{"\u{1F6CD}\uFE0F"} Live Store Editor</h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
                  Override store item prices or disable items in real-time
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <select value={godStoreItemId} onChange={e => setGodStoreItemId(e.target.value)}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 12,
                      border: "1px solid rgba(0,255,200,0.2)", background: "rgba(15,10,30,0.9)",
                      color: "#fff", fontSize: 13, outline: "none",
                    }}>
                    <option value="">Select item...</option>
                    {STORE_ITEMS.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({"\u{1F48E}"}{item.price})</option>
                    ))}
                  </select>
                </div>
                {godStoreItemId && (
                  <>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "rgba(162,155,254,0.5)" }}>New Price:</span>
                      <input type="number" value={godStorePrice} onChange={e => setGodStorePrice(e.target.value)}
                        placeholder="New price..." style={{
                          flex: 1, padding: "10px 14px", borderRadius: 12,
                          border: "1px solid rgba(0,255,200,0.2)", background: "rgba(255,255,255,0.04)",
                          color: "#fff", fontSize: 13, fontWeight: 700, outline: "none",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn" style={{
                        flex: 1, padding: "10px 0",
                        background: "rgba(0,255,200,0.12)", border: "1px solid rgba(0,255,200,0.3)",
                        color: "#00ffc8", fontWeight: 800, fontSize: 12,
                      }} onClick={async () => {
                        const price = parseInt(godStorePrice);
                        if (isNaN(price) || price < 0) { showToast("Invalid price", "warning"); return; }
                        setGodLoading(true);
                        try {
                          const current = await getStoreOverrides();
                          current[godStoreItemId] = { ...current[godStoreItemId], price };
                          await setStoreOverrides(current);
                          showToast(`Price updated to ${price}`, "success");
                        } catch { showToast("Failed", "error"); }
                        setGodLoading(false);
                      }} disabled={godLoading}>
                        {"\u2714"} Set Price
                      </button>
                      <button className="btn" style={{
                        padding: "10px 16px",
                        background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)",
                        color: "#ff5555", fontWeight: 800, fontSize: 12,
                      }} onClick={async () => {
                        setGodLoading(true);
                        try {
                          const current = await getStoreOverrides();
                          current[godStoreItemId] = { ...current[godStoreItemId], disabled: true };
                          await setStoreOverrides(current);
                          showToast("Item disabled!", "success");
                        } catch { showToast("Failed", "error"); }
                        setGodLoading(false);
                      }} disabled={godLoading}>
                        {"\u{1F6AB}"} Disable
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {godTab === "levelBooster" && godUser && (
              <div className="card" style={{ padding: 16, border: "1px solid rgba(100,200,255,0.2)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#64c8ff", marginBottom: 8 }}>{"\u{1F4CA}"} Level Booster</h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
                  Set user's level and XP directly
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: "rgba(162,155,254,0.4)", marginBottom: 4, display: "block" }}>Level</label>
                    <input type="number" value={godLevel} onChange={e => setGodLevel(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 12,
                        border: "1px solid rgba(100,200,255,0.2)", background: "rgba(255,255,255,0.04)",
                        color: "#fff", fontSize: 14, fontWeight: 700, outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: "rgba(162,155,254,0.4)", marginBottom: 4, display: "block" }}>XP</label>
                    <input type="number" value={godXp} onChange={e => setGodXp(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 12,
                        border: "1px solid rgba(100,200,255,0.2)", background: "rgba(255,255,255,0.04)",
                        color: "#fff", fontSize: 14, fontWeight: 700, outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
                <button className="btn btn-full" style={{
                  padding: "12px 0",
                  background: "rgba(100,200,255,0.15)", border: "1px solid rgba(100,200,255,0.3)",
                  color: "#64c8ff", fontWeight: 800,
                }} onClick={async () => {
                  const lv = parseInt(godLevel); const xp = parseInt(godXp);
                  if (isNaN(lv) || lv < 1 || isNaN(xp) || xp < 0) { showToast("Invalid values", "warning"); return; }
                  if (!confirm(`Set ${godUser.name} to Level ${lv}, XP ${xp}?`)) return;
                  setGodLoading(true);
                  try {
                    await setUserLevelXP(godUser.uid, lv, xp);
                    showToast(`Level set to ${lv}!`, "success");
                    setGodUser({ ...godUser, level: lv, xp });
                  } catch { showToast("Failed", "error"); }
                  setGodLoading(false);
                }} disabled={godLoading}>
                  {godLoading ? "Setting..." : "\u{1F4CA} Set Level & XP"}
                </button>
              </div>
            )}

            {godTab === "badgeTool" && godUser && (
              <div className="card" style={{ padding: 16, border: "1px solid rgba(255,150,0,0.2)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#ff9600", marginBottom: 8 }}>{"\u{1F396}\uFE0F"} Custom Badge Tool</h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
                  Add or remove custom badges for this user
                </p>
                {godUser.customBadges && Object.keys(godUser.customBadges).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,150,0,0.6)", marginBottom: 6 }}>Current Badges:</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {Object.values(godUser.customBadges).map(b => (
                        <div key={b.id} style={{
                          display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
                          borderRadius: 8, background: "rgba(255,150,0,0.08)", border: "1px solid rgba(255,150,0,0.15)",
                        }}>
                          <span style={{ fontSize: 14 }}>{b.icon}</span>
                          <span style={{ fontSize: 11, color: "#ff9600" }}>{b.name}</span>
                          <button onClick={async () => {
                            await removeCustomBadge(godUser.uid, b.id);
                            const updated = { ...godUser };
                            delete updated.customBadges?.[b.id];
                            setGodUser(updated);
                            showToast("Badge removed", "info");
                          }} style={{
                            background: "none", border: "none", cursor: "pointer", color: "#ff5555",
                            fontSize: 12, padding: 0, marginLeft: 4,
                          }}>{"\u2715"}</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input type="text" value={godBadgeIcon} onChange={e => setGodBadgeIcon(e.target.value)}
                    placeholder="Emoji..." maxLength={4}
                    style={{
                      width: 60, padding: "10px", borderRadius: 12, textAlign: "center",
                      border: "1px solid rgba(255,150,0,0.2)", background: "rgba(255,255,255,0.04)",
                      color: "#fff", fontSize: 18, outline: "none",
                    }}
                  />
                  <input type="text" value={godBadgeName} onChange={e => setGodBadgeName(e.target.value)}
                    placeholder="Badge name..."
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 12,
                      border: "1px solid rgba(255,150,0,0.2)", background: "rgba(255,255,255,0.04)",
                      color: "#fff", fontSize: 13, outline: "none",
                    }}
                  />
                </div>
                <button className="btn btn-full" style={{
                  padding: "12px 0",
                  background: "rgba(255,150,0,0.15)", border: "1px solid rgba(255,150,0,0.3)",
                  color: "#ff9600", fontWeight: 800,
                }} onClick={async () => {
                  if (!godBadgeName.trim() || !godBadgeIcon.trim()) return;
                  setGodLoading(true);
                  try {
                    const id = `badge_${Date.now()}`;
                    await addCustomBadge(godUser.uid, { id, name: godBadgeName.trim(), icon: godBadgeIcon.trim() });
                    const newBadges = { ...(godUser.customBadges || {}), [id]: { id, name: godBadgeName.trim(), icon: godBadgeIcon.trim() } };
                    setGodUser({ ...godUser, customBadges: newBadges });
                    showToast("Badge added!", "success");
                    setGodBadgeName(""); setGodBadgeIcon("");
                  } catch { showToast("Failed", "error"); }
                  setGodLoading(false);
                }} disabled={godLoading || !godBadgeName.trim() || !godBadgeIcon.trim()}>
                  {godLoading ? "Adding..." : "\u{1F396}\uFE0F Add Badge"}
                </button>
              </div>
            )}

            {godTab === "antiScreenshot" && (
              <div className="card" style={{ padding: 16, border: "1px solid rgba(255,100,100,0.2)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#ff6464", marginBottom: 8 }}>{"\u{1F6E1}\uFE0F"} Anti-Screenshot</h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", lineHeight: 1.6, marginBottom: 12 }}>
                  This feature adds a CSS overlay that makes screenshots harder by applying a visual watermark pattern over the entire app. Toggle below to enable/disable.
                </p>
                <button className="btn btn-full" style={{
                  padding: "14px 0",
                  background: "rgba(255,100,100,0.12)", border: "1px solid rgba(255,100,100,0.3)",
                  color: "#ff6464", fontWeight: 800,
                }} onClick={() => {
                  const el = document.getElementById("anti-ss-overlay");
                  if (el) { el.remove(); showToast("Anti-Screenshot OFF", "info"); }
                  else {
                    const overlay = document.createElement("div");
                    overlay.id = "anti-ss-overlay";
                    overlay.style.cssText = "position:fixed;inset:0;z-index:99999;pointer-events:none;background:repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(191,0,255,0.03) 10px,rgba(191,0,255,0.03) 20px);";
                    document.body.appendChild(overlay);
                    showToast("Anti-Screenshot ON", "success");
                  }
                }}>
                  {"\u{1F6E1}\uFE0F"} Toggle Anti-Screenshot
                </button>
              </div>
            )}

            {godTab === "vanishChat" && (
              <div className="card" style={{ padding: 16, border: "1px solid rgba(200,100,255,0.2)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#c864ff", marginBottom: 8 }}>{"\u{1F4A8}"} Vanish Chat</h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", lineHeight: 1.6, marginBottom: 12 }}>
                  Clear all messages in a specific room. Enter Room ID to wipe the chat history.
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input type="text" value={godUserId} onChange={e => setGodUserId(e.target.value)}
                    placeholder="Enter Room ID..."
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 12,
                      border: "1px solid rgba(200,100,255,0.2)", background: "rgba(255,255,255,0.04)",
                      color: "#fff", fontSize: 13, fontFamily: "monospace", outline: "none",
                    }}
                  />
                </div>
                <button className="btn btn-full" style={{
                  padding: "12px 0",
                  background: "rgba(200,100,255,0.15)", border: "1px solid rgba(200,100,255,0.3)",
                  color: "#c864ff", fontWeight: 800,
                }} onClick={async () => {
                  if (!godUserId.trim()) return;
                  if (!confirm(`Clear ALL chat messages in room ${godUserId.trim()}?`)) return;
                  setGodLoading(true);
                  try {
                    const { clearRoomChat } = await import("../lib/roomService");
                    await clearRoomChat(godUserId.trim());
                    showToast("Room chat cleared!", "success");
                  } catch { showToast("Failed to clear chat", "error"); }
                  setGodLoading(false);
                }} disabled={godLoading || !godUserId.trim()}>
                  {godLoading ? "Clearing..." : "\u{1F4A8} Vanish All Messages"}
                </button>
              </div>
            )}

            {godTab === "ipTracker" && (
              <div className="card" style={{ padding: 16, border: "1px solid rgba(100,200,150,0.2)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#64c896", marginBottom: 8 }}>{"\u{1F310}"} IP Tracker</h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", lineHeight: 1.6, marginBottom: 12 }}>
                  View device and connection info for users. This data is collected when users log in.
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input type="text" value={godUserId} onChange={e => { setGodUserId(e.target.value); setGodUser(null); }}
                    placeholder="Enter User ID..."
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 12,
                      border: "1px solid rgba(100,200,150,0.2)", background: "rgba(255,255,255,0.04)",
                      color: "#fff", fontSize: 13, fontFamily: "monospace", outline: "none",
                    }}
                  />
                  <button className="btn btn-sm" style={{
                    background: "rgba(100,200,150,0.12)", color: "#64c896",
                    border: "1px solid rgba(100,200,150,0.3)", fontWeight: 700, padding: "8px 16px",
                  }} onClick={async () => {
                    if (!godUserId.trim()) return;
                    setGodLoading(true);
                    const found = await getUserByUserId(godUserId.trim());
                    setGodUser(found);
                    if (!found) showToast("User not found", "warning");
                    setGodLoading(false);
                  }} disabled={godLoading}>{godLoading ? "..." : "\u{1F50D}"}</button>
                </div>
                {godUser && (
                  <div style={{ padding: 12, borderRadius: 12, background: "rgba(100,200,150,0.04)", border: "1px solid rgba(100,200,150,0.1)" }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div><span style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>Device ID:</span><p style={{ fontSize: 12, fontFamily: "monospace", color: "#64c896" }}>{godUser.deviceId || "Not recorded"}</p></div>
                      <div><span style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>User Agent:</span><p style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.6)", wordBreak: "break-all" }}>{(godUser as any).userAgent || "Not recorded"}</p></div>
                      <div><span style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>Last Login:</span><p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{(godUser as any).lastLoginAt ? new Date((godUser as any).lastLoginAt).toLocaleString() : "Unknown"}</p></div>
                      <div><span style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>Account Created:</span><p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{godUser.createdAt ? new Date(godUser.createdAt).toLocaleString() : "Unknown"}</p></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showStore && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1100, background: "#0F0F1A",
          display: "flex", flexDirection: "column", maxWidth: 430, margin: "0 auto",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => setShowStore(false)} style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", cursor: "pointer", fontSize: 16, color: "#fff" }}>{"\u2039"}</button>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F6CD}\uFE0F"} Store</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,215,0,0.1)", padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(255,215,0,0.2)" }}>
              <span style={{ fontSize: 14 }}>{"\u{1F48E}"}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#FFD700" }}>{user.coins.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 0, padding: "0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {([["frame", "\u{1F5BC}\uFE0F", "Frames"], ["entry", "\u26A1", "Entry FX"], ["theme", "\u{1F3A8}", "Themes"]] as const).map(([cat, ico, label]) => (
              <button key={cat} onClick={() => setStoreCategory(cat)} style={{
                flex: 1, padding: "14px 0", border: "none", cursor: "pointer", fontFamily: "inherit",
                background: storeCategory === cat ? "rgba(108,92,231,0.15)" : "transparent",
                borderBottom: storeCategory === cat ? "2px solid #6C5CE7" : "2px solid transparent",
                color: storeCategory === cat ? "#A29BFE" : "rgba(162,155,254,0.45)",
                fontSize: 13, fontWeight: 700, transition: "all 0.2s",
              }}>{ico} {label}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {STORE_ITEMS.filter(i => i.category === storeCategory).map(item => {
              const owned = !!(user.inventory && user.inventory[item.id]);
              const equipped = user.inventory?.[item.id]?.equipped;
              const rc = getRarityColor(item.rarity);
              return (
                <div key={item.id} style={{
                  borderRadius: 16, overflow: "hidden",
                  border: `1px solid ${rc}30`,
                  background: "rgba(255,255,255,0.03)",
                  display: "flex", flexDirection: "column",
                }}>
                  <div style={{
                    height: 90, background: isAnimatedFrame(item.id) ? "rgba(15,10,30,0.9)" : item.preview,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 40, position: "relative",
                  }}>
                    {item.category === "frame" && isAnimatedFrame(item.id) && (
                      <FramePreview frameId={item.id} size={50} />
                    )}
                    {item.category === "frame" && !isAnimatedFrame(item.id) && (() => {
                      const pngPath = getPngFramePath(item.id);
                      return pngPath ? (
                        <div style={{ position: "relative", width: 60, height: 60 }}>
                          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(108,92,231,0.3)", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
                          <img src={pngPath} alt="" style={{ position: "absolute", inset: -4, width: "calc(100% + 8px)", height: "calc(100% + 8px)", objectFit: "contain", pointerEvents: "none" }} />
                        </div>
                      ) : null;
                    })()}
                    {item.category !== "frame" && item.icon}
                    <span style={{
                      position: "absolute", top: 6, right: 6, fontSize: 9, fontWeight: 800,
                      padding: "2px 8px", borderRadius: 8,
                      background: `${rc}20`, color: rc, border: `1px solid ${rc}40`,
                      textTransform: "uppercase",
                    }}>{item.rarity}</span>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <p style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, color: "#fff" }}>{item.name}</p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {owned ? (
                        equipped ? (
                          <span style={{ fontSize: 11, color: "#00e676", fontWeight: 700 }}>{"\u2705"} Equipped</span>
                        ) : (
                          <span style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 600 }}>Owned</span>
                        )
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#FFD700" }}>{"\u{1F48E}"} {item.price}</span>
                      )}
                      {!owned && (
                        <button onClick={() => handlePurchase(item)} disabled={storeLoading === item.id || user.coins < item.price}
                          style={{
                            padding: "6px 14px", borderRadius: 10, border: "none", cursor: user.coins < item.price ? "not-allowed" : "pointer",
                            background: user.coins < item.price ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #6C5CE7, #8B7CF6)",
                            color: "#fff", fontSize: 11, fontWeight: 800, fontFamily: "inherit",
                            opacity: user.coins < item.price ? 0.5 : 1,
                          }}>
                          {storeLoading === item.id ? "..." : "Buy"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showBackpack && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1100, background: "#0F0F1A",
          display: "flex", flexDirection: "column", maxWidth: 430, margin: "0 auto",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => setShowBackpack(false)} style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", cursor: "pointer", fontSize: 16, color: "#fff" }}>{"\u2039"}</button>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F392}"} Backpack</h2>
            <div style={{ width: 36 }} />
          </div>

          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {([["frame", "\u{1F5BC}\uFE0F", "Frames"], ["entry", "\u26A1", "Entry FX"], ["theme", "\u{1F3A8}", "Themes"]] as const).map(([cat, ico, label]) => (
              <button key={cat} onClick={() => setBackpackCategory(cat)} style={{
                flex: 1, padding: "14px 0", border: "none", cursor: "pointer", fontFamily: "inherit",
                background: backpackCategory === cat ? "rgba(108,92,231,0.15)" : "transparent",
                borderBottom: backpackCategory === cat ? "2px solid #6C5CE7" : "2px solid transparent",
                color: backpackCategory === cat ? "#A29BFE" : "rgba(162,155,254,0.45)",
                fontSize: 13, fontWeight: 700, transition: "all 0.2s",
              }}>{ico} {label}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
            {(() => {
              const inv = user.inventory || {};
              const categoryItems = Object.values(inv).filter(o => {
                const si = getStoreItem(o.itemId);
                return si && si.category === backpackCategory;
              });
              if (categoryItems.length === 0) {
                return (
                  <div style={{ textAlign: "center", padding: "60px 20px" }}>
                    <span style={{ fontSize: 48, opacity: 0.3 }}>{"\u{1F4E6}"}</span>
                    <p style={{ fontSize: 14, color: "rgba(162,155,254,0.4)", marginTop: 12 }}>No items yet</p>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setShowBackpack(false); setShowStore(true); setStoreCategory(backpackCategory); }}>
                      Visit Store
                    </button>
                  </div>
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {categoryItems.map(owned => {
                    const item = getStoreItem(owned.itemId);
                    if (!item) return null;
                    const rc = getRarityColor(item.rarity);
                    return (
                      <div key={owned.itemId} style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                        borderRadius: 16,
                        background: owned.equipped ? "rgba(108,92,231,0.1)" : "rgba(255,255,255,0.03)",
                        border: owned.equipped ? `1.5px solid ${rc}50` : "1px solid rgba(255,255,255,0.06)",
                      }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: isAnimatedFrame(item.id) ? "50%" : 14,
                          background: isAnimatedFrame(item.id) ? "transparent" : item.preview,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
                          border: isAnimatedFrame(item.id) ? "none" : `2px solid ${rc}40`,
                          boxShadow: owned.equipped && !isAnimatedFrame(item.id) ? `0 0 16px ${rc}30` : "none",
                          position: "relative", overflow: "visible",
                        }}>
                          {isAnimatedFrame(item.id) ? (
                            <FramePreview frameId={item.id} size={38} />
                          ) : isPngFrame(item.id) ? (() => {
                            const pp = getPngFramePath(item.id);
                            return pp ? <img src={pp} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : item.icon;
                          })() : item.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{item.name}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                            <span style={{ fontSize: 10, color: rc, fontWeight: 700, textTransform: "uppercase" }}>{item.rarity}</span>
                            {owned.equipped && <span style={{ fontSize: 10, color: "#00e676", fontWeight: 700 }}>{"\u2022"} Active</span>}
                          </div>
                        </div>
                        {owned.equipped ? (
                          <button onClick={() => handleUnequip(owned.itemId)} disabled={storeLoading === owned.itemId}
                            style={{
                              padding: "8px 16px", borderRadius: 12, border: "1px solid rgba(255,100,130,0.3)", cursor: "pointer",
                              background: "rgba(255,100,130,0.1)", color: "#ff6482", fontSize: 12, fontWeight: 800, fontFamily: "inherit",
                            }}>
                            {storeLoading === owned.itemId ? "..." : "Remove"}
                          </button>
                        ) : (
                          <button onClick={() => handleEquip(owned.itemId)} disabled={storeLoading === owned.itemId}
                            style={{
                              padding: "8px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                              background: "linear-gradient(135deg, #6C5CE7, #8B7CF6)", color: "#fff",
                              fontSize: 12, fontWeight: 800, fontFamily: "inherit",
                              boxShadow: "0 0 12px rgba(108,92,231,0.3)",
                            }}>
                            {storeLoading === owned.itemId ? "..." : (isAnimatedFrame(owned.itemId) ? "Apply" : "Equip")}
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

      {showOfficialRules && (
        <BottomSheet onClose={() => setShowOfficialRules(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#00ffff" }}>{"\u{1F4DC}"} Official Guidelines</h2>
            <button onClick={() => setShowOfficialRules(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <img src={`${import.meta.env.BASE_URL}assets/official/official_tag.svg`} alt="Official" style={{ height: 28, filter: "drop-shadow(0 0 8px rgba(0,206,201,0.5)) drop-shadow(0 0 14px rgba(9,132,227,0.3))" }} />
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", marginTop: 8 }}>As an Official, you represent the app</p>
            </div>
            {[
              { icon: "\u{1F91D}", rule: "Be respectful to all users.", color: "#00e676" },
              { icon: "\u26A0\uFE0F", rule: "Do not abuse Kick/Mute powers.", color: "#ff9800" },
              { icon: "\u2696\uFE0F", rule: "Solve conflicts neutrally.", color: "#00bcd4" },
              { icon: "\u{1F4E2}", rule: "Report severe violations to Super Admin.", color: "#ff5252" },
              { icon: "\u{1F451}", rule: "Your frame and tag represent the app's reputation.", color: "#FFD700" },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", marginBottom: 8,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${item.color}08, ${item.color}04)`,
                border: `1px solid ${item.color}25`,
              }}>
                <span style={{ fontSize: 20, flexShrink: 0, filter: `drop-shadow(0 0 4px ${item.color}60)` }}>{item.icon}</span>
                <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, letterSpacing: 0.2 }}>
                  {item.rule}
                </p>
              </div>
            ))}
            <div style={{
              marginTop: 16, padding: "14px 16px", borderRadius: 14, textAlign: "center",
              background: "rgba(0,255,255,0.04)", border: "1px solid rgba(0,255,255,0.12)",
            }}>
              <p style={{ fontSize: 11, color: "rgba(0,255,255,0.6)", fontWeight: 700, lineHeight: 1.6 }}>
                Violation of these rules may result in removal of Official status.
                Always act with integrity and fairness.
              </p>
            </div>
          </div>
        </BottomSheet>
      )}

      {showFamily && (
        <BottomSheet onClose={() => { setShowFamily(false); setShowCreateFamily(false); }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, textAlign: "center", marginBottom: 16 }}>👪 Family</h3>
          {myFamily ? (
            <div>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 40 }}>{myFamily.icon}</span>
                <h4 style={{ fontSize: 16, fontWeight: 800, marginTop: 8 }}>{myFamily.name}</h4>
                <p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)" }}>Level {myFamily.level} • {myFamily.memberCount}/{myFamily.maxMembers} members</p>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", marginTop: 4 }}>{myFamily.description}</p>
              </div>
              {myFamily.announcement && (
                <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(108,92,231,0.08)", border: "1px solid rgba(108,92,231,0.15)", marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: "rgba(162,155,254,0.7)" }}>📢 {myFamily.announcement}</p>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <div style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.15)" }}>
                  <p style={{ fontSize: 16, fontWeight: 900, color: "#FFD700" }}>{myFamily.totalGifts.toLocaleString()}</p>
                  <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>Total Gifts</p>
                </div>
                <div style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 12, background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.15)" }}>
                  <p style={{ fontSize: 16, fontWeight: 900, color: "#A29BFE" }}>{myFamily.weeklyGifts.toLocaleString()}</p>
                  <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>This Week</p>
                </div>
              </div>
              <h5 style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: "rgba(255,255,255,0.7)" }}>Members</h5>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {Object.values(myFamily.members || {}).sort((a: any, b: any) => {
                  const order: Record<string, number> = { leader: 0, elder: 1, member: 2 };
                  return (order[a.role] || 2) - (order[b.role] || 2);
                }).map((m: any) => (
                  <div key={m.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, background: "rgba(108,92,231,0.12)" }}>
                      {m.avatar?.length <= 2 ? m.avatar : "👤"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</p>
                      <p style={{ fontSize: 10, color: m.role === "leader" ? "#FFD700" : m.role === "elder" ? "#A29BFE" : "rgba(162,155,254,0.4)" }}>
                        {m.role === "leader" ? "👑 Leader" : m.role === "elder" ? "⭐ Elder" : "Member"} • {m.contribution.toLocaleString()} coins
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {myFamily.leaderId !== user.uid && (
                <button className="btn btn-danger btn-full" style={{ marginTop: 16, fontSize: 13 }}
                  onClick={async () => {
                    try {
                      await leaveFamily(myFamily.id, user.uid);
                      setMyFamily(null);
                      showToast("Left family", "info");
                    } catch (e: any) { showToast(e.message, "error"); }
                  }}>Leave Family</button>
              )}
            </div>
          ) : showCreateFamily ? (
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, justifyContent: "center" }}>
                {getFamilyIcons().map(icon => (
                  <button key={icon} onClick={() => setNewFamilyIcon(icon)} style={{
                    fontSize: 24, width: 44, height: 44, borderRadius: 12, border: newFamilyIcon === icon ? "2px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                    background: newFamilyIcon === icon ? "rgba(108,92,231,0.15)" : "rgba(255,255,255,0.03)", cursor: "pointer",
                  }}>{icon}</button>
                ))}
              </div>
              <input className="input-field" placeholder="Family Name" value={newFamilyName} onChange={e => setNewFamilyName(e.target.value)} style={{ marginBottom: 8 }} />
              <textarea className="input-field" placeholder="Description (optional)" value={newFamilyDesc} onChange={e => setNewFamilyDesc(e.target.value)} rows={2} style={{ marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost btn-full" onClick={() => setShowCreateFamily(false)}>Cancel</button>
                <button className="btn btn-primary btn-full" disabled={!newFamilyName.trim()}
                  onClick={async () => {
                    try {
                      setFamilyLoading(true);
                      await createFamily(user.uid, user.name, user.avatar, newFamilyName.trim(), newFamilyIcon, newFamilyDesc.trim());
                      const f = await getUserFamily(user.uid);
                      setMyFamily(f);
                      setShowCreateFamily(false);
                      showToast("Family created!", "success");
                    } catch (e: any) { showToast(e.message, "error"); }
                    setFamilyLoading(false);
                  }}>Create</button>
              </div>
            </div>
          ) : (
            <div>
              <button className="btn btn-primary btn-full" style={{ marginBottom: 16 }} onClick={() => setShowCreateFamily(true)}>
                ✨ Create Family
              </button>
              <h5 style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: "rgba(255,255,255,0.6)" }}>Top Families</h5>
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {allFamilies.slice(0, 20).map((f, i) => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: i < 3 ? "#FFD700" : "rgba(162,155,254,0.4)", width: 20 }}>#{i + 1}</span>
                    <span style={{ fontSize: 22 }}>{f.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{f.name}</p>
                      <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>Lv.{f.level} • {f.memberCount} members • {f.weeklyGifts.toLocaleString()} weekly</p>
                    </div>
                    {f.isRecruiting && (
                      <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: "4px 10px" }}
                        onClick={async () => {
                          try {
                            await joinFamily(f.id, user.uid, user.name, user.avatar, user.level);
                            const mf = await getUserFamily(user.uid);
                            setMyFamily(mf);
                            showToast(`Joined ${f.name}!`, "success");
                          } catch (e: any) { showToast(e.message, "error"); }
                        }}>Join</button>
                    )}
                  </div>
                ))}
                {allFamilies.length === 0 && <p style={{ textAlign: "center", fontSize: 13, color: "rgba(162,155,254,0.4)", padding: 24 }}>No families yet. Be the first!</p>}
              </div>
            </div>
          )}
        </BottomSheet>
      )}

      {showLanguage && (
        <BottomSheet onClose={() => setShowLanguage(false)}>
          <h3 style={{ fontSize: 18, fontWeight: 900, textAlign: "center", marginBottom: 16 }}>🌍 Language</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {LANGUAGE_OPTIONS.map(lang => (
              <button key={lang.code} onClick={() => {
                setLanguage(lang.code);
                setCurrentLang(lang.code);
                document.documentElement.dir = (lang.code === "ar" || lang.code === "ur") ? "rtl" : "ltr";
                showToast(`Language changed to ${lang.nativeName}`, "success");
              }} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", borderRadius: 14, border: currentLang === lang.code ? "1.5px solid #6C5CE7" : "1px solid rgba(255,255,255,0.06)",
                background: currentLang === lang.code ? "rgba(108,92,231,0.12)" : "rgba(255,255,255,0.02)",
                cursor: "pointer", fontFamily: "inherit",
              }}>
                <span style={{ fontSize: 24 }}>{lang.flag}</span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: currentLang === lang.code ? "#A29BFE" : "rgba(255,255,255,0.8)" }}>{lang.nativeName}</p>
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)" }}>{lang.name}</p>
                </div>
                {currentLang === lang.code && <span style={{ color: "#6C5CE7", fontSize: 18 }}>✓</span>}
              </button>
            ))}
          </div>
        </BottomSheet>
      )}

      {showReportQueue && isAdmin && (
        <BottomSheet onClose={() => setShowReportQueue(false)}>
          <h3 style={{ fontSize: 18, fontWeight: 900, textAlign: "center", marginBottom: 12 }}>📋 Report Queue</h3>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
            {["pending", "action_taken", "dismissed"].map(s => (
              <button key={s} onClick={() => {
                setReportQueueFilter(s);
                getReportQueue(s).then(setReportQueue).catch(() => {});
              }} style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", whiteSpace: "nowrap",
                background: reportQueueFilter === s ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.04)",
                color: reportQueueFilter === s ? "#A29BFE" : "rgba(162,155,254,0.5)",
              }}>{s === "pending" ? "⏳ Pending" : s === "action_taken" ? "✅ Actioned" : "❌ Dismissed"}</button>
            ))}
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {reportQueue.map(r => (
              <div key={r.id} style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,100,130,0.8)" }}>vs {r.reportedName}</span>
                  <span style={{ fontSize: 10, color: "rgba(162,155,254,0.3)" }}>{new Date(r.timestamp).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: 12, color: "rgba(162,155,254,0.6)", marginBottom: 4 }}>
                  <strong>By:</strong> {r.reporterName} • <strong>Category:</strong> {r.category}
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>{r.reason} — {r.details || "No details"}</p>
                {r.status === "pending" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-danger btn-sm" style={{ flex: 1, fontSize: 10 }}
                      onClick={async () => {
                        await reviewReport(r.id, user.uid, "action_taken", "Reviewed by admin", "warned");
                        getReportQueue(reportQueueFilter).then(setReportQueue).catch(() => {});
                        showToast("Action taken", "success");
                      }}>⚡ Action</button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 10 }}
                      onClick={async () => {
                        await reviewReport(r.id, user.uid, "dismissed", "Dismissed by admin");
                        getReportQueue(reportQueueFilter).then(setReportQueue).catch(() => {});
                        showToast("Report dismissed", "info");
                      }}>✖ Dismiss</button>
                  </div>
                )}
                {r.status !== "pending" && r.reviewNote && (
                  <p style={{ fontSize: 10, color: "rgba(0,255,200,0.5)", fontStyle: "italic" }}>📝 {r.reviewNote}</p>
                )}
              </div>
            ))}
            {reportQueue.length === 0 && <p style={{ textAlign: "center", fontSize: 13, color: "rgba(162,155,254,0.4)", padding: 24 }}>No reports in this category</p>}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function BottomSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(5,1,18,0.88)", backdropFilter: "blur(5px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1100,
    }} onClick={onClose}>
      <div className="card" style={{
        width: "100%", maxWidth: 400, borderRadius: "24px 24px 0 0",
        padding: 24, animation: "slide-up 0.3s ease", maxHeight: "80vh", display: "flex", flexDirection: "column",
        overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function PrivacyToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
        background: value ? "rgba(108,92,231,0.6)" : "rgba(255,255,255,0.1)",
        position: "relative", transition: "background 0.2s",
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: 10, background: "#fff",
          position: "absolute", top: 3, left: value ? 25 : 3,
          transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }} />
      </button>
    </div>
  );
}