import { Keyboard, X } from "lucide-react";
import { useEffect } from "react";

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent);
  const modKey = isMac ? "⌘" : "Ctrl";

  const sections = [
    {
      title: "General",
      shortcuts: [
        { keys: [modKey, "K"], description: "Open Command Palette" },
        { keys: ["/"], description: "Quick search / jump to" },
        { keys: ["?"], description: "Open Keyboard Shortcuts" },
        { keys: ["T"], description: "Toggle Light / Dark Theme" },
        { keys: ["Esc"], description: "Close modal / drawer" },
      ],
    },
    {
      title: "Navigation",
      shortcuts: [
        { keys: ["G", "D"], description: "Go to Dashboard" },
        { keys: ["G", "A"], description: "Go to Sales Analytics" },
        { keys: ["G", "S"], description: "Go to Datasets" },
        { keys: ["G", "E"], description: "Go to Expenses" },
        { keys: ["G", "I"], description: "Go to Inventory" },
        { keys: ["G", "R"], description: "Go to Reports" },
        { keys: ["G", "T"], description: "Go to Team" },
        { keys: ["G", "L"], description: "Go to Activity Log" },
      ],
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-pop backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Keyboard className="size-4" />
            </span>
            <h2 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-sunken hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {sections.map((sec) => (
            <div key={sec.title}>
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {sec.title}
              </h3>
              <div className="space-y-1.5">
                {sec.shortcuts.map((sc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-surface-sunken"
                  >
                    <span className="text-foreground">{sc.description}</span>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-foreground shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border bg-surface-sunken/60 px-5 py-2.5 text-center text-xs text-muted-foreground">
          Press <kbd className="font-semibold text-foreground">Esc</kbd> anytime to dismiss
        </div>
      </div>
    </div>
  );
}