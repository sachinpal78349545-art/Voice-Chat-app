import { useState, useEffect } from "react";
import { Package, Save, RefreshCw, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";

interface CoinPackage {
  id: string;
  label: string;
  coins: number;
  bonusCoins: number;
  inrPrice: number;
  enabled: boolean;
}

const BASE_PACKAGES: CoinPackage[] = [
  { id: "p10",   label: "Starter",  coins: 100,   bonusCoins: 0,    inrPrice: 10,   enabled: true },
  { id: "p50",   label: "Popular",  coins: 500,   bonusCoins: 50,   inrPrice: 50,   enabled: true },
  { id: "p100",  label: "Value",    coins: 1000,  bonusCoins: 150,  inrPrice: 100,  enabled: true },
  { id: "p500",  label: "Premium",  coins: 5000,  bonusCoins: 1000, inrPrice: 500,  enabled: true },
  { id: "p1000", label: "Elite",    coins: 10000, bonusCoins: 2500, inrPrice: 1000, enabled: true },
];

function PackageRow({ pkg, onSave }: { pkg: CoinPackage; onSave: (p: CoinPackage) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(pkg);

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-xl shrink-0">
          🪙
        </div>
        {editing ? (
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Label</p>
              <Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} className="h-7 text-xs bg-background border-border" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Coins</p>
              <Input type="number" value={form.coins} onChange={e => setForm(f => ({ ...f, coins: Number(e.target.value) }))} className="h-7 text-xs bg-background border-border" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Bonus</p>
              <Input type="number" value={form.bonusCoins} onChange={e => setForm(f => ({ ...f, bonusCoins: Number(e.target.value) }))} className="h-7 text-xs bg-background border-border" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Price ₹</p>
              <Input type="number" value={form.inrPrice} onChange={e => setForm(f => ({ ...f, inrPrice: Number(e.target.value) }))} className="h-7 text-xs bg-background border-border" />
            </div>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Label</p>
              <p className="text-sm font-semibold text-white">{form.label}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Coins</p>
              <p className="text-sm font-semibold text-yellow-400">🪙 {form.coins.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Bonus</p>
              <p className="text-sm font-semibold text-green-400">+{form.bonusCoins.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Price</p>
              <p className="text-sm font-semibold text-white">₹{form.inrPrice}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          {editing ? (
            <>
              <Button size="sm" className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700" onClick={() => { onSave(form); setEditing(false); }}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => { setForm(pkg); setEditing(false); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${form.enabled ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                {form.enabled ? "Active" : "Hidden"}
              </span>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-white" onClick={() => { const upd = { ...form, enabled: !form.enabled }; onSave(upd); setForm(upd); }}>
                {form.enabled ? "🙈" : "👁️"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-white" onClick={() => setEditing(true)}>
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
      {!editing && (
        <div className="mt-2 text-xs text-muted-foreground">
          Total: <span className="text-white font-medium">🪙 {(form.coins + form.bonusCoins).toLocaleString()} coins</span> for ₹{form.inrPrice}
        </div>
      )}
    </div>
  );
}

export default function PackagesPage() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadPackages() {
    setLoading(true);
    const snap = await get(ref(db, "appConfig/rechargePackages"));
    if (snap.exists()) {
      const val = snap.val() as Record<string, CoinPackage>;
      setPackages(Object.values(val).sort((a, b) => a.inrPrice - b.inrPrice));
    } else {
      setPackages(BASE_PACKAGES);
      const batch: Record<string, CoinPackage> = {};
      BASE_PACKAGES.forEach(p => { batch[p.id] = p; });
      await set(ref(db, "appConfig/rechargePackages"), batch);
    }
    setLoading(false);
  }

  useEffect(() => { loadPackages(); }, []);

  async function handleSave(pkg: CoinPackage) {
    await set(ref(db, `appConfig/rechargePackages/${pkg.id}`), pkg);
    setPackages(prev => prev.map(p => p.id === pkg.id ? pkg : p));
    toast({ title: "Package updated" });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Coin Packages</h1>
          <p className="text-muted-foreground text-sm">Manage recharge package prices</p>
        </div>
        <Button size="sm" variant="outline" onClick={loadPackages} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-sm text-foreground/80">
        💡 Changes here update the recharge packages visible to users. UPI QR code must be updated separately in the app.
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {packages.map(p => <PackageRow key={p.id} pkg={p} onSave={handleSave} />)}
        </div>
      )}
    </div>
  );
}
