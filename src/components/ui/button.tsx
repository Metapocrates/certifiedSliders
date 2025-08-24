import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};
export function Button({ className = "", variant = "primary", ...props }: Props) {
  if (variant === "ghost") {
    return (
      <button
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm border border-[var(--border)] text-[var(--foreground)] hover:bg-[color-mix(in_oklab, var(--surface), white 3%)] ${className}`}
        {...props}
      />
    );
  }
  return <button className={`btn ${className}`} {...props} />;
}
