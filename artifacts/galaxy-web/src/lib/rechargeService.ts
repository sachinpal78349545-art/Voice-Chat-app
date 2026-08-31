import { ref, push, set, update, get, onValue, off } from "firebase/database";
import { db } from "./firebase";
import { addCoins, addTransaction } from "./userService";

export interface RechargePackage {
  id: string;
  coins: number;
  bonusCoins: number;
  inrPrice: number;
  label: string;
}

export const RECHARGE_PACKAGES: RechargePackage[] = [
  { id: "p10",   coins: 100,   bonusCoins: 0,    inrPrice: 10,   label: "Starter"  },
  { id: "p50",   coins: 500,   bonusCoins: 50,   inrPrice: 50,   label: "Popular"  },
  { id: "p100",  coins: 1000,  bonusCoins: 150,  inrPrice: 100,  label: "Value"    },
  { id: "p500",  coins: 5000,  bonusCoins: 1000, inrPrice: 500,  label: "Premium"  },
  { id: "p1000", coins: 10000, bonusCoins: 2500, inrPrice: 1000, label: "Elite"    },
];

export type RechargeStatus = "pending" | "approved" | "rejected";

export interface RechargeRequest {
  id: string;
  uid: string;
  userName: string;
  userAvatar: string;
  userId: string;
  transactionId: string;
  packageId: string;
  inrPaid: number;
  coinsRequested: number;
  totalCoins: number;
  status: RechargeStatus;
  createdAt: number;
  processedAt?: number;
  processedBy?: string;
  rejectReason?: string;
  note?: string;
}

/** Submit a new UPI recharge request */
export async function submitRechargeRequest(
  uid: string,
  userName: string,
  userAvatar: string,
  userId: string,
  transactionId: string,
  pkg: RechargePackage,
): Promise<string> {
  // Prevent duplicate transaction IDs
  const txSnap = await get(ref(db, "rechargeRequests"));
  if (txSnap.exists()) {
    const all = Object.values(txSnap.val() as Record<string, RechargeRequest>);
    const dup = all.find(r => r.transactionId.toLowerCase() === transactionId.toLowerCase() && r.status !== "rejected");
    if (dup) throw new Error("This Transaction ID has already been submitted. Please wait for approval or use a different ID.");
  }

  const newRef = push(ref(db, "rechargeRequests"));
  const request: Omit<RechargeRequest, "id"> = {
    uid,
    userName,
    userAvatar,
    userId,
    transactionId: transactionId.trim(),
    packageId: pkg.id,
    inrPaid: pkg.inrPrice,
    coinsRequested: pkg.coins,
    totalCoins: pkg.coins + pkg.bonusCoins,
    status: "pending",
    createdAt: Date.now(),
  };
  await set(newRef, request);
  return newRef.key!;
}

/** Admin: subscribe to all recharge requests */
export function subscribeRechargeRequests(
  cb: (requests: RechargeRequest[]) => void,
): () => void {
  const r = ref(db, "rechargeRequests");
  const listener = onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val() as Record<string, Omit<RechargeRequest, "id">>;
    const list = Object.entries(val)
      .map(([id, data]) => ({ ...data, id }))
      .sort((a, b) => b.createdAt - a.createdAt);
    cb(list);
  });
  return () => off(r, "value", listener);
}

/** Admin: approve a request — adds coins to user */
export async function approveRechargeRequest(
  requestId: string,
  adminUid: string,
  request: RechargeRequest,
): Promise<void> {
  await update(ref(db, `rechargeRequests/${requestId}`), {
    status: "approved",
    processedAt: Date.now(),
    processedBy: adminUid,
  });
  await addCoins(request.uid, request.totalCoins);
  await addTransaction(request.uid, {
    type: "recharge",
    amount: request.totalCoins,
    description: `UPI Recharge ₹${request.inrPaid} → ${request.totalCoins} coins (Txn: ${request.transactionId})`,
  });
}

/** Admin: reject a request */
export async function rejectRechargeRequest(
  requestId: string,
  adminUid: string,
  reason: string,
): Promise<void> {
  await update(ref(db, `rechargeRequests/${requestId}`), {
    status: "rejected",
    processedAt: Date.now(),
    processedBy: adminUid,
    rejectReason: reason || "Not approved",
  });
}

/** User: get their own recharge history */
export async function getUserRechargeHistory(uid: string): Promise<RechargeRequest[]> {
  const snap = await get(ref(db, "rechargeRequests"));
  if (!snap.exists()) return [];
  const val = snap.val() as Record<string, Omit<RechargeRequest, "id">>;
  return Object.entries(val)
    .map(([id, d]) => ({ ...d, id }))
    .filter(r => r.uid === uid)
    .sort((a, b) => b.createdAt - a.createdAt);
}
