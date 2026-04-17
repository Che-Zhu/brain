"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

export function BlueprintImageGrid({
  urls,
  className,
}: {
  urls: string[];
  className?: string;
}) {
  const [enlarged, setEnlarged] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  useEffect(() => {
    if (!enlarged) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEnlarged(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [enlarged]);

  const lightbox =
    enlarged &&
    typeof document !== "undefined" &&
    createPortal(
      // biome-ignore lint/a11y/noStaticElementInteractions: full-screen lightbox; closes on backdrop click
      <div
        className="fixed inset-0 z-100 cursor-zoom-out"
        onClick={() => {
          setEnlarged(null);
        }}
        role="presentation"
      >
        <div aria-hidden className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-8 z-10 flex min-h-0 min-w-0 items-center justify-center">
          <div className="relative h-full w-full">
            <Image
              alt={enlarged.alt}
              className="object-contain"
              fill
              priority={false}
              sizes="100vw"
              src={enlarged.src}
            />
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <ul
        className={cn(
          "grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3",
          className
        )}
      >
        {urls.map((src) => {
          const fileLabel = decodeURIComponent(
            src.split("/").pop() ?? "blueprint"
          );
          return (
            <li
              className="overflow-hidden rounded-lg border border-border bg-card"
              key={src}
            >
              <button
                className="block w-full cursor-zoom-in bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setEnlarged({ src, alt: fileLabel });
                }}
                type="button"
              >
                <Image
                  alt={fileLabel}
                  className="h-auto max-h-[min(70vh,640px)] w-full object-contain"
                  height={720}
                  priority={false}
                  src={src}
                  width={1280}
                />
              </button>
            </li>
          );
        })}
      </ul>
      {lightbox}
    </>
  );
}
