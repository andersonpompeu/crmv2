import React, { useEffect, useRef } from "react";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  autoResize?: boolean;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  autoResize = true,
  className = "",
  onChange,
  value,
  id,
  rows = 3,
  ...props
}) => {
  const textAreaId = id || `textarea-${Math.random().toString(36).substring(2, 11)}`;
  const localRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoResize && localRef.current) {
      localRef.current.style.height = "auto";
      localRef.current.style.height = `${Math.min(localRef.current.scrollHeight, 250)}px`;
    }
  }, [value, autoResize]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (autoResize) {
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(e.target.scrollHeight, 250)}px`;
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="w-full flex flex-col gap-1.5 font-sans">
      {label && (
        <label htmlFor={textAreaId} className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <textarea
        id={textAreaId}
        ref={localRef}
        rows={rows}
        onChange={handleTextareaChange}
        value={value}
        className={`w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all ${
          autoResize ? "resize-none overflow-y-auto leading-tight" : ""
        } ${error ? "border-brand-danger focus:border-brand-danger focus:ring-brand-danger/20" : ""} ${className}`}
        {...props}
      />
      {error && <span className="text-[11px] text-brand-danger font-medium">{error}</span>}
    </div>
  );
};

export default TextArea;
