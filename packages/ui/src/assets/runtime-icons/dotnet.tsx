import type { RuntimeIconProps } from "./types";

export function DotNetIcon({
  size = 24,
  className,
  ...props
}: RuntimeIconProps) {
  return (
    <svg
      aria-label=".NET runtime"
      className={className}
      fill="none"
      height={size}
      role="img"
      viewBox="0 0 128 128"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        height="82"
        rx="20"
        stroke="currentColor"
        strokeWidth="8"
        width="82"
        x="23"
        y="23"
      />
      <path
        d="M43 78.5V49.5h8.2l17 18.2V49.5H77v29h-8.2l-17-18.2v18.2H43Z"
        fill="currentColor"
      />
      <path
        d="M86 78.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z"
        fill="currentColor"
      />
    </svg>
  );
}
