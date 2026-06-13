import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  title,
  subtitle,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden transition-all duration-200 ${className}`}
      {...props}
    >
      {(header || title || subtitle) && (
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-col gap-1 bg-slate-50/50 dark:bg-slate-900/30">
          {header ? (
            header
          ) : (
            <>
              {title && <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight font-display">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">{subtitle}</p>}
            </>
          )}
        </div>
      )}
      {children && <div className="p-5">{children}</div>}
      {footer && (
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10 flex justify-end gap-2.5">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
