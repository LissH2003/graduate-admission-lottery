"use client";

import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }: React.ComponentProps<typeof Sonner>) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      {...props}
    />
  );
};

export { Toaster };
