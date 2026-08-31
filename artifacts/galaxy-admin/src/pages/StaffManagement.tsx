// src/pages/StaffManagement.tsx
import { useState, useEffect } from "react";
import { ref, onValue, set, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";

interface Staff {
  uid: string;
  name: string;
  email: string;
  role: string;
  createdAt: number;
  lastLoginAt?: number | null;
  lastLoginIP?: string | null;
  status: "active" | "inactive";
}

// Available roles (mirroring the ones in AccessRoles)
const AVAILABLE_ROLES = [
  "Agency Creator",
  "User Manager",
  "Finance Manager",
  "Content Manager",
  "Store Manager",
  "Gift Manager",
  "SVGA Asset Manager",
  "Story Manager",
  "Super Admin", // optional
];

export default function StaffManagement() {
  const { toast } = useToast();
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [filteredStaffs, setFilteredStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "User Manager",
    password: "",
    status: "active" as "active" | "inactive",
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  // Fetch staff from Firebase
  useEffect(() => {
    const staffRef = ref(db, "staff");
    const unsub = onValue(staffRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list: Staff[] = Object.keys(data).map((key) => ({
          ...data[key],
          uid: key,
        }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setStaffs(list);
        setFilteredStaffs(list);
        calculateStats(list);
      } else {
        setStaffs([]);
        setFilteredStaffs([]);
        setStats({ total: 0, active: 0, inactive: 0 });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const calculateStats = (list: Staff[]) => {
    setStats({
      total: list.length,
      active: list.filter((s) => s.status === "active").length,
      inactive: list.filter((s) => s.status === "inactive").length,
    });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toLowerCase();
    setSearch(q);
    setFilteredStaffs(
      staffs.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      )
    );
  };

  const openCreateModal = () => {
    setEditingStaff(null);
    setFormData({
      name: "",
      email: "",
      role: "User Manager",
      password: "",
      status: "active",
    });
    setModalOpen(true);
  };

  const openEditModal = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      role: staff.role,
      password: "", // password not stored, so leave empty
      status: staff.status,
    });
    setModalOpen(true);
  };

  const saveStaff = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.role) {
      toast({
        title: "Error",
        description: "Name, Email, and Role are required",
        variant: "destructive",
      });
      return;
    }

    // For new staff, require password
    if (!editingStaff && !formData.password.trim()) {
      toast({
        title: "Error",
        description: "Password is required for new staff",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingStaff) {
        // Update existing staff (exclude password, uid, createdAt)
        await update(ref(db, `staff/${editingStaff.uid}`), {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          updatedAt: Date.now(),
        });
        toast({ title: "Success", description: "Staff updated successfully" });
      } else {
        // Create new staff
        await set(ref(db, `staff/${Date.now()}`), {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          createdAt: Date.now(),
          lastLoginAt: null,
          lastLoginIP: null,
          // we don't store password in plain text in real apps; this is just for demo
          // you may want to hash it or use Firebase Auth
        });
        toast({ title: "Success", description: "Staff created successfully" });
      }
      setModalOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save staff",
        variant: "destructive",
      });
    }
  };

  const deleteStaff = async (uid: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;
    try {
      await remove(ref(db, `staff/${uid}`));
      toast({ title: "Deleted", description: "Staff removed" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete staff",
        variant: "destructive",
      });
    }
  };

  const toggleStatus = async (uid: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await update(ref(db, `staff/${uid}`), { status: newStatus });
      toast({ title: `Status updated to ${newStatus}` });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-lg">Loading staff...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Staff</h1>
          <p className="text-gray-400 mt-1">Manage staff users and role-based accounts</p>
        </div>
        <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Staff
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Staff</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="p-2 rounded-full bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active Staff</p>
              <p className="text-2xl font-bold text-green-400">{stats.active}</p>
            </div>
            <div className="p-2 rounded-full bg-green-500/10">
              <UserCheck className="h-5 w-5 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Inactive Staff</p>
              <p className="text-2xl font-bold text-red-400">{stats.inactive}</p>
            </div>
            <div className="p-2 rounded-full bg-red-500/10">
              <UserX className="h-5 w-5 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by staff name, email..."
          value={search}
          onChange={handleSearch}
          className="pl-10 bg-background border-border/50 focus:border-blue-500/50"
        />
      </div>

      {/* Table */}
      <div className="bg-card/50 border border-border/50 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-gray-400 font-semibold">Name</TableHead>
              <TableHead className="text-gray-400 font-semibold">Email</TableHead>
              <TableHead className="text-gray-400 font-semibold">Role</TableHead>
              <TableHead className="text-gray-400 font-semibold">Last Login</TableHead>
              <TableHead className="text-gray-400 font-semibold">IP</TableHead>
              <TableHead className="text-gray-400 font-semibold">Status</TableHead>
              <TableHead className="text-gray-400 font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaffs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-gray-400">
                  No staff found
                </TableCell>
              </TableRow>
            ) : (
              filteredStaffs.map((member) => (
                <TableRow
                  key={member.uid}
                  className="border-border/40 hover:bg-muted/20 transition-colors"
                >
                  <TableCell className="font-medium text-white">{member.name}</TableCell>
                  <TableCell className="text-gray-300">{member.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-300">
                    {formatDate(member.lastLoginAt)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-300">
                    {member.lastLoginIP || "-"}
                  </TableCell>
                  <TableCell>
                    {member.status === "active" ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        ● Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                        ● Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        onClick={() => openEditModal(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                        onClick={() => toggleStatus(member.uid, member.status)}
                      >
                        {member.status === "active" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => deleteStaff(member.uid)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="border-t border-border/50 px-6 py-3 flex items-center justify-between bg-muted/10">
          <div className="text-sm text-gray-400">
            Showing {filteredStaffs.length === 0 ? 0 : 1} to {filteredStaffs.length} of {filteredStaffs.length} entries
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled className="opacity-50">Previous</Button>
            <Button size="sm" variant="outline" disabled className="opacity-50">Next</Button>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">
              {editingStaff ? "Edit Staff" : "Create Staff"}
            </DialogTitle>
            <p className="text-gray-400 text-sm">
              {editingStaff ? "Update staff member details" : "Add a new staff member with role-based access"}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Full Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name..."
                className="bg-background border-border/50"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address..."
                className="bg-background border-border/50"
                type="email"
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Role</label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="bg-background border-border/50">
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {AVAILABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Password (only for new staff) */}
            {!editingStaff && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Temporary Password</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter temporary password..."
                  className="bg-background border-border/50"
                />
              </div>
            )}

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Status</label>
              <Select
                value={formData.status}
                onValueChange={(value: "active" | "inactive") =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger className="bg-background border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveStaff} className="bg-blue-600 hover:bg-blue-700">
              {editingStaff ? "Update Staff" : "Create Staff"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}