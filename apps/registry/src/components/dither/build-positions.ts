import type { DitherAlgorithm, DitherOptions } from "./dither-algorithms";
import {
  bayerDither,
  blueNoiseDither,
  floydSteinberg,
  generateBlueNoise,
  invertWithMask,
} from "./dither-algorithms";
import type { ProcessedImage } from "./image-processing";

export function buildDitherPositions(
  processed: ProcessedImage,
  algorithm: DitherAlgorithm,
  blueNoiseRef: { current: Uint8Array | null },
  ditherOpts: DitherOptions,
  invert: boolean,
  cornerRadius: number
): Float32Array {
  const { grayscale, alpha, width: gw, height: gh } = processed;
  const opts = ditherOpts;

  let positions: Float32Array;
  if (algorithm === "floyd-steinberg") {
    positions = floydSteinberg(grayscale, gw, gh, opts, alpha);
  } else if (algorithm === "bayer") {
    positions = bayerDither(grayscale, gw, gh, opts, alpha);
  } else if (algorithm === "blue-noise") {
    if (!blueNoiseRef.current) {
      blueNoiseRef.current = generateBlueNoise(256);
    }
    positions = blueNoiseDither(
      grayscale,
      gw,
      gh,
      blueNoiseRef.current,
      256,
      opts,
      alpha
    );
  } else {
    const _n: never = algorithm;
    throw new Error(`Unknown algorithm: ${String(_n)}`);
  }

  if (invert) {
    positions = invertWithMask(positions, gw, gh, cornerRadius, alpha);
  }

  return positions;
}
