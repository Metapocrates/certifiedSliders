"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className ?? ""} ${pending ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"}`}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
