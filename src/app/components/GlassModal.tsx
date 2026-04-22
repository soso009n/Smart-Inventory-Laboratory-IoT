import { useEffect, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export default function GlassModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = "lg",
}: GlassModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-md"
          />

          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className={`relative w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col rounded-2xl overflow-hidden`}
          >
            {/* Outer glow */}
            <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-br from-[#3498DB]/60 via-[#5dade2]/30 to-[#2C3E50]/60 blur-md opacity-80 pointer-events-none" />
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-[#3498DB] via-[#5dade2] to-[#2C3E50] opacity-70 pointer-events-none" />

            {/* Glass panel */}
            <div className="relative flex-1 flex flex-col rounded-2xl bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_30px_80px_-20px_rgba(44,62,80,0.45)] overflow-hidden">
              {/* Subtle sheen */}
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />

              <div className="relative flex items-start justify-between px-7 pt-6 pb-4 border-b border-white/50">
                <div>
                  <h2 className="text-xl text-slate-900">{title}</h2>
                  {subtitle && (
                    <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-white/40 hover:bg-white/70 border border-white/60 transition-all"
                >
                  <X className="w-4 h-4 text-slate-700" />
                </button>
              </div>

              <div className="relative flex-1 overflow-y-auto px-7 py-6">{children}</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
