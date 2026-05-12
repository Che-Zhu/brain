import { useId } from "react";
import type { DbIconProps } from "./types";

export function MemcachedIcon({ size = 24, className, ...props }: DbIconProps) {
  const id = useId();
  const lg1 = `${id}-mc-lg1`;
  const lg2 = `${id}-mc-lg2`;
  const rg3 = `${id}-mc-rg3`;
  const rg4 = `${id}-mc-rg4`;

  return (
    <svg
      className={className}
      height={size}
      viewBox="0 0 254 254"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id={lg1} x1="50%" x2="50%" y1="100%" y2="0%">
          <stop offset="0%" stopColor="#574C4A" />
          <stop offset="100%" stopColor="#80716D" />
        </linearGradient>
        <linearGradient
          id={lg2}
          x1="88.778%"
          x2="30.149%"
          y1="98.342%"
          y2="-8.68%"
        >
          <stop offset="0%" stopColor="#268D83" />
          <stop offset="100%" stopColor="#2EA19E" />
        </linearGradient>
        <radialGradient
          cx="41.406%"
          cy="42.708%"
          fx="41.406%"
          fy="42.708%"
          id={rg3}
          r="50%"
        >
          <stop offset="0%" stopColor="#DB7C7C" />
          <stop offset="100%" stopColor="#C83737" />
        </radialGradient>
        <radialGradient
          cx="44.271%"
          cy="42.708%"
          fx="44.271%"
          fy="42.708%"
          id={rg4}
          r="50%"
        >
          <stop offset="0%" stopColor="#DB7C7C" />
          <stop offset="100%" stopColor="#C83737" />
        </radialGradient>
      </defs>
      <g>
        <path
          d="M0,171.19 L0,82.171 C0,10.271 10.261,0 82.086,0 L171.275,0 C243.1,0 253.361,10.271 253.361,82.171 L253.361,171.19 C253.361,243.089 243.1,253.361 171.275,253.361 L82.086,253.361 C10.261,253.361 0,243.089 0,171.19Z"
          fill={`url(#${lg1})`}
        />
        <g transform="translate(45.789, 47.098)">
          <path
            d="M8.891,0.655 C-3.562,79.583 2.953,153.48 2.953,153.48 L41.881,153.48 C38.177,133.776 24.889,43.756 35.943,43.459 C41.867,44.399 68.932,119.83 68.932,119.83 C68.932,119.83 74.893,119.088 80.891,119.088 C86.889,119.088 92.85,119.83 92.85,119.83 C92.85,119.83 119.916,44.399 125.84,43.459 C136.893,43.756 123.605,133.776 119.902,153.48 L158.829,153.48 C158.829,153.48 165.345,79.583 152.891,0.655 L116.85,0.655 C109.99,0.736 83.89,46.511 80.891,46.511 C77.892,46.511 51.792,0.736 44.932,0.655 L8.891,0.655Z"
            fill={`url(#${lg2})`}
          />
          <circle cx="64" cy="144.267" fill={`url(#${rg3})`} r="9.213" />
          <circle cx="97.782" cy="144.267" fill={`url(#${rg4})`} r="9.213" />
        </g>
      </g>
    </svg>
  );
}
