"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="cursor-pointer gap-1.5 transition-transform active:scale-95"
    >
      <Printer className="size-4" />
      Print / PDF
    </Button>
  );
}
