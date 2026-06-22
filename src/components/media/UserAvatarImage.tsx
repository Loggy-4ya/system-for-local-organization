"use client";

/**
 * @fileoverview Circular user avatar — profile photo or Lucide User fallback.
 *
 * Used wherever institution member avatars render without emoji placeholders.
 *
 * @module src/components/media/UserAvatarImage
 */

import Image from "next/image";
import { User } from "lucide-react";
import { siteChromeLucideProps } from "@/components/global-layout/resolveLucideIcon";
import { cn } from "@/lib/utils";

/** Props for {@link UserAvatarImage}. */
export interface UserAvatarImageProps {
  /** Public avatar URL; empty shows the User icon fallback. */
  src?: string | null;
  /** Accessible name for the photo; omit when decorative. */
  alt?: string;
  /** Pixel width and height of the circle. */
  size?: number;
  /** Optional className on the outer frame. */
  className?: string;
}

/**
 * Render a member avatar photo inside the accent ring, or a Lucide User icon when unset.
 *
 * @param props - Source URL, size, and labelling.
 * @returns Avatar frame JSX.
 */
export function UserAvatarImage({
  src,
  alt = "",
  size = 64,
  className,
}: UserAvatarImageProps) {
  const safeSrc = src?.trim() ?? "";

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-full border-2 border-[var(--color-accent-user)] bg-[var(--color-bg-elevated)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {safeSrc ? (
        <Image
          src={safeSrc}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized={safeSrc.startsWith("/uploads/") || safeSrc.startsWith("blob:")}
        />
      ) : (
        <span
          aria-hidden={alt ? undefined : true}
          className="flex h-full w-full items-center justify-center bg-[var(--color-accent-user)]/20"
        >
          <User
            {...siteChromeLucideProps({
              size: Math.round(size * 0.42),
              className: "text-[var(--color-text-secondary)]",
            })}
          />
        </span>
      )}
    </div>
  );
}

export default UserAvatarImage;
