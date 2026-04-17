"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildDitherPositions } from "./build-positions";
import type { DitherAlgorithm } from "./dither-algorithms";
import { processImageSource } from "./image-processing";
import {
  createDotSystem,
  type DotSystem,
  renderDots,
  type Shockwave,
  updateDots,
} from "./particle-system";
import type { DitherImageInput } from "./resolve-image-input";
import { resolveDitherImageInput } from "./resolve-image-input";

export type { DitherImageInput } from "./resolve-image-input";

const DEFAULT_GRID = 205;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const on = () => {
      setIsMobile(mq.matches);
    };
    on();
    mq.addEventListener("change", on);
    return () => {
      mq.removeEventListener("change", on);
    };
  }, []);
  return isMobile;
}

export interface DitherCanvasProps {
  /** Raster to dither: URL, ImageBitmap, canvas, ImageData, Blob, File, etc. */
  image: DitherImageInput | null | undefined;
  className?: string;
  style?: React.CSSProperties;
  algorithm?: DitherAlgorithm;
  gridResolution?: number;
  scale?: number;
  dotScale?: number;
  invert?: boolean;
  /** Mouse repulsion + click shockwaves */
  interaction?: boolean;
  imageProcessing?: {
    threshold?: number;
    contrast?: number;
    gamma?: number;
    blur?: number;
    highlightsCompression?: number;
  };
  dither?: {
    errorStrength?: number;
    serpentine?: boolean;
  };
  shape?: {
    cornerRadius?: number;
  };
}

export function DitherCanvas({
  image,
  className,
  style,
  algorithm = "floyd-steinberg",
  gridResolution = DEFAULT_GRID,
  scale = 0.35,
  dotScale = 1,
  invert = true,
  interaction = true,
  imageProcessing: ip = {},
  dither: ditherOpts = {},
  shape: shapeOpts = {},
}: DitherCanvasProps) {
  const threshold = ip.threshold ?? 181;
  const contrast = ip.contrast ?? 0;
  const gamma = ip.gamma ?? 1.03;
  const blur = ip.blur ?? 3.75;
  const highlightsCompression = ip.highlightsCompression ?? 0;
  const errorStrength = ditherOpts.errorStrength ?? 1.0;
  const serpentine = ditherOpts.serpentine ?? true;
  const cornerRadius = shapeOpts.cornerRadius ?? 0.28;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const systemRef = useRef<DotSystem | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const shockwavesRef = useRef<Shockwave[]>([]);
  const animFrameRef = useRef(0);
  const runningRef = useRef(false);
  const blueNoiseRef = useRef<Uint8Array | null>(null);
  const prevConfigRef = useRef<string>("");
  const isMobile = useIsMobile();

  const startLoop = useCallback(() => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      runningRef.current = false;
      return;
    }
    const dpr = window.devicePixelRatio || 1;

    const tick = () => {
      const sys = systemRef.current;
      if (!sys) {
        runningRef.current = false;
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const needsMore = updateDots(
        sys,
        mouseRef.current.x,
        mouseRef.current.y,
        mouseRef.current.active,
        shockwavesRef.current,
        performance.now()
      );

      renderDots(ctx, sys, invert, rect.width, rect.height, dpr);

      if (needsMore) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        runningRef.current = false;
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [invert]);

  const rebuildParticles = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || image == null) {
      systemRef.current = null;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const rect = canvas.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
          ctx.clearRect(0, 0, rect.width * dpr, rect.height * dpr);
        }
      }
      return;
    }

    const rect = canvas.getBoundingClientRect();
    let source: CanvasImageSource;
    try {
      source = await resolveDitherImageInput(image);
    } catch {
      systemRef.current = null;
      return;
    }

    const processed = processImageSource(
      source,
      gridResolution,
      1,
      contrast,
      gamma,
      blur,
      highlightsCompression
    );

    const gw = processed.width;
    const gh = processed.height;
    if (gw === 0 || gh === 0) {
      systemRef.current = null;
      return;
    }

    const ditherOpt = {
      threshold,
      serpentine,
      errorStrength,
    };

    const positions = buildDitherPositions(
      processed,
      algorithm,
      blueNoiseRef,
      ditherOpt,
      invert,
      cornerRadius
    );

    const s = Math.max(
      0.5,
      (Math.min(rect.width, rect.height) * scale) / Math.max(gw, gh)
    );
    const ox = Math.round((rect.width - gw * s) / 2);
    const oy = Math.round((rect.height - gh * s) / 2);
    const ds = isMobile ? dotScale * 0.8 : dotScale;

    systemRef.current = createDotSystem(positions, s, ds, ox, oy);
    startLoop();
  }, [
    image,
    algorithm,
    gridResolution,
    scale,
    dotScale,
    contrast,
    gamma,
    blur,
    highlightsCompression,
    threshold,
    serpentine,
    errorStrength,
    cornerRadius,
    invert,
    isMobile,
    startLoop,
  ]);

  useEffect(() => {
    const configKey = JSON.stringify({
      image,
      algorithm,
      gridResolution,
      scale,
      dotScale,
      ip: { threshold, contrast, gamma, blur, highlightsCompression },
      dither: { errorStrength, serpentine },
      cornerRadius,
      invert,
      isMobile,
    });
    if (configKey === prevConfigRef.current) {
      return;
    }
    prevConfigRef.current = configKey;

    let cancelled = false;
    rebuildParticles().then(() => {
      if (cancelled) {
        return;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    image,
    algorithm,
    gridResolution,
    scale,
    dotScale,
    threshold,
    contrast,
    gamma,
    blur,
    highlightsCompression,
    errorStrength,
    serpentine,
    cornerRadius,
    invert,
    isMobile,
    rebuildParticles,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastWidth = 0;
    let lastHeight = 0;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const sys = systemRef.current;
      if (sys) {
        renderDots(ctx, sys, invert, rect.width, rect.height, dpr);
      }

      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (lastWidth !== 0 && (w !== lastWidth || h !== lastHeight)) {
        if (resizeTimer) {
          clearTimeout(resizeTimer);
        }
        resizeTimer = setTimeout(() => {
          rebuildParticles().catch(() => {
            /* ignore */
          });
        }, 200);
      }
      lastWidth = w;
      lastHeight = h;
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    const handlePointerMove = (e: PointerEvent) => {
      if (!interaction) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
      startLoop();
    };

    const handlePointerLeave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") {
        return;
      }
      mouseRef.current.active = false;
      startLoop();
    };

    const handlePointerCancel = () => {
      mouseRef.current.active = false;
      startLoop();
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!interaction) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      shockwavesRef.current.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        start: performance.now(),
      });
      if (e.pointerType !== "mouse") {
        mouseRef.current.active = false;
      }
      startLoop();
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("pointercancel", handlePointerCancel);
    canvas.addEventListener("pointerup", handlePointerUp);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      runningRef.current = false;
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("pointercancel", handlePointerCancel);
      canvas.removeEventListener("pointerup", handlePointerUp);
    };
  }, [invert, startLoop, rebuildParticles, interaction]);

  const bg = invert ? "#ffffff" : "#0a0a0a";

  return (
    <canvas
      className={className}
      ref={canvasRef}
      style={{
        background: bg,
        cursor: interaction ? "default" : "inherit",
        ...style,
      }}
    />
  );
}
