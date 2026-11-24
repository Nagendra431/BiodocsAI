"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { type PlateElementProps } from "platejs/react";
import { PresentationElement } from "./presentation-element";

const headingVariants = cva("relative mb-1", {
  variants: {
    variant: {
      h1: "pb-1 text-4xl font-bold",                    // Reduced from text-5xl
      h2: "pb-px text-2xl font-semibold tracking-tight", // Reduced from text-3xl
      h3: "pb-px text-lg font-semibold tracking-tight",  // Reduced from text-2xl
      h4: "text-base font-semibold tracking-tight",      // Reduced from text-xl
      h5: "text-sm font-semibold tracking-tight",        // Reduced from text-lg
      h6: "text-sm font-semibold tracking-tight",        // Reduced from text-base
    },
  },
});

export const PresentationHeadingElement = ({
  children,
  variant,
  ref,
  ...props
}: PlateElementProps & VariantProps<typeof headingVariants>) => {
  return (
    <PresentationElement
      ref={ref}
      className={cn("presentation-heading", headingVariants({ variant }))}
      {...props}
    >
      {children}
    </PresentationElement>
  );
};

export function H1Element(props: PlateElementProps) {
  return <PresentationHeadingElement variant="h1" {...props} />;
}

export function H2Element(props: PlateElementProps) {
  return <PresentationHeadingElement variant="h2" {...props} />;
}

export function H3Element(props: PlateElementProps) {
  return <PresentationHeadingElement variant="h3" {...props} />;
}

export function H4Element(props: PlateElementProps) {
  return <PresentationHeadingElement variant="h4" {...props} />;
}

export function H5Element(props: PlateElementProps) {
  return <PresentationHeadingElement variant="h5" {...props} />;
}

export function H6Element(props: PlateElementProps) {
  return <PresentationHeadingElement variant="h6" {...props} />;
}
