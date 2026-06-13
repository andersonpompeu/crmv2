import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "outline" | "ghost" | "whatsapp";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  children,
  className = "",
  type = "button",
  ...props
}) => {
  const baseStyle = "inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-all duration-200 active:scale-98 focus:outline-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 font-sans";
  
  const variants = {
    primary: "bg-brand-primary text-white hover:bg-brand-primary-hover shadow-xs border border-brand-primary/10",
    secondary: "bg-brand-secondary text-white hover:bg-sky-600 shadow-xs border border-brand-secondary/10",
    success: "bg-brand-success text-white hover:bg-emerald-600 shadow-xs border border-brand-success/10",
    warning: "bg-brand-warning text-white hover:bg-amber-600 shadow-xs border border-brand-warning/10",
    danger: "bg-brand-danger text-white hover:bg-red-600 shadow-xs border border-brand-danger/10",
    outline: "bg-transparent border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800",
    ghost: "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300",
    whatsapp: "bg-whatsapp text-white hover:bg-[#0f7368] shadow-xs"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base"
  };

  return (
    <button
      type={type}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
