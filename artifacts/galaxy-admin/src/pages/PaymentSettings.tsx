// src/pages/PaymentSettings.tsx
import { useState, useEffect } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentConfig {
  stripe: { enabled: boolean; publishableKey: string; secretKey: string };
  razorpay: { enabled: boolean; id: string; secret: string };
  paypal: { enabled: boolean; clientId: string; secret: string };
  paystack: { enabled: boolean; secretKey: string };
  flutterwave: { enabled: boolean; id: string };
  googlePlay: { enabled: boolean; serviceEmail: string; privateKey: string };
  nowpayments: { enabled: boolean; apiKey: string; baseUrl?: string; ipnSecret?: string };
}

export default function PaymentSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      const snap = await get(ref(db, "appConfig/payment"));
      if (snap.exists()) setConfig(snap.val());
      else setConfig(getDefaultConfig());
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const getDefaultConfig = (): PaymentConfig => ({
    stripe: { enabled: false, publishableKey: "", secretKey: "" },
    razorpay: { enabled: false, id: "", secret: "" },
    paypal: { enabled: false, clientId: "", secret: "" },
    paystack: { enabled: false, secretKey: "" },
    flutterwave: { enabled: false, id: "" },
    googlePlay: { enabled: false, serviceEmail: "", privateKey: "" },
    nowpayments: { enabled: false, apiKey: "", baseUrl: "", ipnSecret: "" },
  });

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try { await set(ref(db, "appConfig/payment"), config); toast({ title: "Payment settings saved ✅" }); }
    catch { toast({ title: "Save failed", variant: "destructive" }); }
    setSaving(false);
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;
  if (!config) return <div className="text-white p-6">No config</div>;

  const GatewayCard = ({ title, enabled, onToggle, children }: any) => (
    <Card className="bg-card border-border">
      <CardHeader><CardTitle className="text-white text-lg flex items-center justify-between">{title} <Switch checked={enabled} onCheckedChange={onToggle} /></CardTitle></CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Payment Settings</h1>

      <GatewayCard title="Stripe" enabled={config.stripe.enabled} onToggle={v => setConfig({...config, stripe: {...config.stripe, enabled: v}})}>
        <div><Label>Publishable Key</Label><Input value={config.stripe.publishableKey} onChange={e => setConfig({...config, stripe: {...config.stripe, publishableKey: e.target.value}})} /></div>
        <div><Label>Secret Key</Label><Input type="password" value={config.stripe.secretKey} onChange={e => setConfig({...config, stripe: {...config.stripe, secretKey: e.target.value}})} /></div>
      </GatewayCard>

      <GatewayCard title="Razorpay" enabled={config.razorpay.enabled} onToggle={v => setConfig({...config, razorpay: {...config.razorpay, enabled: v}})}>
        <div><Label>Razorpay ID</Label><Input value={config.razorpay.id} onChange={e => setConfig({...config, razorpay: {...config.razorpay, id: e.target.value}})} /></div>
        <div><Label>Razorpay Secret Key</Label><Input type="password" value={config.razorpay.secret} onChange={e => setConfig({...config, razorpay: {...config.razorpay, secret: e.target.value}})} /></div>
      </GatewayCard>

      <GatewayCard title="PayPal" enabled={config.paypal.enabled} onToggle={v => setConfig({...config, paypal: {...config.paypal, enabled: v}})}>
        <div><Label>PayPal Client ID</Label><Input value={config.paypal.clientId} onChange={e => setConfig({...config, paypal: {...config.paypal, clientId: e.target.value}})} /></div>
        <div><Label>PayPal Secret</Label><Input type="password" value={config.paypal.secret} onChange={e => setConfig({...config, paypal: {...config.paypal, secret: e.target.value}})} /></div>
      </GatewayCard>

      <GatewayCard title="Paystack" enabled={config.paystack.enabled} onToggle={v => setConfig({...config, paystack: {...config.paystack, enabled: v}})}>
        <div><Label>Paystack Secret Key</Label><Input type="password" value={config.paystack.secretKey} onChange={e => setConfig({...config, paystack: {...config.paystack, secretKey: e.target.value}})} /></div>
      </GatewayCard>

      <GatewayCard title="Flutterwave" enabled={config.flutterwave.enabled} onToggle={v => setConfig({...config, flutterwave: {...config.flutterwave, enabled: v}})}>
        <div><Label>Flutterwave ID</Label><Input value={config.flutterwave.id} onChange={e => setConfig({...config, flutterwave: {...config.flutterwave, id: e.target.value}})} /></div>
      </GatewayCard>

      <GatewayCard title="Google Play" enabled={config.googlePlay.enabled} onToggle={v => setConfig({...config, googlePlay: {...config.googlePlay, enabled: v}})}>
        <div><Label>Service Account Email</Label><Input value={config.googlePlay.serviceEmail} onChange={e => setConfig({...config, googlePlay: {...config.googlePlay, serviceEmail: e.target.value}})} /></div>
        <div><Label>Google Play Private Key</Label><Input type="password" value={config.googlePlay.privateKey} onChange={e => setConfig({...config, googlePlay: {...config.googlePlay, privateKey: e.target.value}})} /></div>
      </GatewayCard>

      <GatewayCard title="NowPayments" enabled={config.nowpayments.enabled} onToggle={v => setConfig({...config, nowpayments: {...config.nowpayments, enabled: v}})}>
        <div><Label>NowPayments API Key</Label><Input value={config.nowpayments.apiKey} onChange={e => setConfig({...config, nowpayments: {...config.nowpayments, apiKey: e.target.value}})} /></div>
        <div><Label>NowPayments Base URL</Label><Input value={config.nowpayments.baseUrl} onChange={e => setConfig({...config, nowpayments: {...config.nowpayments, baseUrl: e.target.value}})} /></div>
        <div><Label>NowPayments IPN Secret</Label><Input value={config.nowpayments.ipnSecret} onChange={e => setConfig({...config, nowpayments: {...config.nowpayments, ipnSecret: e.target.value}})} /></div>
      </GatewayCard>

      <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save All"}</Button>
    </div>
  );
}