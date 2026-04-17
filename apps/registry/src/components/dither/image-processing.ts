export interface ProcessedImage {
  grayscale: Uint8Array;
  alpha: Uint8Array;
  width: number;
  height: number;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getSourceDimensions(source: CanvasImageSource): { w: number; h: number } {
  if (source instanceof HTMLImageElement) {
    return { w: source.naturalWidth || source.width, h: source.naturalHeight || source.height };
  }
  if (source instanceof SVGImageElement) {
    return { w: source.width.baseVal.value, h: source.height.baseVal.value };
  }
  if (source instanceof HTMLVideoElement) {
    return { w: source.videoWidth, h: source.videoHeight };
  }
  if (source instanceof ImageBitmap) {
    return { w: source.width, h: source.height };
  }
  if (source instanceof HTMLCanvasElement || source instanceof OffscreenCanvas) {
    return { w: source.width, h: source.height };
  }
  return { w: 0, h: 0 };
}

function sampleGrayscaleGrid(
  outW: number,
  outH: number,
  scale: number,
  pixels: Uint8ClampedArray,
  alphaData: Uint8ClampedArray,
  contrast: number,
  gamma: number,
  highlightsCompression: number
): ProcessedImage {
  const sampledW = Math.ceil(outW / scale);
  const sampledH = Math.ceil(outH / scale);
  const grayscale = new Uint8Array(sampledW * sampledH);
  const alpha = new Uint8Array(sampledW * sampledH);

  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let sy = 0; sy < sampledH; sy++) {
    for (let sx = 0; sx < sampledW; sx++) {
      const px = Math.min(Math.round(sx * scale), outW - 1);
      const py = Math.min(Math.round(sy * scale), outH - 1);
      const idx = (py * outW + px) * 4;

      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const blurredAlpha = pixels[idx + 3] / 255;

      alpha[sy * sampledW + sx] = alphaData[idx + 3];

      let luma: number;
      if (blurredAlpha > 0.01) {
        luma = (0.299 * r + 0.587 * g + 0.114 * b) / blurredAlpha;
      } else {
        luma = 0;
      }

      if (contrast !== 0) {
        luma = contrastFactor * (luma - 128) + 128;
      }

      if (gamma !== 1.0) {
        const t = Math.max(0, luma / 255);
        luma = 255 * t ** (1 / gamma);
      }

      if (highlightsCompression > 0) {
        const norm = luma / 255;
        const compressed =
          norm < 0.5 ? norm : 0.5 + (norm - 0.5) * (1 - highlightsCompression);
        luma = compressed * 255;
      }

      grayscale[sy * sampledW + sx] = Math.max(0, Math.min(255, Math.round(luma)));
    }
  }

  return { grayscale, alpha, width: sampledW, height: sampledH };
}

/**
 * Scale raster source to fit within maxDimension while preserving aspect ratio,
 * then sample at every `scale` pixels to create the dot grid.
 */
export function processImageSource(
  source: CanvasImageSource,
  maxDimension: number,
  scale: number,
  contrast: number,
  gamma: number,
  blur: number,
  highlightsCompression = 0
): ProcessedImage {
  const { w: srcW, h: srcH } = getSourceDimensions(source);
  if (srcW === 0 || srcH === 0) {
    return { grayscale: new Uint8Array(0), alpha: new Uint8Array(0), width: 0, height: 0 };
  }

  const aspect = srcW / srcH;
  const outW = aspect >= 1 ? maxDimension : Math.round(maxDimension * aspect);
  const outH = aspect >= 1 ? Math.round(maxDimension / aspect) : maxDimension;

  const alphaCanvas = document.createElement("canvas");
  alphaCanvas.width = outW;
  alphaCanvas.height = outH;
  const alphaCtx = alphaCanvas.getContext("2d");
  if (!alphaCtx) {
    return { grayscale: new Uint8Array(0), alpha: new Uint8Array(0), width: 0, height: 0 };
  }
  alphaCtx.imageSmoothingEnabled = true;
  alphaCtx.imageSmoothingQuality = "high";
  alphaCtx.drawImage(source, 0, 0, outW, outH);
  const alphaData = alphaCtx.getImageData(0, 0, outW, outH).data;

  const pad = Math.ceil(blur * 3);
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = srcW + pad * 2;
  srcCanvas.height = srcH + pad * 2;
  const srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx) {
    return { grayscale: new Uint8Array(0), alpha: new Uint8Array(0), width: 0, height: 0 };
  }

  if (blur > 0) {
    srcCtx.filter = `blur(${blur}px)`;
  }
  srcCtx.drawImage(source, pad, pad, srcW, srcH);
  srcCtx.filter = "none";

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { grayscale: new Uint8Array(0), alpha: new Uint8Array(0), width: 0, height: 0 };
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(srcCanvas, pad, pad, srcW, srcH, 0, 0, outW, outH);

  const imageData = ctx.getImageData(0, 0, outW, outH);
  return sampleGrayscaleGrid(
    outW,
    outH,
    scale,
    imageData.data,
    alphaData,
    contrast,
    gamma,
    highlightsCompression
  );
}

/**
 * Convenience: load URL then process.
 */
export async function processImageFromUrl(
  src: string,
  maxDimension: number,
  scale: number,
  contrast: number,
  gamma: number,
  blur: number,
  highlightsCompression = 0
): Promise<ProcessedImage> {
  const img = await loadImage(src);
  return processImageSource(img, maxDimension, scale, contrast, gamma, blur, highlightsCompression);
}
