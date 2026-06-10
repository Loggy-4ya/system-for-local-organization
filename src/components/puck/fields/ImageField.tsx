"use client";

/**
 * @fileoverview Custom Puck Field for selecting or uploading an image.
 *
 * Thin wrapper around {@link MediaUploadField} restricted to images.
 *
 * @module src/components/puck/fields/ImageField
 */

import { MediaUploadField } from "./MediaUploadField";

/** Props passed by Puck to the image field renderer. */
interface ImageFieldProps {
  field: { label?: string };
  value: string;
  onChange: (value: string) => void;
}

/**
 * Image-only upload field — delegates to {@link MediaUploadField}.
 *
 * @param props - Puck custom field props.
 * @returns Media upload control limited to images.
 */
export function ImageField(props: ImageFieldProps) {
  return (
    <MediaUploadField
      {...props}
      field={{ ...props.field, accept: "image" }}
    />
  );
}

export default ImageField;
