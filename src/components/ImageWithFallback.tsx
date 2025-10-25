"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";

export default function ImageWithFallback({ className = "", ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);

  const safeClass = failed
    ? `object-contain bg-white p-6 ${className}`
    : className;

  return (
    <Image
      {...props}
      className={safeClass}
      onError={() => {
        if (!failed) setFailed(true);
      }}
      src={failed ? "/brand/logo.png" : props.src}
      alt={props.alt}
      unoptimized
    />
  );
}
