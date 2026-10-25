"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";

// Hover on desktop, tap on touch. Closes on outside tap or Escape.
export function InfoTip({
  children,
  label = "More info",
  align = "center",
  side = "top",
  className = "",
}: {
  children: ReactNode;
  label?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const pointer = useRef<string>("mouse");
  const tipRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  // Nudge the bubble back inside the viewport (phones, edge-of-card icons).
  useLayoutEffect(() => {
    if (!open || !tipRef.current) return setShift(0);
    const margin = 8;
    const r = tipRef.current.getBoundingClientRect();
    const left = r.left - shift;
    const right = r.right - shift;
    if (right > window.innerWidth - margin) setShift(window.innerWidth - margin - right);
    else if (left < margin) setShift(margin - left);
    else setShift(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const x = { start: "left-0", center: "left-1/2 -translate-x-1/2", end: "right-0" }[align];
  const y = side === "top" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <span
      ref={ref}
      className={`relative inline-flex align-middle ${className}`}
      // Only a real mouse hovers; taps fire emulated mouse events we ignore.
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onPointerDown={(e) => (pointer.current = e.pointerType)}
        onClick={(e) => {
          e.stopPropagation();
          // Mouse: hover already opened it, so a click keeps it open. Touch: toggle.
          setOpen((o) => (pointer.current === "mouse" ? true : !o));
        }}
        className="grid size-5 place-items-center rounded-full text-muted/70 transition hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
      >
        <Info className="size-3.5" />
      </button>
      {open && (
        <span
          ref={tipRef}
          role="tooltip"
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
          className={`absolute z-50 w-64 max-w-[calc(100vw-16px)] rounded-xl bg-ink px-3.5 py-2.5 text-left text-xs leading-relaxed font-normal tracking-normal text-white normal-case shadow-xl ${x} ${y}`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
