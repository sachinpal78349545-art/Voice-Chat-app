// src/pages/ProfileManagement.tsx
import { useState, useEffect } from "react";
import { ref, get, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAdmin } from "@/App";  // ← useAuth की जगह useAdmin
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function ProfileManagement() {
  const { adminUser, isDemo, showDemoBlock } = useAdmin();
  const { toast } = useToast();
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Admin profile को appConfig/adminProfile में store करें
  useEffect(() => {
    const fetchProfile = async () => {
      const snap = await get(ref(db, "appConfig/adminProfile"));
      if (snap.exists()) {
        const data = snap.val();
        setProfile({ name: data.name || "", email: data.email || "" });
      } else {
        // अगर कोई profile नहीं है, तो adminUser से name लें
        setProfile({ name: adminUser?.name || "Admin", email: "" });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [adminUser]);

  const handleProfileUpdate = async () => {
    if (isDemo) { showDemoBlock(); return; }
    setSaving(true);
    try {
      await update(ref(db, "appConfig/adminProfile"), {
        name: profile.name,
        email: profile.email,
        updatedAt: Date.now(),
      });
      toast({ title: "Profile updated ✅" });
    } catch {
      toast({ title: "Failed to update profile", variant: "destructive" });
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (isDemo) { showDemoBlock(); return; }
    if (passwords.new !== passwords.confirm) {
      toast({ title: "New password and confirm do not match", variant: "destructive" });
      return;
    }
    if (passwords.new.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    // यहाँ आप Firebase Auth के माध्यम से password change implement कर सकते हैं
    // इस example में हम सिर्फ toast दिखा रहे हैं
    toast({ title: "Password change functionality requires Firebase Auth integration" });
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Profile Management</h1>
      <Card className="bg-card border-border">
        <CardContent className="space-y-2">
          <div>
            <Label>Name</Label>
            <Input
              value={profile.name}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
              disabled={isDemo}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={profile.email}
              onChange={e => setProfile({ ...profile, email: e.target.value })}
              disabled={isDemo}
            />
          </div>
          <Button onClick={handleProfileUpdate} disabled={saving || isDemo}>
            {saving ? "Saving..." : "Update Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="space-y-2">
          <h3 className="text-white text-lg font-semibold">Change Password</h3>
          <div>
            <Label>Current Password</Label>
            <Input
              type="password"
              value={passwords.current}
              onChange={e => setPasswords({ ...passwords, current: e.target.value })}
              disabled={isDemo}
            />
          </div>
          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              value={passwords.new}
              onChange={e => setPasswords({ ...passwords, new: e.target.value })}
              disabled={isDemo}
            />
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input
              type="password"
              value={passwords.confirm}
              onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
              disabled={isDemo}
            />
          </div>
          <Button onClick={handlePasswordChange} disabled={isDemo}>
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}