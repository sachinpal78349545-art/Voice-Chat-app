import { ref, push, set, get, update, onValue, off } from "firebase/database";
import { db } from "./firebase";

export interface Report {
  id: string;
  reporterUid: string;
  reporterName: string;
  reporterAvatar: string;
  reportedUid: string;
  reportedName: string;
  reportedAvatar: string;
  reason: string;
  details: string;
  category: "spam" | "harassment" | "inappropriate" | "scam" | "underage" | "other";
  evidence?: string;
  status: "pending" | "reviewed" | "action_taken" | "dismissed";
  reviewedBy?: string;
  reviewNote?: string;
  actionTaken?: string;
  timestamp: number;
  reviewedAt?: number;
  roomId?: string;
  messageId?: string;
}

export const REPORT_CATEGORIES = [
  { id: "spam", label: "Spam / Advertising", icon: "📢" },
  { id: "harassment", label: "Harassment / Bullying", icon: "😡" },
  { id: "inappropriate", label: "Inappropriate Content", icon: "🚫" },
  { id: "scam", label: "Scam / Fraud", icon: "⚠️" },
  { id: "underage", label: "Underage User", icon: "👶" },
  { id: "other", label: "Other", icon: "📋" },
];

export async function submitReport(report: Omit<Report, "id" | "status" | "timestamp">): Promise<string> {
  const rRef = push(ref(db, "reports"));
  const data: Report = {
    ...report,
    id: rRef.key!,
    status: "pending",
    timestamp: Date.now(),
  };
  await set(rRef, data);
  return rRef.key!;
}

export async function getReportQueue(status?: string): Promise<Report[]> {
  const snap = await get(ref(db, "reports"));
  if (!snap.exists()) return [];
  const val = snap.val();
  const reports: Report[] = Object.values(val);
  const filtered = status ? reports.filter(r => r.status === status) : reports;
  return filtered.sort((a, b) => b.timestamp - a.timestamp);
}

export function subscribeReports(cb: (reports: Report[]) => void): () => void {
  const r = ref(db, "reports");
  onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val();
    const reports: Report[] = Object.values(val);
    cb(reports.sort((a, b) => b.timestamp - a.timestamp));
  });
  return () => off(r);
}

export async function reviewReport(
  reportId: string,
  reviewerUid: string,
  action: "action_taken" | "dismissed",
  note: string,
  actionTaken?: string
): Promise<void> {
  await update(ref(db, `reports/${reportId}`), {
    status: action,
    reviewedBy: reviewerUid,
    reviewNote: note,
    actionTaken: actionTaken || "",
    reviewedAt: Date.now(),
  });
}

export async function getReportsByUser(uid: string): Promise<Report[]> {
  const snap = await get(ref(db, "reports"));
  if (!snap.exists()) return [];
  const val = snap.val();
  const reports: Report[] = Object.values(val);
  return reports.filter(r => r.reportedUid === uid).sort((a, b) => b.timestamp - a.timestamp);
}

export async function getReportStats(): Promise<{ total: number; pending: number; reviewed: number; actionTaken: number; dismissed: number }> {
  const reports = await getReportQueue();
  return {
    total: reports.length,
    pending: reports.filter(r => r.status === "pending").length,
    reviewed: reports.filter(r => r.status === "reviewed").length,
    actionTaken: reports.filter(r => r.status === "action_taken").length,
    dismissed: reports.filter(r => r.status === "dismissed").length,
  };
}
