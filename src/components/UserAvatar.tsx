"use client";

import Image from "next/image";
import { useState } from "react";

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
  unoptimized?: boolean;
}

export default function UserAvatar({
  src,
  alt = "Avatar",
  size = 32,
  className = "",
  unoptimized = false,
}: UserAvatarProps) {
  const [imgSrc, setImgSrc] = useState(src || "/runner-default.png");
  const [hasError, setHasError] = useState(false);

  // If no src or already errored, use default
  const imageUrl = !src || hasError ? "/runner-default.png" : imgSrc;

  return (
    <div
      className={`relative overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={imageUrl}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-cover"
        unoptimized={unoptimized}
        onError={() => {
          if (!hasError) {
            setHasError(true);
            setImgSrc("/runner-default.png");
          }
        }}
      />
    </div>
  );
}
