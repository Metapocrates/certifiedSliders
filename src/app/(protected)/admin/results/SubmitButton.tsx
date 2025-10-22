// src/app/(protected)/admin/results/SubmitButton.tsx
"use client";

import { useFormStatus } from "react-dom";
import { type ComponentProps } from "react";

type Props = ComponentProps<"button"> & { pendingText?: string };

export default function SubmitButton({ pendingText = "Working…", children, ...rest }: Props) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} disabled={pending || rest.disabled}>
      {pending ? pendingText : children}
    </button>
  );
}