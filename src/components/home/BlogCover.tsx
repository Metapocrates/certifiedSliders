"use client";

import Image from "next/image";
import { useState } from "react";

type BlogCoverProps = {
  src: string | null;
  alt: string;
  fill?: boolean;
  className?: string;
  fallbackClassName?: string;
};

export default function BlogCover({ src, alt, fill = false, className = "", fallbackClassName = "" }: BlogCoverProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    if (fill) {
      return (
        <div className={`relative ${className}`}>
          <Image
            src="/brand/logo.png"
            alt={alt}
            fill
            className={`object-contain bg-white p-8 ${fallbackClassName}`}
          />
        </div>
      );
    }
    return (
      <Image
        src="/brand/logo.png"
        alt={alt}
        width={600}
        height={400}
        className={`object-contain bg-white p-8 ${className} ${fallbackClassName}`}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover ${className}`}
        onError={() => setFailed(true)}
        sizes="(max-width: 768px) 100vw, 600px"
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={600}
      height={400}
      className={`object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
