import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import GlassModal from "./GlassModal";
import { useToast } from "./Toast";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  danger?: boolean;
  confirmLabel?: string;
  successTitle?: string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  danger = false,
  confirmLabel,
  successTitle,
}: ConfirmModalProps) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBusy(false);
      setDone(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 750));
    onConfirm();
    setBusy(false);
    setDone(true);
    showToast({
      type: danger ? "error" : "success",
      title: successTitle || (danger ? "Data dihapus permanen" : "Tindakan dikonfirmasi"),
      description: itemName,
    });
    setTimeout(() => onClose(), 700);
  };

  const btnGradient = danger
    ? "from-rose-500 to-red-700 shadow-[0_8px_24px_-8px_rgba(244,63,94,0.7)]"
    : "from-[#3498DB] to-[#2C3E50] shadow-[0_8px_24px_-8px_rgba(52,152,219,0.7)]";

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={title}
      size="sm"
    >
      <div className="space-y-4">
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur ${
            danger
              ? "bg-rose-50/70 border-rose-200/80"
              : "bg-amber-50/70 border-amber-200/80"
          }`}
        >
          <AlertTriangle
            className={`w-6 h-6 flex-shrink-0 mt-0.5 ${danger ? "text-rose-600" : "text-amber-600"}`}
          />
          <div>
            <p className={danger ? "text-rose-900" : "text-amber-900"}>{message}</p>
            {danger && (
              <p className="text-sm text-rose-700 mt-2">
                ⚠️ Tindakan ini tidak dapat dibatalkan!
              </p>
            )}
          </div>
        </div>

        {itemName && (
          <div className="p-4 rounded-xl border border-white/70 bg-white/60 backdrop-blur">
            <p className="text-sm text-slate-500">Item:</p>
            <p className="mt-1 text-slate-900">{itemName}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-white/60 border border-white/70 text-slate-700 hover:bg-white/80 transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <motion.button
            type="button"
            onClick={handleConfirm}
            disabled={busy || done}
            whileTap={{ scale: busy || done ? 1 : 0.96 }}
            animate={{
              width: busy || done ? 48 : "auto",
              borderRadius: busy || done ? 24 : 8,
            }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className={`relative h-11 px-5 flex items-center justify-center gap-2 bg-gradient-to-br ${btnGradient} text-white overflow-hidden disabled:opacity-60`}
          >
            <AnimatePresence mode="wait">
              {done ? (
                <motion.span key="d" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Check className="w-5 h-5" />
                </motion.span>
              ) : busy ? (
                <motion.span key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Loader2 className="w-5 h-5 animate-spin" />
                </motion.span>
              ) : (
                <motion.span
                  key="i"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  {danger ? <Trash2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  {confirmLabel || (danger ? "Hapus Permanen" : "Konfirmasi")}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </GlassModal>
  );
}
