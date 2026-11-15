import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    title: "Roll the die",
    body: "Tap the die (or press Space) to roll. Every roll from 2 to 6 is added to your turn total, and you can keep rolling as long as you dare.",
  },
  {
    title: "Watch out for the 1",
    body: "If you roll a 1, you lose everything you collected this turn and the next player goes. The more you roll, the more you stand to lose!",
  },
  {
    title: "Pass to bank your points",
    body: "Press PASS (or P) to add your turn total to your score safely. You must roll at least once before you can pass.",
  },
  {
    title: "Race to the target",
    body: "The first player to reach the max score wins. Playing the computer? It takes its own turn automatically. Pick Easy, Medium or Hard on the setup screen.",
  },
  {
    title: "Keyboard shortcuts",
    body: null,
    shortcuts: [
      ["Space or R", "Roll the die"],
      ["P or H", "Pass and bank your points"],
      ["M", "Sound on / off"],
      ["?", "Open this help"],
    ],
  },
];

// Step-by-step help dialog. Fully keyboard accessible: focus moves into it,
// Tab stays inside, Escape closes it, and focus returns to where it was.
export default function Tutorial({ open, onClose }) {
  const [step, setStep] = useState(0);
  const dialogRef = useRef(null);
  const nextRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    const previouslyFocused = document.activeElement;
    nextRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll("button, [href], input");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-[#000000b0] flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        className="bg-[#1b1b2b] text-white border border-[#ffffff60] rounded-xl p-6 w-full max-w-md space-y-4"
      >
        <p className="text-sm text-[#ffffffa0]">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 id="tutorial-title" className="pri-font text-2xl">
          {current.title}
        </h2>
        {current.body && <p className="text-lg leading-relaxed">{current.body}</p>}
        {current.shortcuts && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            {current.shortcuts.map(([keys, what]) => (
              <div key={keys} className="contents">
                <dt>
                  <kbd className="bg-[#ffffff25] border border-[#ffffff60] rounded px-2 py-0.5 font-mono text-sm">
                    {keys}
                  </kbd>
                </dt>
                <dd>{what}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="flex justify-between items-center pt-2">
          <button onClick={onClose} className="underline text-sm text-[#ffffffc0] hover:text-white">
            {isLast ? "Close" : "Skip"}
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded px-4 py-2 bg-[#ffffff20] hover:bg-[#ffffff40] font-semibold"
              >
                Back
              </button>
            )}
            <button
              ref={nextRef}
              onClick={() => (isLast ? onClose() : setStep(step + 1))}
              className="rounded px-5 py-2 bg-[#D30CBD] hover:bg-[#d30cbc] font-bold"
            >
              {isLast ? "Got it!" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
