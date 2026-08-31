import { useState, useEffect } from "react";
import { ref, onValue, off, update, get, push } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAdmin } from "@/App";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, User, Building2, ExternalLink, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface HostApplication {
  id: string; uid: string; userId: string; name: string; avatar: string;
  reason: string; experience: string; socialLinks?: string; languages?: string;
  status: "pending" | "approved" | "rejected";
  appliedAt: number; reviewedAt?: number; reviewedBy?: string; reviewNote?: string;
}

interface AgencyApplication {
  id: string; uid: string; userId: string; name: string; avatar: string;
  agencyName: string; description: string; hostCount: string; website?: string;
  status: "pending" | "approved" | "rejected";
  appliedAt: number; reviewedAt?: number; reviewedBy?: string; reviewNote?: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]"><CheckCircle className="w-3 h-3 mr-1"/>Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]"><XCircle className="w-3 h-3 mr-1"/>Rejected</Badge>;
  return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]"><Clock className="w-3 h-3 mr-1"/>Pending</Badge>;
}

export default function ApplicationsPage() {
  const [hostApps, setHostApps] = useState<HostApplication[]>([]);
  const [agencyApps, setAgencyApps] = useState<AgencyApplication[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [reviewTarget, setReviewTarget] = useState<{ id: string; type: "host" | "agency"; action: "approved" | "rejected" } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const { isDemo, showDemoBlock } = useAdmin();
  const { toast } = useToast();

  useEffect(() => {
    const hr = ref(db, "hostApplications");
    const ar = ref(db, "agencyApplications");
    const hh = onValue(hr, snap => {
      if (!snap.exists()) { setHostApps([]); return; }
      setHostApps((Object.values(snap.val()) as HostApplication[]).sort((a, b) => b.appliedAt - a.appliedAt));
    });
    const ah = onValue(ar, snap => {
      if (!snap.exists()) { setAgencyApps([]); return; }
      setAgencyApps((Object.values(snap.val()) as AgencyApplication[]).sort((a, b) => b.appliedAt - a.appliedAt));
    });
    return () => { off(hr, "value", hh); off(ar, "value", ah); };
  }, []);

  async function handleReview() {
    if (!reviewTarget) return;
    if (isDemo) { showDemoBlock(); return; }
    setReviewing(true);
    try {
      const path = reviewTarget.type === "host" ? `hostApplications/${reviewTarget.id}` : `agencyApplications/${reviewTarget.id}`;
      const applicationSnap = await get(ref(db, path));
      if (!applicationSnap.exists()) throw new Error("Application not found.");
      const application = applicationSnap.val();
      const now = Date.now();
      const updates: Record<string, unknown> = {
        [`${path}/status`]: reviewTarget.action,
        [`${path}/reviewNote`]: reviewNote,
        [`${path}/reviewedAt`]: now,
        [`${path}/reviewedBy`]: "admin",
      };

      if (reviewTarget.type === "host") {
        updates[`users/${application.uid}/hostStatus`] = reviewTarget.action;
        updates[`users/${application.uid}/hostApprovedAt`] = reviewTarget.action === "approved" ? now : null;
        updates[`users/${application.uid}/globalRole`] = reviewTarget.action === "approved" ? "officialHost" : "user";
      } else if (reviewTarget.action === "approved") {
        const agencyRef = push(ref(db, "agencies"));
        const agencyId = agencyRef.key!;
        const agencyCode = `AG${agencyId.slice(-7).toUpperCase()}`;
        updates[`agencies/${agencyId}`] = {
          id: agencyId,
          agencyCode,
          ownerUid: application.uid,
          ownerName: application.name,
          ownerAvatar: application.avatar || "",
          agencyName: application.agencyName,
          description: application.description,
          memberCount: 1,
          createdAt: now,
          verified: true,
          totalEarnings: 0,
          members: {
            [application.uid]: {
              uid: application.uid,
              userId: application.userId,
              name: application.name,
              avatar: application.avatar || "",
              role: "owner",
              status: "active",
              addedAt: now,
            },
          },
        };
        updates[`users/${application.uid}/agencyId`] = agencyId;
        updates[`users/${application.uid}/agencyRole`] = "owner";
        updates[`users/${application.uid}/agencyCode`] = agencyCode;
      }
      await update(ref(db), updates);
      toast({ title: `Application ${reviewTarget.action}`, description: "Status updated successfully." });
      setReviewTarget(null);
      setReviewNote("");
    } catch {
      toast({ title: "Error", description: "Failed to update application.", variant: "destructive" });
    }
    setReviewing(false);
  }

  function filteredApps<T extends { status: string }>(apps: T[]) {
    if (filter === "all") return apps;
    return apps.filter(a => a.status === filter);
  }

  const pendingCount = hostApps.filter(a => a.status === "pending").length + agencyApps.filter(a => a.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Applications
            {pendingCount > 0 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{pendingCount} pending</Badge>}
          </h1>
          <p className="text-muted-foreground text-sm">Review host and agency applications from users.</p>
        </div>
        {/* Filter */}
        <div className="flex gap-1.5">
          {(["all", "pending", "approved", "rejected"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize",
                filter === f ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:text-white")}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="host">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="host" className="gap-1.5 text-xs">
            <User className="w-3 h-3" /> Host Applications ({hostApps.filter(a => a.status === "pending").length} pending)
          </TabsTrigger>
          <TabsTrigger value="agency" className="gap-1.5 text-xs">
            <Building2 className="w-3 h-3" /> Agency Applications ({agencyApps.filter(a => a.status === "pending").length} pending)
          </TabsTrigger>
        </TabsList>

        {/* Host Applications */}
        <TabsContent value="host" className="mt-4 space-y-3">
          {filteredApps(hostApps).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">No applications found.</div>
          ) : filteredApps(hostApps).map(app => (
            <div key={app.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <img src={app.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${app.name}`}
                  alt="" className="w-10 h-10 rounded-full object-cover shrink-0 bg-muted" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{app.name}</span>
                    <span className="text-muted-foreground text-xs">ID: {app.userId}</span>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(app.appliedAt).toLocaleString()}</p>
                  <div className="mt-2 space-y-1.5">
                    <div className="bg-muted/30 rounded-lg p-2.5">
                      <p className="text-[11px] text-muted-foreground font-medium mb-1">Why do you want to be a host?</p>
                      <p className="text-xs text-foreground/80">{app.reason}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2.5">
                      <p className="text-[11px] text-muted-foreground font-medium mb-1">Experience</p>
                      <p className="text-xs text-foreground/80">{app.experience}</p>
                    </div>
                    {app.languages && <p className="text-xs text-muted-foreground">Languages: <span className="text-white">{app.languages}</span></p>}
                    {app.socialLinks && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> {app.socialLinks}
                      </p>
                    )}
                    {app.reviewNote && (
                      <div className="bg-muted/20 rounded-lg p-2 border border-border mt-1">
                        <p className="text-[11px] text-muted-foreground"><MessageSquare className="w-3 h-3 inline mr-1" />Review note: {app.reviewNote}</p>
                      </div>
                    )}
                  </div>
                </div>
                {app.status === "pending" && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" className="h-7 text-xs bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30"
                      onClick={() => setReviewTarget({ id: app.id, type: "host", action: "approved" })}>
                      <CheckCircle className="w-3 h-3 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => setReviewTarget({ id: app.id, type: "host", action: "rejected" })}>
                      <XCircle className="w-3 h-3 mr-1" />Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Agency Applications */}
        <TabsContent value="agency" className="mt-4 space-y-3">
          {filteredApps(agencyApps).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">No applications found.</div>
          ) : filteredApps(agencyApps).map(app => (
            <div key={app.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{app.agencyName}</span>
                    <span className="text-muted-foreground text-xs">by {app.name} (ID: {app.userId})</span>
                    <StatusBadge status={app.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(app.appliedAt).toLocaleString()}</p>
                  <div className="mt-2 space-y-1.5">
                    <div className="bg-muted/30 rounded-lg p-2.5">
                      <p className="text-[11px] text-muted-foreground font-medium mb-1">Description</p>
                      <p className="text-xs text-foreground/80">{app.description}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Expected hosts: <span className="text-white">{app.hostCount}</span></p>
                    {app.website && <p className="text-xs text-muted-foreground flex items-center gap-1"><ExternalLink className="w-3 h-3" />{app.website}</p>}
                    {app.reviewNote && (
                      <div className="bg-muted/20 rounded-lg p-2 border border-border mt-1">
                        <p className="text-[11px] text-muted-foreground"><MessageSquare className="w-3 h-3 inline mr-1" />Review note: {app.reviewNote}</p>
                      </div>
                    )}
                  </div>
                </div>
                {app.status === "pending" && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" className="h-7 text-xs bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30"
                      onClick={() => setReviewTarget({ id: app.id, type: "agency", action: "approved" })}>
                      <CheckCircle className="w-3 h-3 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => setReviewTarget({ id: app.id, type: "agency", action: "rejected" })}>
                      <XCircle className="w-3 h-3 mr-1" />Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={() => { setReviewTarget(null); setReviewNote(""); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-white">
              {reviewTarget?.action === "approved" ? "✅ Approve Application" : "❌ Reject Application"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add a note (optional) for the applicant.
            </p>
            <Textarea
              value={reviewNote}
              onChange={e => setReviewNote(e.target.value)}
              placeholder="e.g. Congratulations! / Please improve your activity and reapply."
              className="bg-muted border-border text-foreground text-sm resize-none"
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setReviewTarget(null); setReviewNote(""); }}>Cancel</Button>
            <Button size="sm"
              className={reviewTarget?.action === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              onClick={handleReview} disabled={reviewing}>
              {reviewing ? "Saving..." : reviewTarget?.action === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
