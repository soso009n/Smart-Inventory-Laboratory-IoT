import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, Loader2, ArrowRight, Sparkles, Plus } from "lucide-react";
import GlassModal from "./GlassModal";
import { useToast } from "./Toast";

// 1. Pastikan "password" ada di sini
export type FieldType = "text" | "email" | "number" | "date" | "select" | "textarea" | "password";

export interface GlassField<T = any> {
  key: keyof T & string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  // 2. Ubah value agar bisa menerima string, number, atau boolean
  options?: { value: string | number | boolean; label: string }[];
  colSpan?: 1 | 2;
  validate?: (value: any, all: T) => string | null;
}

interface Props<T extends Record<string, any>> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  mode: "create" | "edit";
  fields: GlassField<T>[];
  initial: T;
  original?: T | null;
  onSubmit: (data: T) => void;
  submitLabel?: string;
  successTitle?: string;
}

export default function GlassFormModal<T extends Record<string, any>>({
  isOpen,
  onClose,
  title,
  subtitle,
  mode,
  fields,
  initial,
  original,
  onSubmit,
  submitLabel,
  successTitle,
}: Props<T>) {
  const { showToast } = useToast();
  const [form, setForm] = useState<T>(initial);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initial);
      setSaving(false);
      setDone(false);
    }
  }, [isOpen, initial]);

  const errors = useMemo(() => {
    const out: Record<string, string | null> = {};
    for (const f of fields) {
      const val = (form as any)[f.key];
      if (f.required && (val === "" || val === null || val === undefined)) {
        out[f.key] = "Wajib diisi";
        continue;
      }
      out[f.key] = f.validate ? f.validate(val, form) : null;
    }
    return out;
  }, [form, fields]);

  const diffs = useMemo(() => {
    if (mode !== "edit" || !original) return [] as string[];
    return fields
      .map((f) => f.key)
      .filter((k) => String((form as any)[k]) !== String((original as any)[k]));
  }, [form, original, fields, mode]);

  const hasErrors = Object.values(errors).some((e) => !!e);
  const canSubmit =
    !hasErrors && !saving && (mode === "create" || diffs.length > 0);

  const update = (k: string, v: any) => setForm({ ...form, [k]: v });

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    // Simulasi loading sebentar agar UX terasa nyata
    await new Promise((r) => setTimeout(r, 950));
    onSubmit(form);
    setSaving(false);
    setDone(true);
    showToast({
      type: "success",
      title: successTitle || (mode === "edit" ? "Data berhasil diperbarui" : "Data berhasil ditambahkan"),
      description:
        mode === "edit"
          ? `${diffs.length} field diubah`
          : "Entri baru tersimpan ke sistem",
    });
    setTimeout(() => {
      onClose();
    }, 850);
  };

  const showComparison = mode === "edit" && !!original;

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={title}
      subtitle={subtitle || (mode === "edit" ? "Perubahan divalidasi real-time" : "Isi data dengan validasi real-time")}
      size={showComparison ? "xl" : "lg"}
    >
      <div className={`grid gap-6 ${showComparison ? "md:grid-cols-5" : "grid-cols-1"}`}>
        <div className={`${showComparison ? "md:col-span-3" : ""} grid grid-cols-2 gap-4`}>
          {fields.map((f) => {
            const value = (form as any)[f.key];
            const err = errors[f.key];
            const changed =
              showComparison && String(value) !== String((original as any)[f.key]);
            const hasValue = value !== "" && value !== null && value !== undefined;
            const valid = !err && hasValue;
            const span = f.colSpan === 1 ? "col-span-2 md:col-span-1" : "col-span-2";
            return (
              <div className={span} key={f.key}>
                <FieldRow
                  field={f}
                  value={value}
                  error={err}
                  changed={changed}
                  valid={valid}
                  onChange={(v) => update(f.key, v)}
                />
              </div>
            );
          })}
        </div>

        {showComparison && (
          <div className="md:col-span-2">
            <div className="sticky top-0 rounded-xl border border-white/60 bg-white/50 backdrop-blur-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[#3498DB]" />
                <p className="text-sm text-slate-700 font-bold">Perbandingan Perubahan</p>
              </div>
              {diffs.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center italic">Belum ada perubahan</p>
              ) : (
                <div className="space-y-3">
                  {diffs.map((k) => {
                    const meta = fields.find((f) => f.key === k)!;
                    return (
                      <div key={k} className="rounded-lg bg-white/70 border border-white/80 p-3 shadow-sm">
                        <p className="text-xs text-slate-500 mb-1.5 font-bold uppercase">{meta.label}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="px-2 py-1 rounded-md bg-rose-100 text-rose-700 line-through truncate max-w-[7rem]">
                            {String((original as any)[k]) || "—"}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 font-bold truncate max-w-[7rem]">
                            {String((form as any)[k]) || "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className={`${showComparison ? "md:col-span-5" : ""} flex items-center justify-between pt-4 border-t border-white/60`}>
          <p className="text-sm text-slate-600 font-medium italic">
            {mode === "edit"
              ? diffs.length > 0
                ? `${diffs.length} perubahan siap disimpan`
                : "Tidak ada perubahan"
              : hasErrors
              ? "Lengkapi data terlebih dahulu"
              : "Siap untuk disimpan"}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg bg-white/60 border border-white/70 text-slate-700 hover:bg-white/80 transition-all disabled:opacity-50"
            >
              Batal
            </button>
            <SmartSaveButton
              mode={mode}
              disabled={!canSubmit}
              saving={saving}
              done={done}
              onClick={handleSubmit}
              submitLabel={submitLabel}
            />
          </div>
        </div>
      </div>
    </GlassModal>
  );
}

function FieldRow({
  field,
  value,
  error,
  changed,
  valid,
  onChange,
}: {
  field: GlassField;
  value: any;
  error: string | null;
  changed: boolean;
  valid: boolean;
  onChange: (v: any) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  const showErr = touched && !!error;
  const showValid = touched && valid;

  const borderClass = showErr
    ? "border-rose-400 ring-rose-200/60"
    : focused
    ? "border-[#3498DB] ring-[#3498DB]/30"
    : changed
    ? "border-emerald-400 ring-emerald-200/40"
    : "border-white/70 ring-transparent";

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm text-slate-800 font-semibold">{field.label}</span>
        {field.required && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3498DB] opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3498DB]" />
          </span>
        )}
      </div>
      <div className="relative">
        <motion.div
          animate={{ scale: focused ? 1.01 : 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`relative rounded-lg bg-white/70 backdrop-blur border-2 ring-4 transition-all duration-300 ${borderClass}`}
        >
          {field.type === "select" ? (
            <select
              value={String(value ?? "")} // Konversi ke string untuk element HTML
              onChange={(e) => {
                const val = e.target.value;
                // Mengembalikan tipe data asli jika boolean/number
                let finalVal: any = val;
                if (val === "true") finalVal = true;
                if (val === "false") finalVal = false;
                if (!isNaN(Number(val)) && val !== "" && typeof value === 'number') finalVal = Number(val);
                
                onChange(finalVal);
                setTouched(true);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                setTouched(true);
              }}
              className="w-full px-4 py-2.5 bg-transparent focus:outline-none rounded-lg appearance-none cursor-pointer"
            >
              {field.options?.map((o) => (
                <option key={String(o.value)} value={String(o.value)}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : field.type === "textarea" ? (
            <textarea
              value={value ?? ""}
              placeholder={field.placeholder}
              rows={3}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                setTouched(true);
              }}
              className="w-full px-4 py-2.5 pr-10 bg-transparent focus:outline-none rounded-lg resize-none"
            />
          ) : (
            <input
              type={field.type}
              value={value ?? ""}
              placeholder={field.placeholder}
              onChange={(e) =>
                onChange(field.type === "number" ? Number(e.target.value) : e.target.value)
              }
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                setTouched(true);
              }}
              className="w-full px-4 py-2.5 pr-10 bg-transparent focus:outline-none rounded-lg"
            />
          )}

          <div className="absolute right-3 top-3 pointer-events-none">
            <AnimatePresence mode="wait">
              {showErr ? (
                <motion.div
                  key="x"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </motion.div>
              ) : showValid ? (
                <motion.div
                  key="v"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center"
                >
                  <Check className="w-3 h-3" />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>

        <AnimatePresence>
          {showErr && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs text-rose-600 mt-1.5 font-bold"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SmartSaveButton({
  mode,
  disabled,
  saving,
  done,
  onClick,
  submitLabel,
}: {
  mode: "create" | "edit";
  disabled: boolean;
  saving: boolean;
  done: boolean;
  onClick: () => void;
  submitLabel?: string;
}) {
  const label = submitLabel || (mode === "edit" ? "Simpan Perubahan" : "Tambah Data");
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: saving || done ? 1 : 0.96 }}
      animate={{
        width: saving || done ? 48 : "auto",
        borderRadius: saving || done ? 24 : 8,
      }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="relative h-11 px-6 flex items-center justify-center gap-2 bg-gradient-to-br from-[#3498DB] to-[#2C3E50] text-white shadow-[0_8px_24px_-8px_rgba(52,152,219,0.7)] disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden font-bold"
    >
      <AnimatePresence mode="wait">
        {done ? (
          <motion.span
            key="done"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
          >
            <Check className="w-5 h-5" />
          </motion.span>
        ) : saving ? (
          <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Loader2 className="w-5 h-5 animate-spin" />
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            {mode === "edit" ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}