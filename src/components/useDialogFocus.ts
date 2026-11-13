"use client";
import { useEffect, useRef, type RefObject } from "react";

/** Keep focus and scrolling within an active modal; restore its opener on close. */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, active: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => (ref.current?.querySelector<HTMLElement>("[data-autofocus]") ?? ref.current?.querySelector<HTMLElement>("input, select, button, a[href], [tabindex='0']"))?.focus());
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex='0']") ?? []).filter((item) => item.getClientRects().length > 0 && !item.closest("fieldset:disabled"));
      const first = elements[0], last = elements.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !ref.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !ref.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown, true);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", keydown, true); document.body.style.overflow = previousOverflow; requestAnimationFrame(() => { if (opener?.isConnected) opener.focus(); }); };
  }, [active, ref]);
}
