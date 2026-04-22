import { useState } from "react";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import Badge from "../components/Badge";
import GlassFormModal, { GlassField } from "../components/GlassFormModal";
import ConfirmModal from "../components/ConfirmModal";

interface User {
  id: number;
  fullName: string;
  email: string;
  role: "Admin" | "Student";
  status: "Active" | "Inactive";
}

type UserForm = Omit<User, "id">;

const mockUsers: User[] = [
  { id: 1, fullName: "Dr. Ir. Bambang Suryanto", email: "bambang.s@lab.edu", role: "Admin", status: "Active" },
  { id: 2, fullName: "Ahmad Fauzi", email: "ahmad.fauzi@student.edu", role: "Student", status: "Active" },
  { id: 3, fullName: "Siti Rahma", email: "siti.rahma@student.edu", role: "Student", status: "Active" },
  { id: 4, fullName: "Budi Santoso", email: "budi.santoso@student.edu", role: "Student", status: "Active" },
  { id: 5, fullName: "Dewi Lestari", email: "dewi.lestari@student.edu", role: "Student", status: "Active" },
  { id: 6, fullName: "Eko Prasetyo", email: "eko.prasetyo@student.edu", role: "Student", status: "Inactive" },
  { id: 7, fullName: "Prof. Dr. Suharto", email: "suharto@lab.edu", role: "Admin", status: "Active" },
];

const emptyUser: UserForm = {
  fullName: "",
  email: "",
  role: "Student",
  status: "Active",
};

const userFields: GlassField<UserForm>[] = [
  { key: "fullName", label: "Nama Lengkap", type: "text", required: true, placeholder: "Contoh: Ahmad Fauzi", colSpan: 2,
    validate: (v) => (String(v).trim().length < 3 ? "Minimal 3 karakter" : null) },
  { key: "email", label: "Email", type: "email", required: true, placeholder: "user@lab.edu", colSpan: 2,
    validate: (v) => (!/^\S+@\S+\.\S+$/.test(String(v)) ? "Format email tidak valid" : null) },
  { key: "role", label: "Role", type: "select", required: true, colSpan: 1,
    options: [
      { value: "Admin", label: "Admin" },
      { value: "Student", label: "Student (Praktikan)" },
    ] },
  { key: "status", label: "Status", type: "select", required: true, colSpan: 1,
    options: [
      { value: "Active", label: "Active" },
      { value: "Inactive", label: "Inactive" },
    ] },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const filteredUsers = users.filter((user) => {
    const q = searchTerm.toLowerCase();
    return user.fullName.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
  });

  const handleAdd = (data: UserForm) => {
    setUsers([...users, { id: Date.now(), ...data }]);
  };

  const handleEdit = (data: UserForm) => {
    if (currentUser) {
      setUsers(users.map((u) => (u.id === currentUser.id ? { ...u, ...data } : u)));
    }
  };

  const handleDelete = () => {
    if (currentUser) {
      setUsers(users.filter((u) => u.id !== currentUser.id));
      setCurrentUser(null);
    }
  };

  const openEdit = (user: User) => {
    setCurrentUser(user);
    setIsEditModalOpen(true);
  };

  const openDelete = (user: User) => {
    setCurrentUser(user);
    setIsDeleteModalOpen(true);
  };

  const currentFormData: UserForm = currentUser
    ? {
        fullName: currentUser.fullName,
        email: currentUser.email,
        role: currentUser.role,
        status: currentUser.status,
      }
    : emptyUser;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">User Management</h1>
          <p className="text-muted-foreground">Manage system users and permissions</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2.5 rounded-lg hover:bg-accent/90 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      <div className="bg-card border-2 border-border rounded-lg shadow-sm">
        <div className="p-4 border-b-2 border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-6 py-3 text-sm">Full Name</th>
                <th className="text-left px-6 py-3 text-sm">Email</th>
                <th className="text-left px-6 py-3 text-sm">Role</th>
                <th className="text-left px-6 py-3 text-sm">Status</th>
                <th className="text-left px-6 py-3 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">{user.fullName}</td>
                  <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                  <td className="px-6 py-4">
                    <Badge variant={user.role === "Admin" ? "admin" : "student"}>{user.role}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.status === "Active" ? "success" : "default"}>{user.status}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDelete(user)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <GlassFormModal<UserForm>
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        mode="create"
        title="Tambah User"
        fields={userFields}
        initial={emptyUser}
        onSubmit={handleAdd}
      />

      <GlassFormModal<UserForm>
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setCurrentUser(null);
        }}
        mode="edit"
        title="Edit User"
        fields={userFields}
        initial={currentFormData}
        original={currentUser ? currentFormData : null}
        onSubmit={handleEdit}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Hapus User"
        message="Yakin ingin menghapus user ini dari sistem?"
        itemName={currentUser?.fullName}
        danger
        confirmLabel="Hapus User"
        successTitle="User berhasil dihapus"
      />
    </div>
  );
}
