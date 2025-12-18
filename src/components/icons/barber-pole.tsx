
import type { SVGProps } from "react";

export function BarberPoleIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M22 6.88a4.5 4.5 0 0 0-4.5-4.5H6.5a4.5 4.5 0 0 0-4.5 4.5v10.24a4.5 4.5 0 0 0 4.5 4.5h11a4.5 4.5 0 0 0 4.5-4.5V6.88Z" />
      <path d="M2 12h20" />
      <path d="m5.64 5.64 12.72 12.72" />
      <path d="m18.36 5.64-12.72 12.72" />
    </svg>
  );
}
