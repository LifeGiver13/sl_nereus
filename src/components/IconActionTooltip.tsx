import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type IconActionTooltipProps = {
  /** Shown in the tooltip and used as `aria-label` when the child is a plain `Button`. */
  label: string;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
};

/**
 * Wraps any single focusable child (e.g. `Link` > `Button`, or `AlertDialogTrigger` > `Button`)
 * for a consistent tooltip. For disabled buttons, use `IconActionButton` instead.
 */
export function IconActionTooltip({ label, children, side = "top" }: IconActionTooltipProps) {
  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

type IconActionButtonProps = Omit<ButtonProps, "children" | "aria-label"> & {
  label: string;
  children: React.ReactNode;
};

/**
 * Icon-sized button with tooltip + `aria-label`. Disabled buttons are wrapped so the tooltip still shows.
 */
export function IconActionButton({
  label,
  className,
  disabled,
  children,
  ...props
}: IconActionButtonProps) {
  const button = (
    <Button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={cn(className)}
      {...props}
    >
      {children}
    </Button>
  );

  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        {disabled ? <span className="inline-flex">{button}</span> : button}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
