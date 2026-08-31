// src/pages/KycVerification.tsx
import { useState, useEffect } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Eye } from "lucide-react";

interface KYC {
  id: string;
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
}

export default function KycVerification() {
  const { toast } = useToast();
  const [kycs, setKycs] = useState<KYC[]>([]);
  const [filtered, setFiltered] = useState<KYC[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<KYC | null>(null);

  useEffect(() => {
    const refKyc = ref(db, "kycApplications");
    const unsub = onValue(refKyc, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list: KYC[] = Object.keys(data).map(key => ({ ...data[key], id: key }));
        list.sort((a, b) => b.createdAt - a.createdAt);
        setKycs(list);
        setFiltered(list.filter(k => k.status === tab));
      } else { setKycs([]); setFiltered([]); }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => { setFiltered(kycs.filter(k => k.status === tab)); }, [tab, kycs]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toLowerCase();
    setSearch(q);
    setFiltered(kycs.filter(k => k.status === tab && (k.userName.toLowerCase().includes(q) || k.id.toLowerCase().includes(q))));
  };

  const updateStatus = async (id: string, status: string) => {
    await update(ref(db, `kycApplications/${id}`), { status, reviewedAt: Date.now() });
    toast({ title: `KYC ${status}` });
    setSelected(null);
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <h1 className="text-2xl font-bold text-white">KYC Verification</h1>
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold text-white">{kycs.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-yellow-400">{kycs.filter(k => k.status === "pending").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-400">{kycs.filter(k => k.status === "approved").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Rejected</p><p className="text-2xl font-bold text-red-400">{kycs.filter(k => k.status === "rejected").length}</p></CardContent></Card>
      </div>

      <Input placeholder="Search by name, ID..." value={search} onChange={handleSearch} className="max-w-md bg-background border-border" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card border-border"><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="approved">Approved</TabsTrigger><TabsTrigger value="rejected">Rejected</TabsTrigger></TabsList>
        <TabsContent value={tab} className="mt-4">
          <div className="bg-card border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground"><th>Unique ID</th><th>Applicant</th><th>ID Proof</th><th>Country</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? (<tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No applications</td></tr>) : (
                  filtered.map(k => (
                    <tr key={k.id} className="border-b border-border/40">
                      <td className="p-3 text-white font-mono text-xs">{k.id.slice(-8)}</td>
                      <td className="p-3 text-white">{k.userName}</td>
                      <td className="p-3 text-white">{k.idType} - {k.idNumber}</td>
                      <td className="p-3 text-white">{k.country}</td>
                      <td className="p-3 text-white text-xs">{new Date(k.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(k)}><Eye className="w-4 h-4" /></Button>
                        {k.status === "pending" && (<><Button size="sm" variant="ghost" className="text-green-400" onClick={() => updateStatus(k.id, "approved")}><Check className="w-4 h-4" /></Button><Button size="sm" variant="ghost" className="text-red-400" onClick={() => updateStatus(k.id, "rejected")}><X className="w-4 h-4" /></Button></>)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">KYC Application Review</h2>
            <div className="space-y-2 text-white">
              <p><strong>Name:</strong> {selected.fullName}</p>
              <p><strong>Email:</strong> {selected.email}</p>
              <p><strong>Phone:</strong> {selected.phone}</p>
              <p><strong>Country:</strong> {selected.country}</p>
              <p><strong>ID Type:</strong> {selected.idType}</p>
              <p><strong>ID Number:</strong> {selected.idNumber}</p>
              <p><strong>Age:</strong> {selected.age}</p>
              <p><strong>Address:</strong> {selected.address}</p>
              <div className="mt-4"><p className="font-semibold">Documents:</p>{Object.entries(selected.documents || {}).map(([key, doc]) => <div key={key} className="flex items-center gap-2 text-sm"><span>{doc.name}</span><Badge>{doc.status}</Badge></div>)}</div>
            </div>
            <div className="mt-4 flex gap-2">
              {selected.status === "pending" && (<><Button className="bg-green-600" onClick={() => updateStatus(selected.id, "approved")}>Approve</Button><Button className="bg-red-600" onClick={() => updateStatus(selected.id, "rejected")}>Reject</Button></>)}
              <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}