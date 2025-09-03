"use client";

import { useState, useTransition } from "react";
import { uploadAvatar } from "@/app/athletes/actions";

export default function AvatarUploadForm() {
  const [message, setMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        setMessage("");
        startTransition(async () => {
          const res = await uploadAvatar(fd);
          setMessage(res.message);
        });
      }}
      className="space-y-3"
    >
      <input type="file" name="avatar" accept="image/*" className="block w-full text-sm" required />
      <button type="submit" disabled={isPending} className="btn">
        {isPending ? "Uploading..." : "Upload"}
      </button>
      {message && <div className="text-sm mt-1">{message}</div>}
    </form>
  );
}
