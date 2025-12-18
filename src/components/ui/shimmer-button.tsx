"use client";

import { cn } from "@/lib/utils";
import React, { CSSProperties } from "react";

export interface ShimmerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "100px",
      background = "rgba(0, 0, 0, 1)",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        style={
          {
            "--theme-shimmer-color": shimmerColor,
            "--theme-shimmer-size": shimmerSize,
            "--theme-shimmer-duration": shimmerDuration,
            "--theme-border-radius": borderRadius,
            "--theme-background": background,
            "boxShadow": `0 0 20px 5px ${background.replace('1)', '0.5)')}`
          } as CSSProperties
        }
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white [background:var(--theme-background)] [border-radius:var(--theme-border-radius)]",
          "transform-gpu transition-all duration-300 ease-in-out hover:scale-105",
          className,
        )}
        ref={ref}
        {...props}
      >
        {/* spark container */}
        <div className="absolute inset-0 z-0 overflow-hidden [border-radius:var(--theme-border-radius)]">
          {/* spark */}
          <div className="absolute inset-0 z-0 h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-transparent to-[var(--theme-shimmer-color)] bg-[length:var(--theme-shimmer-size)_100%] bg-no-repeat [animation-duration:var(--theme-shimmer-duration)]" />
        </div>
        <span className="relative z-10">{children}</span>
      </button>
    );
  },
);

ShimmerButton.displayName = "ShimmerButton";

export default ShimmerButton;
