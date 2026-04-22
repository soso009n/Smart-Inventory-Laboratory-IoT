import { useState } from "react";
import { RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";

interface DeletedItem {
  id: number;
  itemName: string;
  deletedDate: string;
  deletedBy: string;
}

const mockDeletedItems: DeletedItem[] = [
  { id: 1, itemName: "IR Sensor Module", deletedDate: "2026-04-15", deletedBy: "Dr. Bambang Suryanto" },
  { id: 2, itemName: "LCD Display 16x2 (Broken)", deletedDate: "2026-04-10", deletedBy: "Dr. Bambang Suryanto" },
  { id: 3, itemName: "Breadboard 400 Points (Damaged)", deletedDate: "2026-04-05", deletedBy: "Prof. Dr. Suharto" },
  { id: 4, itemName: "Jumper Wires Set (Incomplete)", deletedDate: "2026-03-28", deletedBy: "Dr. Bambang Suryanto" },
];

export default function TrashPage() {
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>(mockDeletedItems);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isPermanentDeleteModalOpen, setIsPermanentDeleteModalOpen] = useState(false);
  const [itemTarget, setItemTarget] = useState<DeletedItem | null>(null);

  const openRestore = (item: DeletedItem) => {
    setItemTarget(item);
    setIsRestoreModalOpen(true);
  };

  const openPermanentDelete = (item: DeletedItem) => {
    setItemTarget(item);
    setIsPermanentDeleteModalOpen(true);
  };

  const handleRestore = () => {
    if (itemTarget) setDeletedItems(deletedItems.filter((i) => i.id !== itemTarget.id));
  };

  const handlePermanentDelete = () => {
    if (itemTarget) setDeletedItems(deletedItems.filter((i) => i.id !== itemTarget.id));
  };

  return (
    <div className="space-y-6">
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl text-red-900 mb-1">Trash / Deleted Data</h1>
            <p className="text-red-700">
              Items in trash can be restored or permanently deleted. Warning: Permanent deletion cannot be undone!
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border-2 border-border rounded-lg shadow-sm">
        {deletedItems.length === 0 ? (
          <div className="p-12 text-center">
            <Trash2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No deleted items</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-6 py-3 text-sm">Item Name</th>
                  <th className="text-left px-6 py-3 text-sm">Deleted Date</th>
                  <th className="text-left px-6 py-3 text-sm">Deleted By</th>
                  <th className="text-left px-6 py-3 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deletedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">{item.itemName}</td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">{item.deletedDate}</td>
                    <td className="px-6 py-4 text-muted-foreground">{item.deletedBy}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openRestore(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-700 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-lg transition-colors shadow-sm"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </button>
                        <button
                          onClick={() => openPermanentDelete(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        onConfirm={handleRestore}
        title="Pulihkan Data"
        message="Yakin ingin memulihkan item ini? Data akan kembali ke halaman aktif."
        itemName={itemTarget?.itemName}
        confirmLabel="Restore"
        successTitle="Data berhasil dipulihkan"
      />

      <ConfirmModal
        isOpen={isPermanentDeleteModalOpen}
        onClose={() => setIsPermanentDeleteModalOpen(false)}
        onConfirm={handlePermanentDelete}
        title="Hapus Permanen"
        message="Yakin ingin menghapus item ini secara permanen? Data akan hilang selamanya dan tidak dapat dipulihkan!"
        itemName={itemTarget?.itemName}
        danger
        confirmLabel="Hapus Permanen"
        successTitle="Data dihapus permanen"
      />
    </div>
  );
}
