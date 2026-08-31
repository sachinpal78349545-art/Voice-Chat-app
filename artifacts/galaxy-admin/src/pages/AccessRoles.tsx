// src/pages/AccessRoles.tsx
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  UserCheck,
  UserX,
  UserCog,
  Search,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Save,
  X,
} from "lucide-react";

interface ModulePermission {
  module: string;
  all: boolean;
  list: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface Role {
  id: string;
  name: string;
  permissions: ModulePermission[];
  status: "active" | "inactive";
  createdAt: number;
}

// Tingle-style module sections (exactly from your old code)
const MODULES = [
  { section: "USER MANAGEMENT", modules: ["User", "KYC Verification", "Agency", "Coin Trader"] },
  { section: "HOST MANAGEMENT", modules: ["Host Application", "Host"] },
  { section: "ANNOUNCEMENT", modules: ["Announcement"] },
  { section: "LIVE CONTENT", modules: ["Live Stream", "Audio Room", "PK Battle", "Multi Live", "Call Join", "Live History", "Live Banned User"] },
  { section: "CALL MANAGEMENT", modules: ["Call"] },
  { section: "BANNER", modules: ["Splash Banner", "Home Banner", "Gift Banner", "Game Banner"] },
  { section: "CONTENT", modules: ["Social Media", "Songs", "Hashtag"] },
  { section: "ENGAGEMENT", modules: ["Gifts", "Store", "Reaction", "Beauty Effect"] },
  { section: "GAME", modules: ["Game", "Game History"] },
  { section: "LUCKY GIFT", modules: ["Lucky Gift History"] },
  { section: "PACKAGE", modules: ["Coin Plan", "Order History"] },
  { section: "FINANCIAL", modules: ["Payout Method", "Payout Request", "Currency"] },
];

export default function AccessRoles() {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formName, setFormName] = useState("");
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    subadmins: 0,
  });

  // Fetch roles from Firebase
  useEffect(() => {
    const refRoles = ref(db, "accessRoles");
    const unsub = onValue(refRoles, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list: Role[] = Object.keys(data).map((key) => ({
          ...data[key],
          id: key,
        }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRoles(list);
        setFilteredRoles(list);
        calculateStats(list);
      } else {
        setRoles([]);
        setFilteredRoles([]);
        setStats({ total: 0, active: 0, inactive: 0, subadmins: 0 });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const calculateStats = (list: Role[]) => {
    setStats({
      total: list.length,
      active: list.filter((r) => r.status === "active").length,
      inactive: list.filter((r) => r.status === "inactive").length,
      subadmins: 0, // you can fetch subadmins separately if needed
    });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toLowerCase();
    setSearch(q);
    setFilteredRoles(roles.filter((r) => r.name.toLowerCase().includes(q)));
  };

  // Initialize permission array with all modules
  const getDefaultPermissions = () => {
    const perms: ModulePermission[] = [];
    MODULES.forEach((section) =>
      section.modules.forEach((mod) => {
        perms.push({ module: mod, all: false, list: false, create: false, edit: false, delete: false });
      })
    );
    return perms;
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setFormName("");
    setPermissions(getDefaultPermissions());
    setModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormName(role.name);
    // Ensure permissions array has all modules (if some missing, fill with defaults)
    const existing = role.permissions || [];
    const defaultPerms = getDefaultPermissions();
    const merged = defaultPerms.map((def) => {
      const found = existing.find((p) => p.module === def.module);
      return found || def;
    });
    setPermissions(merged);
    setModalOpen(true);
  };

  const handlePermissionChange = (moduleName: string, key: keyof ModulePermission, value: boolean) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module !== moduleName) return p;
        if (key === "all") {
          return { ...p, all: value, list: value, create: value, edit: value, delete: value };
        }
        return { ...p, [key]: value };
      })
    );
  };

  const handleSectionAllChange = (sectionModules: string[], checked: boolean) => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (sectionModules.includes(p.module)) {
          return { ...p, all: checked, list: checked, create: checked, edit: checked, delete: checked };
        }
        return p;
      })
    );
  };

  const saveRole = async () => {
    if (!formName.trim()) {
      toast({ title: "Error", description: "Role name is required", variant: "destructive" });
      return;
    }

    const roleData = {
      name: formName,
      permissions: permissions,
      status: "active" as "active" | "inactive",
      updatedAt: Date.now(),
    };

    try {
      if (editingRole) {
        await update(ref(db, `accessRoles/${editingRole.id}`), roleData);
        toast({ title: "Success", description: "Role updated successfully" });
      } else {
        const newRef = ref(db, `accessRoles/${Date.now()}`);
        await set(newRef, {
          ...roleData,
          createdAt: Date.now(),
        });
        toast({ title: "Success", description: "Role created successfully" });
      }
      setModalOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save role", variant: "destructive" });
    }
  };

  const deleteRole = async (id: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    try {
      await remove(ref(db, `accessRoles/${id}`));
      toast({ title: "Deleted", description: "Role removed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete role", variant: "destructive" });
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await update(ref(db, `accessRoles/${id}`), { status: newStatus });
      toast({ title: `Status updated to ${newStatus}` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const formatDate = (timestamp: number) => {
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
        <div className="text-white text-lg">Loading roles...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Access Roles</h1>
          <p className="text-gray-400 mt-1">Manage staff roles and permission access</p>
        </div>
        <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Roles</p>
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
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active</p>
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
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Inactive</p>
              <p className="text-2xl font-bold text-red-400">{stats.inactive}</p>
            </div>
            <div className="p-2 rounded-full bg-red-500/10">
              <UserX className="h-5 w-5 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Subadmins</p>
              <p className="text-2xl font-bold text-purple-400">{stats.subadmins}</p>
            </div>
            <div className="p-2 rounded-full bg-purple-500/10">
              <UserCog className="h-5 w-5 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by role name..."
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
              <TableHead className="text-gray-400 font-semibold">Created</TableHead>
              <TableHead className="text-gray-400 font-semibold">Updated</TableHead>
              <TableHead className="text-gray-400 font-semibold">Status</TableHead>
              <TableHead className="text-gray-400 font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-gray-400">No roles found</TableCell>
              </TableRow>
            ) : (
              filteredRoles.map((role) => (
                <TableRow key={role.id} className="border-border/40 hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium text-white">{role.name}</TableCell>
                  <TableCell className="text-sm text-gray-300">{formatDate(role.createdAt)}</TableCell>
                  <TableCell className="text-sm text-gray-300">{formatDate(role.updatedAt || role.createdAt)}</TableCell>
                  <TableCell>
                    {role.status === "active" ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">● Active</Badge>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">● Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        onClick={() => openEditModal(role)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                        onClick={() => toggleStatus(role.id, role.status)}
                      >
                        {role.status === "active" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => deleteRole(role.id)}
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
            Showing {filteredRoles.length === 0 ? 0 : 1} to {filteredRoles.length} of {filteredRoles.length} entries
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled className="opacity-50">Previous</Button>
            <Button size="sm" variant="outline" disabled className="opacity-50">Next</Button>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal - Tingle Style */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">
              {editingRole ? "Edit Role" : "Create Role"}
            </DialogTitle>
            <p className="text-gray-400 text-sm">
              This role has access to {permissions.filter(p => p.all || p.list || p.create || p.edit || p.delete).length} modules with various permission levels.
            </p>
          </DialogHeader>

          {/* Role Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Role Name</label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Enter role name..."
              className="bg-background border-border/50"
            />
          </div>

          {/* Permission Matrix */}
          <div className="space-y-6 mt-4">
            {MODULES.map((section) => {
              const sectionModules = section.modules;
              const allChecked = sectionModules.every((mod) => {
                const perm = permissions.find((p) => p.module === mod);
                return perm && perm.all;
              });
              return (
                <div key={section.section} className="border border-border/50 rounded-lg overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">{section.section}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Grant all in section</span>
                      <Checkbox
                        checked={allChecked}
                        onCheckedChange={(checked) => handleSectionAllChange(sectionModules, !!checked)}
                        className="border-gray-600 data-[state=checked]:bg-blue-500"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50 bg-muted/10">
                          <th className="text-left px-4 py-2 text-gray-400 font-medium">Module</th>
                          <th className="text-center px-2 py-2 text-gray-400 font-medium">All</th>
                          <th className="text-center px-2 py-2 text-gray-400 font-medium">List</th>
                          <th className="text-center px-2 py-2 text-gray-400 font-medium">Create</th>
                          <th className="text-center px-2 py-2 text-gray-400 font-medium">Edit</th>
                          <th className="text-center px-2 py-2 text-gray-400 font-medium">Delete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionModules.map((mod) => {
                          const perm = permissions.find((p) => p.module === mod) || {
                            module: mod,
                            all: false,
                            list: false,
                            create: false,
                            edit: false,
                            delete: false,
                          };
                          return (
                            <tr key={mod} className="border-b border-border/30 hover:bg-muted/10">
                              <td className="px-4 py-2 text-white">{mod}</td>
                              <td className="text-center">
                                <Checkbox
                                  checked={perm.all}
                                  onCheckedChange={(checked) => handlePermissionChange(mod, "all", !!checked)}
                                  className="border-gray-600 data-[state=checked]:bg-blue-500"
                                />
                              </td>
                              <td className="text-center">
                                <Checkbox
                                  checked={perm.list}
                                  onCheckedChange={(checked) => handlePermissionChange(mod, "list", !!checked)}
                                  className="border-gray-600 data-[state=checked]:bg-blue-500"
                                />
                              </td>
                              <td className="text-center">
                                <Checkbox
                                  checked={perm.create}
                                  onCheckedChange={(checked) => handlePermissionChange(mod, "create", !!checked)}
                                  className="border-gray-600 data-[state=checked]:bg-blue-500"
                                />
                              </td>
                              <td className="text-center">
                                <Checkbox
                                  checked={perm.edit}
                                  onCheckedChange={(checked) => handlePermissionChange(mod, "edit", !!checked)}
                                  className="border-gray-600 data-[state=checked]:bg-blue-500"
                                />
                              </td>
                              <td className="text-center">
                                <Checkbox
                                  checked={perm.delete}
                                  onCheckedChange={(checked) => handlePermissionChange(mod, "delete", !!checked)}
                                  className="border-gray-600 data-[state=checked]:bg-blue-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={saveRole} className="bg-blue-600 hover:bg-blue-700">
              {editingRole ? "Update Role" : "Create Role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}