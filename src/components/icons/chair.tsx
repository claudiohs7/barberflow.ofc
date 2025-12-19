
import type { SVGProps } from "react";

export function ChairIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 3v14a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V3" />
      <path d="M4 11h16" />
      <path d="M12 11v10" />
      <path d="M4 3h16" />
    </svg>
  );
}
