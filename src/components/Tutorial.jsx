import { useEffect, useRef, useState } from "react";
import { FaArrowRight, FaDice, FaExclamationTriangle, FaKeyboard, FaPiggyBank, FaTrophy } from "react-icons/fa";

const STEPS = [
  {
    title: "Roll the die",
    eyebrow: "Build your turn",
    accent: "#67e8f9",
    icon: FaDice,
    body: "Tap the die (or press Space) to roll. Every roll from 2 to 6 is added to your turn total, and you can keep rolling as long as you dare.",
  },
  {
    title: "Watch out for the 1",
    eyebrow: "The risky bit",
    accent: "#fb7185",
    icon: FaExclamationTriangle,
    body: "If you roll a 1, you lose everything you collected this turn and the next player goes. The more you roll, the more you stand to lose!",
  },
  {
    title: "Pass to bank your points",
    eyebrow: "Play it safe",
    accent: "#facc15",
    icon: FaPiggyBank,
    body: "Press PASS (or P) to add your turn total to your score safely. You must roll at least once before you can pass.",
  },
  {
    title: "Race to the target",
    eyebrow: "Claim the crown",
    accent: "#c084fc",
    icon: FaTrophy,
    body: "The first player to reach the max score wins. Playing the computer? It takes its own turn automatically. Pick Easy, Medium or Hard on the setup screen.",
  },
  {
    title: "Keyboard shortcuts",
    eyebrow: "Play your way",
    accent: "#4ade80",
    icon: FaKeyboard,
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
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 bg-[#090916d9] backdrop-blur-sm flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        className="relative overflow-hidden bg-[#1b1b2b] text-white border border-[#ffffff35] rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl shadow-black/50 space-y-6"
      >
        <div
          aria-hidden="true"
          className="absolute -right-14 -top-16 h-40 w-40 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: current.accent }}
        />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
              style={{ color: current.accent, borderColor: `${current.accent}55`, backgroundColor: `${current.accent}18` }}
            >
              <Icon size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: current.accent }}>
                {current.eyebrow}
              </p>
              <p className="mt-1 text-sm text-[#ffffffa0]">
                Step {step + 1} <span aria-hidden="true">/</span> {STEPS.length}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#ffffff70]">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
        </div>
        <div className="relative flex gap-1" aria-label={`Tutorial progress: step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((item, index) => (
            <span
              key={item.title}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ backgroundColor: index <= step ? current.accent : "#ffffff20" }}
            />
          ))}
        </div>
        <div className="relative space-y-3">
          <h2 id="tutorial-title" className="pri-font text-3xl leading-tight">
            {current.title}
          </h2>
          {current.body && <p className="text-lg leading-relaxed">{current.body}</p>}
          {current.shortcuts && (
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {current.shortcuts.map(([keys, what]) => (
                <div key={keys} className="flex items-center gap-3 rounded-lg border border-[#ffffff18] bg-[#ffffff0d] px-3 py-2">
                  <dt>
                    <kbd className="inline-block min-w-[72px] rounded bg-[#ffffff20] px-2 py-1 text-center font-mono text-xs font-bold">
                      {keys}
                    </kbd>
                  </dt>
                  <dd className="text-sm text-[#ffffffd0]">{what}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
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
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 bg-[#D30CBD] hover:bg-[#ed28d5] font-bold transition-colors"
            >
              {isLast ? "Got it!" : "Next"}
              {!isLast && <FaArrowRight size={13} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
