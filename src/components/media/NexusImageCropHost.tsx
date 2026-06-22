"use client";

/**
 * @fileoverview Root layout mount for the app-wide image crop dialog.
 *
 * @module src/components/media/NexusImageCropHost
 */

import { useEffect, useState } from "react";
import { NexusImageCropDialog } from "./NexusImageCropDialog";
import {
  registerImageCropHost,
  unregisterImageCropHost,
  type ImageCropHostRequest,
} from "./imageCropHostState";

/**
 * Singleton host — mount once in the root layout so any upload surface can open the cropper.
 *
 * @returns Crop dialog bound to imperative {@link openImageCropDialog} requests.
 */
export function NexusImageCropHost() {
  const [request, setRequest] = useState<ImageCropHostRequest | null>(null);

  useEffect(() => {
    registerImageCropHost(setRequest);
    return () => unregisterImageCropHost();
  }, []);

  return <NexusImageCropDialog request={request} />;
}

export default NexusImageCropHost;
