// src/pages/Report.tsx
import { useState, useEffect } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  User,
  Video,
  Search,
  Check,
  X,
  Eye,
} from "lucide-react";

interface Report {
  id: string;
  reporterName: string;
  reportedUserName: string;
  reason: string;
  type: "video" | "post" | "user";
  status: "pending" | "solved" | "rejected";
  createdAt: number;
}

export default function Report() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [filtered, setFiltered] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    solved: 0,
    video: 0,
    post: 0,
    user: 0,
  });

  // Firebase Realtime DB fetch (Exact same as yours)
  useEffect(() => {
    const refReports = ref(db, "reports");
    const unsub = onValue(refReports, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list: Report[] = Object.keys(data).map((key) => ({
          ...data[key],
          id: key,
        }));
        list.sort((a, b) => b.createdAt - a.createdAt);
        setReports(list);
        setFiltered(list);
        calculateStats(list);
      } else {
        setReports([]);
        setFiltered([]);
        setStats({
          total: 0,
          pending: 0,
          solved: 0,
          video: 0,
          post: 0,
          user: 0,
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const calculateStats = (list: Report[]) => {
    setStats({
      total: list.length,
      pending: list.filter((r) => r.status === "pending").length,
      solved: list.filter((r) => r.status === "solved").length,
      video: list.filter((r) => r.type === "video").length,
      post: list.filter((r) => r.type === "post").length,
      user: list.filter((r) => r.type === "user").length,
    });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toLowerCase();
    setSearch(q);
    setFiltered(
      reports.filter(
        (r) =>
          r.reporterName.toLowerCase().includes(q) ||
          r.reportedUserName.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q)
      )
    );
  };

  // Firebase update functions (Exact same as yours)
  const resolveReport = async (id: string) => {
    await update(ref(db, `reports/${id}`), { status: "solved" });
    toast({ title: "Report resolved ✅", description: "Status updated to Solved" });
  };

  const rejectReport = async (id: string) => {
    await update(ref(db, `reports/${id}`), { status: "rejected" });
    toast({ title: "Report rejected ❌", description: "Status updated to Rejected" });
  };

  // Helper: Type ke hisaab se badge
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "video":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">🎥 Video</Badge>;
      case "post":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">📝 Post</Badge>;
      case "user":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">👤 User</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Helper: Status ke hisaab se badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⏳ Pending</Badge>;
      case "solved":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✅ Solved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">🚫 Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format Date
  const formatDate = (timestamp: number) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-lg">Loading reports...</div>
      </div>
    );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Reports
        </h1>
        <p className="text-gray-400 mt-1">
          Review and manage reported content
        </p>
      </div>

      {/* Stats Grid - Exactly like Tingle style */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="p-2 rounded-full bg-blue-500/10">
              <AlertTriangle className="h-5 w-5 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
            <div className="p-2 rounded-full bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Solved</p>
              <p className="text-2xl font-bold text-green-400">{stats.solved}</p>
            </div>
            <div className="p-2 rounded-full bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Video</p>
              <p className="text-2xl font-bold text-purple-400">{stats.video}</p>
            </div>
            <div className="p-2 rounded-full bg-purple-500/10">
              <Video className="h-5 w-5 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Post</p>
              <p className="text-2xl font-bold text-blue-400">{stats.post}</p>
            </div>
            <div className="p-2 rounded-full bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">User</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.user}</p>
            </div>
            <div className="p-2 rounded-full bg-emerald-500/10">
              <User className="h-5 w-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name, username, reason..."
          value={search}
          onChange={handleSearch}
          className="pl-10 bg-background border-border/50 focus:border-blue-500/50"
        />
      </div>

      {/* Table - Tingle style professional look */}
      <div className="bg-card/50 border border-border/50 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-gray-400 font-semibold">Reporter</TableHead>
              <TableHead className="text-gray-400 font-semibold">Reported User</TableHead>
              <TableHead className="text-gray-400 font-semibold">Reason</TableHead>
              <TableHead className="text-gray-400 font-semibold">Type</TableHead>
              <TableHead className="text-gray-400 font-semibold">Date</TableHead>
              <TableHead className="text-gray-400 font-semibold">Status</TableHead>
              <TableHead className="text-gray-400 font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-gray-400"
                >
                  No reports found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow
                  key={r.id}
                  className="border-border/40 hover:bg-muted/20 transition-colors"
                >
                  <TableCell className="font-medium text-white">
                    {r.reporterName}
                  </TableCell>
                  <TableCell className="text-white">
                    {r.reportedUserName}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-gray-300">
                    {r.reason}
                  </TableCell>
                  <TableCell>{getTypeBadge(r.type)}</TableCell>
                  <TableCell className="text-sm text-gray-300">
                    {formatDate(r.createdAt)}
                  </TableCell>
                  <TableCell>{getStatusBadge(r.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {r.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            onClick={() => resolveReport(r.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => rejectReport(r.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Footer - Showing count */}
        <div className="border-t border-border/50 px-6 py-3 flex items-center justify-between bg-muted/10">
          <div className="text-sm text-gray-400">
            Showing {filtered.length === 0 ? 0 : 1} to {filtered.length} of{" "}
            {filtered.length} entries
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled className="opacity-50">
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled className="opacity-50">
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}