"use client";

import Link, { type LinkProps } from "next/link";
import { cn } from "@/lib/utils";
import React, { CSSProperties } from "react";

type ShimmerButtonProps = {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
  asChild?: boolean;
  style?: React.CSSProperties;
  href?: LinkProps["href"];
  prefetch?: LinkProps["prefetch"];
  replace?: LinkProps["replace"];
  scroll?: LinkProps["scroll"];
  shallow?: LinkProps["shallow"];
} & React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement>;

const ShimmerButton = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ShimmerButtonProps
>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "100px",
      background = "rgba(0, 0, 0, 1)",
      className,
      children,
      asChild = false,
      style,
      href,
      prefetch,
      replace,
      scroll,
      shallow,
      ...props
    },
    ref,
  ) => {
    const mergedStyle: CSSProperties = {
      "--theme-shimmer-color": shimmerColor,
      "--theme-shimmer-size": shimmerSize,
      "--theme-shimmer-duration": shimmerDuration,
      "--theme-border-radius": borderRadius,
      "--theme-background": background,
      boxShadow: `0 0 20px 5px ${background.replace("1)", "0.5)")}`,
      ...style,
    };

    const baseClassName = cn(
      "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white [background:var(--theme-background)] [border-radius:var(--theme-border-radius)]",
      "transform-gpu transition-all duration-300 ease-in-out hover:scale-105",
      className,
    );

    const shimmerContent = (content: React.ReactNode) => (
      <>
        <div className="absolute inset-0 z-0 overflow-hidden [border-radius:var(--theme-border-radius)]">
          <div className="absolute inset-0 z-0 h-full w-full animate-shimmer bg-gradient-to-r from-transparent via-transparent to-[var(--theme-shimmer-color)] bg-[length:var(--theme-shimmer-size)_100%] bg-no-repeat [animation-duration:var(--theme-shimmer-duration)]" />
        </div>
        <span className="relative z-10">{content}</span>
      </>
    );

    if (href) {
      const anchorProps = props as React.AnchorHTMLAttributes<HTMLAnchorElement>;
      return (
        <Link
          href={href}
          prefetch={prefetch}
          replace={replace}
          scroll={scroll}
          shallow={shallow}
          className={baseClassName}
          style={mergedStyle}
          {...anchorProps}
          ref={ref as React.Ref<HTMLAnchorElement>}
        >
          {shimmerContent(children)}
        </Link>
      );
    }

    if (asChild) {
      const child = React.Children.only(children);
      if (!React.isValidElement(child)) {
        return null;
      }
      const childContent = (child as React.ReactElement).props?.children;
      return React.cloneElement(child, {
        ...props,
        className: cn(baseClassName, child.props.className),
        style: { ...mergedStyle, ...child.props.style },
        children: shimmerContent(childContent),
      });
    }

    return (
      <button
        style={mergedStyle}
        className={baseClassName}
        ref={ref}
        {...props}
      >
        {shimmerContent(children)}
      </button>
    );
  },
);

ShimmerButton.displayName = "ShimmerButton";

export default ShimmerButton;
