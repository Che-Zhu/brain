import type { RuntimeIconProps } from "./types";

export function GoIcon({ size = 24, className, ...props }: RuntimeIconProps) {
  return (
    <svg
      aria-label="Go runtime"
      className={className}
      fill="none"
      height={size}
      role="img"
      viewBox="0 0 128 128"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M26 45.5h38.5c3.8 0 6.9 3.1 6.9 6.9s-3.1 6.9-6.9 6.9H21.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <path
        d="M16 68.7h48.5c3.8 0 6.9 3.1 6.9 6.9s-3.1 6.9-6.9 6.9H31.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <path
        d="M80.4 90.8c-13.9 0-25.2-11.3-25.2-25.2s11.3-25.2 25.2-25.2c5.6 0 10.8 1.8 15 4.9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <path
        d="M104.5 63.2c.2 1.3.3 2.6.3 4 0 13-10.5 23.6-23.6 23.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="8"
      />
      <path
        d="M102.8 52.3c5.1 0 9.2 4.1 9.2 9.2s-4.1 9.2-9.2 9.2-9.2-4.1-9.2-9.2 4.1-9.2 9.2-9.2Z"
        fill="currentColor"
      />
    </svg>
  );
}
