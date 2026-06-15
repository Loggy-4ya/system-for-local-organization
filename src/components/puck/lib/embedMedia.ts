/**
 * @fileoverview YouTube/Vimeo URL parsing and provider-native aspect ratios.
 *
 * Tests: `tests/puck/lib/embedMedia.test.ts` — `npm run test:embed-media`
 *
 * @module src/components/puck/lib/embedMedia
 */

import { MEDIA_ASPECT_RATIO_TOKEN_MAP } from "./mediaAspectRatio";

/** Supported third-party video hosts. */
export type VideoEmbedProvider = "youtube" | "vimeo";

/** Native width÷height for each embed provider (YouTube/Vimeo deliver 16:9 players). */
export const EMBED_PROVIDER_ASPECT_RATIO = MEDIA_ASPECT_RATIO_TOKEN_MAP["16-9"];

/**
 * Extract a YouTube video id from a watch or share URL.
 *
 * @param videoUrl - Raw video URL from sidebar.
 * @returns Eleven-character id or null.
 */
export function extractYouTubeId(videoUrl: string): string | null {
  if (!videoUrl) return null;
  const match = videoUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
  );
  return match?.[1] ?? null;
}

/**
 * Extract a Vimeo video id from a page or player URL.
 *
 * @param videoUrl - Raw video URL from sidebar.
 * @returns Numeric id string or null.
 */
export function extractVimeoId(videoUrl: string): string | null {
  if (!videoUrl) return null;
  const match = videoUrl.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i);
  return match?.[1] ?? null;
}

/**
 * Detect whether a URL is a supported embed host.
 *
 * @param videoUrl - Raw video URL from sidebar.
 * @returns Provider id or null for direct file URLs.
 */
export function getVideoEmbedProvider(videoUrl: string): VideoEmbedProvider | null {
  if (extractYouTubeId(videoUrl)) return "youtube";
  if (extractVimeoId(videoUrl)) return "vimeo";
  return null;
}

/**
 * Resolve the intrinsic aspect ratio for a video URL.
 *
 * Embed hosts are locked to 16:9; direct files fall back to caller-supplied ratio.
 *
 * @param videoUrl - Raw video URL from sidebar.
 * @param fallback - Ratio when URL is a direct file or empty.
 * @returns Width divided by height.
 */
export function getEmbedProviderAspectRatio(
  videoUrl: string,
  fallback: number = EMBED_PROVIDER_ASPECT_RATIO,
): number {
  return getVideoEmbedProvider(videoUrl) ? EMBED_PROVIDER_ASPECT_RATIO : fallback;
}

/**
 * Build an embed iframe URL for YouTube or Vimeo sources.
 *
 * @param videoUrl - Raw video URL from sidebar.
 * @param autoplay - Autoplay flag.
 * @param controls - Show native controls flag.
 * @returns Embed URL or empty string for direct file URLs.
 */
export function getVideoEmbedUrl(
  videoUrl: string,
  autoplay: "no" | "yes",
  controls: "yes" | "no",
): string {
  if (!videoUrl) return "";

  const youTubeId = extractYouTubeId(videoUrl);
  if (youTubeId) {
    return `https://www.youtube.com/embed/${youTubeId}?autoplay=${autoplay === "yes" ? "1" : "0"}&mute=${autoplay === "yes" ? "1" : "0"}&controls=${controls === "yes" ? "1" : "0"}`;
  }

  const vimeoId = extractVimeoId(videoUrl);
  if (vimeoId) {
    return `https://player.vimeo.com/video/${vimeoId}?autoplay=${autoplay === "yes" ? "1" : "0"}&muted=${autoplay === "yes" ? "1" : "0"}`;
  }

  return "";
}

/**
 * Resolve the layout aspect ratio for a video block (embed hosts override sidebar preset).
 *
 * @param videoUrl - Raw video URL.
 * @param preset - Sidebar aspect preset token.
 * @param custom - Custom ratio string when preset is `custom`.
 * @param resolvePreset - Resolver for non-embed URLs.
 * @returns Width divided by height for layout and carousel measurement.
 */
export function resolveVideoDisplayAspectRatio(
  videoUrl: string,
  preset: string | undefined,
  custom: string | undefined,
  resolvePreset: (preset: string | undefined, custom: string | undefined) => number,
): number {
  if (getVideoEmbedProvider(videoUrl)) {
    return EMBED_PROVIDER_ASPECT_RATIO;
  }
  return resolvePreset(preset, custom);
}
