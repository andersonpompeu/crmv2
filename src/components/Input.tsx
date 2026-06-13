import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = "",
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substring(2, 11)}`;
  return (
    <div className="w-full flex flex-col gap-1.5 font-sans">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all ${
            icon ? "pl-10" : ""
          } ${error ? "border-brand-danger focus:border-brand-danger focus:ring-brand-danger/20" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-[11px] text-brand-danger font-medium">{error}</span>}
    </div>
  );
};

export default Input;
