import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, Loader2 } from "lucide-react";
import axios from "axios";
import Badge from "../components/Badge";
import GlassFormModal, { GlassField } from "../components/GlassFormModal";
import ConfirmModal from "../components/ConfirmModal";

// 1. Sesuaikan Interface dengan Skema Database (Snake Case)
interface User {
  id: number;
  full_name: string;
  email: string;
  role: "admin" | "student";
  is_active: boolean;
}

type UserForm = Omit<User, "id"> & { password?: string };

const emptyUser: UserForm = {
  full_name: "",
  email: "",
  role: "student",
  is_active: true,
  password: ""
};

// 2. Sesuaikan Fields Modal
const userFields: GlassField<UserForm>[] = [
  { key: "full_name", label: "Nama Lengkap", type: "text", required: true, placeholder: "Contoh: Ahmad Fauzi", colSpan: 2 },
  { key: "email", label: "Email", type: "email", required: true, placeholder: "user@lab.edu", colSpan: 2 },
  { key: "password", label: "Password (Isi jika user baru)", type: "password", required: false, colSpan: 2 },
  { key: "role", label: "Role", type: "select", required: true, colSpan: 1,
    options: [
      { value: "admin", label: "Admin" },
      { value: "student", label: "Student (Praktikan)" },
    ] },
  { key: "is_active", label: "Status", type: "select", required: true, colSpan: 1,
    options: [
      { value: true, label: "Active" },
      { value: false, label: "Inactive" },
    ] },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 3. Ambil Data dari Backend saat halaman dibuka
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5555/api/users");
      setUsers(res.data.data);
    } catch (err) {
      console.error("Gagal mengambil data user:", err);
    } finally {
      setLoading(false);
    }
  };

  // 4. CRUD Handlers menggunakan API
 const handleAdd = async (data: UserForm) => {
  try {
    // Pastikan password tidak kosong sebelum dikirim
    if (!data.password) {
      alert("Password wajib diisi untuk user baru!");
      return;
    }

    const res = await axios.post("http://localhost:5555/api/auth/register", data);
    
    if (res.data.success) {
      fetchUsers(); // Refresh tabel
      setIsAddModalOpen(false); // Tutup modal
    }
  } catch (err: any) {
    // Menampilkan pesan error asli dari Backend (misal: "Email sudah terdaftar")
    const errorMsg = err.response?.data?.message || "Terjadi kesalahan pada server";
    console.error("Detail Error:", err.response?.data);
    alert("Gagal menambah user: " + errorMsg);
  }
};

  const handleEdit = async (data: UserForm) => {
    if (currentUser) {
      try {
        await axios.put(`http://localhost:5555/api/users/${currentUser.id}`, data);
        fetchUsers();
        setIsEditModalOpen(false);
      } catch (err) { alert("Gagal update user"); }
    }
  };

  const handleDelete = async () => {
    if (currentUser) {
      try {
        await axios.delete(`http://localhost:5555/api/users/${currentUser.id}`);
        fetchUsers();
        setIsDeleteModalOpen(false);
      } catch (err) { alert("Gagal menghapus user"); }
    }
  };

  const filteredUsers = users.filter((user) => {
    const q = searchTerm.toLowerCase();
    return user.full_name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <p className="text-slate-500">Mengambil data user...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500">Kelola hak akses dan akun laboratorium</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      <div className="bg-white border-2 border-slate-100 rounded-lg shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama atau email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="text-left px-6 py-4">Full Name</th>
                <th className="text-left px-6 py-4">Email</th>
                <th className="text-left px-6 py-4">Role</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="text-left px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{user.full_name}</td>
                  <td className="px-6 py-4 text-slate-500">{user.email}</td>
                  <td className="px-6 py-4">
                    <Badge variant={user.role === "admin" ? "admin" : "student"}>{user.role}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.is_active ? "success" : "default"}>{user.is_active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setCurrentUser(user); setIsEditModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setCurrentUser(user); setIsDeleteModalOpen(true); }} className="p-2 text-red-600 hover:bg-red-50 rounded">
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
        title="Tambah User Baru"
        fields={userFields}
        initial={emptyUser}
        onSubmit={handleAdd}
      />

      <GlassFormModal<UserForm>
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        mode="edit"
        title="Edit Data User"
        fields={userFields}
        initial={currentUser ? { full_name: currentUser.full_name, email: currentUser.email, role: currentUser.role, is_active: currentUser.is_active } : emptyUser}
        onSubmit={handleEdit}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Hapus User"
        message="User ini akan dipindahkan ke arsip (Soft Delete)."
        itemName={currentUser?.full_name}
        danger
        confirmLabel="Ya, Hapus"
      />
    </div>
  );
}