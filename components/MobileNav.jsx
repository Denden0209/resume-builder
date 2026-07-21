"use client";

import { useEffect, useState } from "react";

// Wraps nav children with a mobile hamburger toggle.
// The <nav> gets .open toggled; a button appears < 820px via CSS.
export default function MobileNav({ children }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 820 && open) setOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  return (
    <>
      <button
        className="nav-toggle"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span></span><span></span><span></span>
      </button>
      <nav
        className={"nav" + (open ? " open" : "")}
        aria-label="Main"
        onClick={(e) => {
          // close after tapping any link/button inside
          if (e.target.closest("a, button")) setOpen(false);
        }}
      >
        {children}
      </nav>
    </>
  );
}
