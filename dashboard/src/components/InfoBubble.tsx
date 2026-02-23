import { useCallback, useEffect, useRef, useState } from "react";

export function InfoBubble({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [above, setAbove] = useState(true);
  const btnRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const openAbove = rect.top > 120;
    setAbove(openAbove);
    setStyle({
      position: "fixed",
      left: rect.left + rect.width / 2,
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + 8 }
        : { top: rect.bottom + 8 }),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="w-4 h-4 rounded-full border border-slate-300 bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700 transition-colors inline-flex items-center justify-center text-[10px] font-bold leading-none cursor-pointer align-middle"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        onBlur={() => setOpen(false)}
        aria-label="More info"
      >
        ?
      </button>
      {open && (
        <span
          style={style}
          className="z-50 -translate-x-1/2 w-56 px-3 py-2 text-xs text-slate-700 bg-white rounded-lg shadow-lg border border-slate-200 leading-relaxed"
        >
          {text}
          <span
            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
              above
                ? "top-full -mt-px border-t-white drop-shadow-sm"
                : "bottom-full -mb-px border-b-white drop-shadow-sm"
            }`}
          />
        </span>
      )}
    </>
  );
}
