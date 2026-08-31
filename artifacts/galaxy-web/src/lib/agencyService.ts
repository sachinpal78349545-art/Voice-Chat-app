// agencyService.ts – Host & Agency application system
import { ref, push, get, update, set, onValue, off, runTransaction } from "firebase/database";
import { db } from "./firebase";

export interface HostApplication {
  id: string;
  uid: string;
  userId: string;
  name: string;
  avatar: string;
  reason: string;
  experience: string;
  socialLinks?: string;
  languages?: string;
  status: "pending" | "approved" | "rejected";
  appliedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  reviewNote?: string;
}

export interface AgencyApplication {
  id: string;
  uid: string;
  userId: string;
  name: string;
  avatar: string;
  agencyName: string;
  description: string;
  hostCount: string;
  website?: string;
  status: "pending" | "approved" | "rejected";
  appliedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  reviewNote?: string;
}

export interface AgencyInfo {
  id: string;
  ownerUid: string;
  ownerName: string;
  ownerAvatar: string;
  agencyName: string;
  description: string;
  memberCount: number;
  createdAt: number;
  verified: boolean;
  agencyCode?: string;
  totalEarnings?: number;
  members?: Record<string, AgencyMember>;
}

export interface AgencyMember {
  uid: string;
  userId: string;
  name: string;
  avatar: string;
  role: "owner" | "host";
  status: "active" | "removed";
  addedAt: number;
  removedAt?: number;
}

export interface KycApplication {
  uid: string;
  userId: string;
  userName: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  idType: string;
  idNumber: string;
  age: number;
  address: string;
  documents: Record<string, { name: string; url: string; status: string }>;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  reviewedAt?: number;
  reviewNote?: string;
}

export interface PayoutRequest {
  id: string;
  uid: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  role: "host" | "agency";
  coins: number;
  amount: number;
  paymentMethod: string;
  paymentDetails: Record<string, string>;
  requestDate: number;
  status: "pending" | "processing" | "completed" | "rejected";
  rejectReason?: string;
}

// ─── Host Applications ───────────────────────────────────────────────────────

export async function applyForHost(
  uid: string,
  data: Pick<HostApplication, "userId" | "name" | "avatar" | "reason" | "experience" | "socialLinks" | "languages">
): Promise<string> {
  // Check if already applied
  const existing = await getUserHostApplication(uid);
  if (existing && existing.status === "pending") {
    throw new Error("You already have a pending host application.");
  }

  const appsRef = ref(db, "hostApplications");
  const newRef = push(appsRef);
  const id = newRef.key!;
  await set(newRef, { ...data, uid, id, status: "pending", appliedAt: Date.now() });

  // Notify super admin
  try {
    const notifRef = ref(db, `notifications/super_admin_306623582/${id}`);
    await set(notifRef, {
      type: "host_application",
      title: "New Host Application",
      body: `${data.name} (ID: ${data.userId}) has applied to become a host.`,
      uid,
      applicationId: id,
      read: false,
      timestamp: Date.now(),
    });
  } catch { /* non-critical */ }

  return id;
}

export async function getUserHostApplication(uid: string): Promise<HostApplication | null> {
  const snap = await get(ref(db, "hostApplications"));
  if (!snap.exists()) return null;
  const all = Object.values(snap.val()) as HostApplication[];
  return all.find(a => a.uid === uid) || null;
}

export async function getHostApplications(): Promise<HostApplication[]> {
  const snap = await get(ref(db, "hostApplications"));
  if (!snap.exists()) return [];
  return (Object.values(snap.val()) as HostApplication[]).sort((a, b) => b.appliedAt - a.appliedAt);
}

export function subscribeHostApplications(cb: (apps: HostApplication[]) => void): () => void {
  const r = ref(db, "hostApplications");
  const handler = onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    cb((Object.values(snap.val()) as HostApplication[]).sort((a, b) => b.appliedAt - a.appliedAt));
  });
  return () => off(r, "value", handler);
}

export async function reviewHostApplication(
  id: string,
  status: "approved" | "rejected",
  note: string,
  reviewerUid: string
): Promise<void> {
  const snap = await get(ref(db, `hostApplications/${id}`));
  const app = snap.exists() ? snap.val() as HostApplication : null;
  if (!app) throw new Error("Host application not found");
  await update(ref(db), {
    [`hostApplications/${id}/status`]: status,
    [`hostApplications/${id}/reviewNote`]: note,
    [`hostApplications/${id}/reviewedAt`]: Date.now(),
    [`hostApplications/${id}/reviewedBy`]: reviewerUid,
    [`users/${app.uid}/hostStatus`]: status,
    [`users/${app.uid}/hostApprovedAt`]: status === "approved" ? Date.now() : null,
    [`users/${app.uid}/globalRole`]: status === "approved" ? "officialHost" : "user",
  });
}

// ─── Agency Applications ─────────────────────────────────────────────────────

export async function applyForAgency(
  uid: string,
  data: Pick<AgencyApplication, "userId" | "name" | "avatar" | "agencyName" | "description" | "hostCount" | "website">
): Promise<string> {
  const existing = await getUserAgencyApplication(uid);
  if (existing && existing.status === "pending") {
    throw new Error("You already have a pending agency application.");
  }

  const appsRef = ref(db, "agencyApplications");
  const newRef = push(appsRef);
  const id = newRef.key!;
  await set(newRef, { ...data, uid, id, status: "pending", appliedAt: Date.now() });

  try {
    const notifRef = ref(db, `notifications/super_admin_306623582/${id}_agency`);
    await set(notifRef, {
      type: "agency_application",
      title: "New Agency Application",
      body: `${data.name} applied to create agency "${data.agencyName}".`,
      uid,
      applicationId: id,
      read: false,
      timestamp: Date.now(),
    });
  } catch { /* non-critical */ }

  return id;
}

export async function getUserAgencyApplication(uid: string): Promise<AgencyApplication | null> {
  const snap = await get(ref(db, "agencyApplications"));
  if (!snap.exists()) return null;
  const all = Object.values(snap.val()) as AgencyApplication[];
  return all.find(a => a.uid === uid) || null;
}

export async function getAgencyApplications(): Promise<AgencyApplication[]> {
  const snap = await get(ref(db, "agencyApplications"));
  if (!snap.exists()) return [];
  return (Object.values(snap.val()) as AgencyApplication[]).sort((a, b) => b.appliedAt - a.appliedAt);
}

export function subscribeAgencyApplications(cb: (apps: AgencyApplication[]) => void): () => void {
  const r = ref(db, "agencyApplications");
  const handler = onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    cb((Object.values(snap.val()) as AgencyApplication[]).sort((a, b) => b.appliedAt - a.appliedAt));
  });
  return () => off(r, "value", handler);
}

export async function reviewAgencyApplication(
  id: string,
  status: "approved" | "rejected",
  note: string,
  reviewerUid: string
): Promise<void> {
  const snap = await get(ref(db, `agencyApplications/${id}`));
  const app = snap.exists() ? snap.val() as AgencyApplication : null;
  if (!app) throw new Error("Agency application not found");
  const agencyRef = push(ref(db, "agencies"));
  const agencyId = agencyRef.key!;
  const agencyCode = `AG${agencyId.slice(-7).toUpperCase()}`;
  const updates: Record<string, unknown> = {
    [`agencyApplications/${id}/status`]: status,
    [`agencyApplications/${id}/reviewNote`]: note,
    [`agencyApplications/${id}/reviewedAt`]: Date.now(),
    [`agencyApplications/${id}/reviewedBy`]: reviewerUid,
  };
  if (status === "approved") {
    updates[`agencies/${agencyId}`] = {
      id: agencyId, agencyCode, ownerUid: app.uid, ownerName: app.name, ownerAvatar: app.avatar,
      agencyName: app.agencyName, description: app.description, memberCount: 1,
      createdAt: Date.now(), verified: true, totalEarnings: 0,
      members: { [app.uid]: { uid: app.uid, userId: app.userId, name: app.name, avatar: app.avatar, role: "owner", status: "active", addedAt: Date.now() } },
    };
    updates[`users/${app.uid}/agencyId`] = agencyId;
    updates[`users/${app.uid}/agencyRole`] = "owner";
    updates[`users/${app.uid}/agencyCode`] = agencyCode;
  }
  await update(ref(db), updates);
}

// ─── Agency Directory ─────────────────────────────────────────────────────────

export function subscribeAgencies(cb: (agencies: AgencyInfo[]) => void): () => void {
  const r = ref(db, "agencies");
  const handler = onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    cb((Object.values(snap.val()) as AgencyInfo[]).sort((a, b) => b.memberCount - a.memberCount));
  });
  return () => off(r, "value", handler);
}

export async function createAgency(ownerUid: string, info: Omit<AgencyInfo, "id" | "memberCount" | "createdAt" | "verified">): Promise<string> {
  const agRef = ref(db, "agencies");
  const newRef = push(agRef);
  const id = newRef.key!;
  const agencyCode = `AG${id.slice(-7).toUpperCase()}`;
  await set(newRef, { ...info, id, agencyCode, ownerUid, memberCount: 1, createdAt: Date.now(), verified: false, totalEarnings: 0 });
  // Record on user profile
  await update(ref(db, `users/${ownerUid}`), { agencyId: id, agencyRole: "owner" });
  return id;
}

// ─── KYC ─────────────────────────────────────────────────────────────────────

export async function getUserKyc(uid: string): Promise<KycApplication | null> {
  const snap = await get(ref(db, `kycApplications/${uid}`));
  return snap.exists() ? snap.val() as KycApplication : null;
}

export async function submitKyc(uid: string, data: Omit<KycApplication, "uid" | "status" | "createdAt" | "reviewedAt">): Promise<void> {
  const existing = await getUserKyc(uid);
  if (existing?.status === "pending") throw new Error("Your KYC is already under review.");
  await update(ref(db), {
    [`kycApplications/${uid}`]: { ...data, uid, status: "pending", createdAt: Date.now() },
    [`users/${uid}/kycStatus`]: "pending",
  });
}

// ─── Agency membership ───────────────────────────────────────────────────────

export async function getAgency(agencyId: string): Promise<AgencyInfo | null> {
  const snap = await get(ref(db, `agencies/${agencyId}`));
  return snap.exists() ? snap.val() as AgencyInfo : null;
}

async function findUserByPublicId(userId: string): Promise<{ uid: string; profile: any } | null> {
  const snap = await get(ref(db, "users"));
  if (!snap.exists()) return null;
  const found = Object.entries(snap.val() as Record<string, any>).find(([, value]) => value.userId === userId);
  return found ? { uid: found[0], profile: found[1] } : null;
}

export async function addHostToAgency(agencyId: string, hostUserId: string, actorUid: string): Promise<void> {
  const agency = await getAgency(agencyId);
  if (!agency || agency.ownerUid !== actorUid) throw new Error("Only the agency owner can add hosts.");
  const found = await findUserByPublicId(hostUserId.trim());
  if (!found) throw new Error("Host ID not found.");
  if (found.profile.hostStatus !== "approved" && found.profile.globalRole !== "officialHost") {
    throw new Error("This user is not an approved host.");
  }
  const member: AgencyMember = {
    uid: found.uid, userId: found.profile.userId, name: found.profile.name, avatar: found.profile.avatar || "",
    role: "host", status: "active", addedAt: Date.now(),
  };
  await update(ref(db), {
    [`agencies/${agencyId}/members/${found.uid}`]: member,
    [`agencies/${agencyId}/memberCount`]: (agency.memberCount || 0) + (agency.members?.[found.uid]?.status === "active" ? 0 : 1),
    [`users/${found.uid}/agencyId`]: agencyId,
    [`users/${found.uid}/agencyRole`]: "host",
    [`users/${found.uid}/agencyCode`]: agency.agencyCode || agencyId,
  });
}

export async function removeHostFromAgency(agencyId: string, hostUid: string, actorUid: string): Promise<void> {
  const agency = await getAgency(agencyId);
  if (!agency || agency.ownerUid !== actorUid) throw new Error("Only the agency owner can remove hosts.");
  const member = agency.members?.[hostUid];
  if (!member || member.role !== "host") throw new Error("Host is not a member of this agency.");
  await update(ref(db), {
    [`agencies/${agencyId}/members/${hostUid}/status`]: "removed",
    [`agencies/${agencyId}/members/${hostUid}/removedAt`]: Date.now(),
    [`agencies/${agencyId}/memberCount`]: Math.max(0, (agency.memberCount || 1) - 1),
    [`users/${hostUid}/agencyId`]: null,
    [`users/${hostUid}/agencyRole`]: null,
    [`users/${hostUid}/agencyCode`]: null,
  });
}

// ─── Host/agency redemption ──────────────────────────────────────────────────

export async function requestPayout(
  uid: string,
  profile: { userId: string; name: string; avatar?: string; totalEarnings?: number; agencyRole?: string },
  coins: number,
  paymentMethod: string,
  paymentDetails: Record<string, string>,
): Promise<string> {
  const kyc = await getUserKyc(uid);
  if (kyc?.status !== "approved") throw new Error("Approved KYC is required before redeeming.");
  const role = profile.agencyRole === "owner" ? "agency" : "host";
  const configSnap = await get(ref(db, "appConfig/withdrawal"));
  const config = configSnap.exists() ? configSnap.val() : { currency: 100, minCoinsUser: 150, minCoinsAgency: 50 };
  const minimum = role === "agency" ? Number(config.minCoinsAgency || 50) : Number(config.minCoinsUser || 150);
  const available = Number(profile.totalEarnings || 0);
  if (!Number.isFinite(coins) || coins < minimum || coins > available) {
    throw new Error(`Redeem between ${minimum.toLocaleString()} and ${available.toLocaleString()} earning coins.`);
  }
  const earningsRef = ref(db, `users/${uid}/totalEarnings`);
  const deducted = await runTransaction(earningsRef, current => {
    const value = Number(current || 0);
    return value >= coins ? value - coins : undefined;
  });
  if (!deducted.committed) throw new Error("Earnings changed. Please try again.");
  const payoutRef = push(ref(db, "payoutRequests"));
  const id = payoutRef.key!;
  const currencyRate = Math.max(1, Number(config.currency || 100));
  await set(payoutRef, {
    id, uid, userId: profile.userId, userName: profile.name, userAvatar: profile.avatar || "",
    role, coins, amount: Number((coins / currencyRate).toFixed(2)), paymentMethod, paymentDetails,
    requestDate: Date.now(), status: "pending",
  } satisfies PayoutRequest);
  await set(ref(db, `users/${uid}/transactions/payout_${id}`), {
    id: `payout_${id}`, type: "payout_requested", amount: -coins,
    description: `Redeem request for ${coins.toLocaleString()} coins`, timestamp: Date.now(),
  });
  return id;
}
