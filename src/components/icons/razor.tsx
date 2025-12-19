
import type { SVGProps } from "react";

export function RazorIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M7 20H2l3-3" />
      <path d="M22 3l-9.37 9.37a1 1 0 0 1-1.41 0L3 4l1.41-1.41a1 1 0 0 1 1.41 0L14 10.83" />
      <path d="M14 16l4-4" />
      <path d="M16 14l-4-4" />
    </svg>
  );
}
