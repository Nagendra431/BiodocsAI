"use client";

import { cn } from "@/lib/utils";
import { PlateElement, withRef } from "platejs/react";
import React from "react";

export interface PresentationParagraphElementProps {
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export const PresentationParagraphElement = withRef<
  typeof PlateElement,
  PresentationParagraphElementProps
>(({ className, children, ...props }, ref) => {
  return (
    <PlateElement
      ref={ref}
      as="div"
      className={cn(
        "presentation-paragraph m-0 px-0 py-1 text-sm leading-relaxed", // Reduced from text-base to text-sm for more compact slides
        className,
      )}
      {...props}
    >
      {children}
    </PlateElement>
  );
});

PresentationParagraphElement.displayName = "PresentationParagraphElement";
