import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function AnimatedCursor() {
  const cursorRef = useRef(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const desktop = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );

    const root = document.documentElement;
    let frame = 0;
    let x = 0;
    let y = 0;

    function hide() {
      cancelAnimationFrame(frame);
      frame = 0;
      cursor.classList.remove("is-visible", "is-pressed");
      root.classList.remove("vns-cursor-visible");
    }

    function paint() {
      frame = 0;
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      cursor.classList.add("is-visible");
      root.classList.add("vns-cursor-visible");
    }

    function move(event) {
      if (!desktop.matches || event.pointerType !== "mouse") {
        hide();
        return;
      }

      x = event.clientX;
      y = event.clientY;

      const target =
        event.target instanceof Element ? event.target : null;

      const interactive = target?.closest(
        'a, button, label, select, summary, [role="button"], ' +
        'input, textarea, [contenteditable="true"]'
      );

      cursor.classList.toggle(
        "is-interactive",
        Boolean(interactive)
      );

      if (!frame) {
        frame = requestAnimationFrame(paint);
      }
    }

    function press(event) {
      if (desktop.matches && event.pointerType === "mouse") {
        cursor.classList.add("is-pressed");
      }
    }

    function release() {
      cursor.classList.remove("is-pressed");
    }

    function leave(event) {
      if (event.relatedTarget === null) hide();
    }

    function visibilityChanged() {
      if (document.hidden) hide();
    }

    document.addEventListener("pointermove", move, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointerdown", press, true);
    document.addEventListener("pointerup", release, true);
    document.addEventListener("pointercancel", hide, true);
    document.addEventListener("pointerout", leave, true);
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("blur", hide);
    desktop.addEventListener("change", hide);

    return () => {
      hide();
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerdown", press, true);
      document.removeEventListener("pointerup", release, true);
      document.removeEventListener("pointercancel", hide, true);
      document.removeEventListener("pointerout", leave, true);
      document.removeEventListener(
        "visibilitychange",
        visibilityChanged
      );
      window.removeEventListener("blur", hide);
      desktop.removeEventListener("change", hide);
    };
  }, []);

  return createPortal(
    <div
      ref={cursorRef}
      className="vns-animated-cursor"
      aria-hidden="true"
    >
      <span className="vns-cursor-shape" />
      <span className="vns-cursor-dot" />
    </div>,
    document.body
  );
}