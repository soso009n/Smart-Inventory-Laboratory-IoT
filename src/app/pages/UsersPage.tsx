import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Edit2, Trash2, Loader2, RefreshCcw, AlertTriangle } from "lucide-react";
import axios from "axios";
import Badge from "../components/Badge";
import GlassFormModal, { GlassField } from "../components/GlassFormModal";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../../contexts/AuthContext";

type UserRole = "admin" | "student";

interface User {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

type UserForm = {
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  password?: string;
};

type ApiListResponse<T> = {
  success: boolean;
  data: T[];
  message?: string;
};

type ApiItemResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5555";

const emptyUser: UserForm = {
  full_name: "",
  email: "",
  role: "student",
  is_active: true,
  password: "",
};

const userFields: GlassField<UserForm>[] = [
  {
    key: "full_name",
    label: "Nama Lengkap",
    type: "text",
    required: true,
    placeholder: "Contoh: Ahmad Fauzi",
    colSpan: 2,
  },
  {
    key: "email",
    label: "Email",
    type: "email",
    required: true,
    placeholder: "user@lab.edu",
    colSpan: 2,
  },
  {
    key: "password",
    label: "Password",
    type: "password",
    required: false,
    placeholder: "Isi untuk user baru / ubah password",
    colSpan: 2,
  },
  {
    key: "role",
    label: "Role",
    type: "select",
    required: true,
    colSpan: 1,
    options: [
      { value: "admin", label: "Admin" },
      { value: "student", label: "Student (Praktikan)" },
    ],
  },
  {
    key: "is_active",
    label: "Status",
    type: "select",
    required: true,
    colSpan: 1,
    options: [
      { value: true, label: "Active" },
      { value: false, label: "Inactive" },
    ],
  },
];

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return data?.message ?? data?.error ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export default function UsersPage() {
  const { token, user: currentAuthUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const fetchUsers = useCallback(async () => {
    if (!token) {
      setError("Token tidak tersedia. Silakan login ulang.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await axios.get<ApiListResponse<User>>(`${API_BASE_URL}/api/users`, {
        headers: authHeaders,
      });

      setUsers(res.data.data ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "Gagal mengambil data user"));
    } finally {
      setLoading(false);
    }
  }, [authHeaders, token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAdd = async (data: UserForm) => {
    if (!data.password || data.password.trim().length === 0) {
      alert("Password wajib diisi untuk user baru!");
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const payload = {
        full_name: data.full_name.trim(),
        email: data.email.trim(),
        password: data.password,
        role: data.role,
      };

      const res = await axios.post<ApiItemResponse<User>>(
        `${API_BASE_URL}/api/auth/register`,
        payload
      );

      if (res.data.success) {
        await fetchUsers();
        setIsAddModalOpen(false);
      }
    } catch (err) {
      const message = getErrorMessage(err, "Gagal menambah user");
      setError(message);
      alert(`Gagal menambah user: ${message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async (data: UserForm) => {
    if (!currentUser) return;

    setActionLoading(true);
    setError(null);

    try {
      const payload: UserForm = {
        full_name: data.full_name.trim(),
        email: data.email.trim(),
        role: data.role,
        is_active: Boolean(data.is_active),
      };

      if (data.password && data.password.trim().length > 0) {
        payload.password = data.password;
      }

      await axios.put<ApiItemResponse<User>>(
        `${API_BASE_URL}/api/users/${currentUser.id}`,
        payload,
        {
          headers: authHeaders,
        }
      );

      await fetchUsers();
      setIsEditModalOpen(false);
      setCurrentUser(null);
    } catch (err) {
      const message = getErrorMessage(err, "Gagal update user");
      setError(message);
      alert(`Gagal update user: ${message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUser) return;

    setActionLoading(true);
    setError(null);

    try {
      await axios.delete<ApiItemResponse<User>>(`${API_BASE_URL}/api/users/${currentUser.id}`, {
        headers: authHeaders,
      });

      await fetchUsers();
      setIsDeleteModalOpen(false);
      setCurrentUser(null);
    } catch (err) {
      const message = getErrorMessage(err, "Gagal menghapus user");
      setError(message);
      alert(`Gagal menghapus user: ${message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const q = searchTerm.toLowerCase();

    return user.full_name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
  });

  const editInitialValue: UserForm = currentUser
    ? {
        full_name: currentUser.full_name,
        email: currentUser.email,
        role: currentUser.role,
        is_active: currentUser.is_active,
        password: "",
      }
    : emptyUser;

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-slate-500">Mengambil data user...</p>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Gagal memuat user</h1>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <RefreshCcw className="h-4 w-4" />
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500">Kelola hak akses dan akun laboratorium</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          disabled={actionLoading}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-white shadow-md transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-5 w-5" />
          Add User
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-200"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="rounded-lg border-2 border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama atau email..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-6 py-4 text-left">Full Name</th>
                <th className="px-6 py-4 text-left">Email</th>
                <th className="px-6 py-4 text-left">Role</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    Tidak ada user ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = currentAuthUser?.id === user.id;

                  return (
                    <tr key={user.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-800">{user.full_name}</td>
                      <td className="px-6 py-4 text-slate-500">{user.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant={user.role === "admin" ? "admin" : "student"}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={user.is_active ? "success" : "default"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setCurrentUser(user);
                              setIsEditModalOpen(true);
                            }}
                            disabled={actionLoading}
                            className="rounded p-2 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                            title="Edit user"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setCurrentUser(user);
                              setIsDeleteModalOpen(true);
                            }}
                            disabled={actionLoading || isSelf}
                            className="rounded p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title={isSelf ? "Tidak bisa menghapus akun sendiri" : "Hapus user"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
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
        onClose={() => {
          setIsEditModalOpen(false);
          setCurrentUser(null);
        }}
        mode="edit"
        title="Edit Data User"
        fields={userFields}
        initial={editInitialValue}
        original={currentUser ? editInitialValue : null}
        onSubmit={handleEdit}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCurrentUser(null);
        }}
        onConfirm={handleDelete}
        title="Hapus User"
        message="User ini akan dipindahkan ke arsip (Soft Delete)."
        itemName={currentUser?.full_name}
        danger
        confirmLabel={actionLoading ? "Menghapus..." : "Ya, Hapus"}
      />
    </div>
  );
}