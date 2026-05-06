interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "admin" | "student";
  className?: string;
}

export default function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const variants = {
    default: "bg-gray-100 text-gray-700 border-gray-300",
    success: "bg-emerald-100 text-emerald-700 border-emerald-300",
    warning: "bg-orange-100 text-orange-700 border-orange-300",
    danger: "bg-red-100 text-red-700 border-red-300",
    info: "bg-sky-100 text-sky-700 border-sky-300",
    admin: "bg-slate-100 text-slate-700 border-slate-400",
    student: "bg-blue-100 text-blue-700 border-blue-300",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs border font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
