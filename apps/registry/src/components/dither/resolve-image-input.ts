import { loadImage } from "./image-processing";

/**
 * Supported raster inputs for {@link DitherCanvas}.
 * - `string`: image URL (http(s), blob:, data:, or same-origin path)
 * - `CanvasImageSource`: image, bitmap, canvas, video frame drawable, etc.
 * - `ImageData`: raw pixels (drawn to an internal canvas)
 * - `Blob` / `File`: decoded with `createImageBitmap`
 */
export type DitherImageInput =
  | string
  | CanvasImageSource
  | ImageData
  | Blob
  | File;

function imageDataToCanvas(data: ImageData): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = data.width;
  c.height = data.height;
  const ctx = c.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get 2d context for ImageData");
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

/**
 * Normalize any supported input to a `CanvasImageSource` for processing.
 */
export function resolveDitherImageInput(input: DitherImageInput): Promise<CanvasImageSource> {
  if (typeof input === "string") {
    return loadImage(input);
  }
  if (input instanceof ImageData) {
    return Promise.resolve(imageDataToCanvas(input));
  }
  if (input instanceof Blob) {
    return createImageBitmap(input);
  }
  return Promise.resolve(input);
}
