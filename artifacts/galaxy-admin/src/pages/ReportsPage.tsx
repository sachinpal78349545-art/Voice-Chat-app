import { useState, useEffect } from "react";
import { Flag, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { get, ref, onValue, off } from "firebase/database";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";

interface Report {
  id: string;
  reporterUid: string;
  reportedUid: string;
  reason: string;
  details: string;
  attachmentUrl?: string;
  timestamp: number;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function ReportCard({ report }: { report: Report }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
          <Flag className="w-4 h-4 text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{report.reason}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reporter: <code className="text-foreground/80">{report.reporterUid.slice(0, 8)}…</code> →
            Reported: <code className="text-foreground/80">{report.reportedUid.slice(0, 8)}…</code>
            · {timeAgo(report.timestamp)}
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/10">
          <div>
            <p className="text-xs text-muted-foreground">Details</p>
            <p className="text-sm text-foreground mt-0.5">{report.details || "No details provided"}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Reporter UID</p>
              <code className="text-foreground/80">{report.reporterUid}</code>
            </div>
            <div>
              <p className="text-muted-foreground">Reported UID</p>
              <code className="text-foreground/80">{report.reportedUid}</code>
            </div>
          </div>
          {report.attachmentUrl && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Attachment</p>
              <a href={report.attachmentUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary underline">View attachment</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    const r = ref(db, "reports");
    const listener = onValue(r, snap => {
      if (!snap.exists()) { setReports([]); setLoading(false); return; }
      const val = snap.val() as Record<string, Omit<Report, "id">>;
      const list = Object.entries(val)
        .map(([id, data]) => ({ ...data, id }))
        .sort((a, b) => b.timestamp - a.timestamp);
      setReports(list);
      setLoading(false);
    });
    return () => off(r, "value", listener);
  }, [refreshKey]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-muted-foreground text-sm">{reports.length} user reports</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setRefreshKey(k => k + 1)} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Flag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No reports yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map(r => <ReportCard key={r.id} report={r} />)}
        </div>
      )}
    </div>
  );
}
