import { useEffect, useState } from "react";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import { useLiveGameContext } from "src/context/useLiveGameContext";

// The die is only a picture: the server decides the number. While a roll is
// in flight we shuffle faces, then land on the server's result (diceValue).
export function Dice() {
  const { preloadSrcList } = useGreedyPigContext();
  const { isRolling, roll, busy, isGameOver, diceValue } = useLiveGameContext();
  const faces = preloadSrcList.filter((src) => src.includes("dice"));
  const [shuffleFace, setShuffleFace] = useState(0);

  useEffect(() => {
    if (!isRolling) return;
    const timer = setInterval(() => setShuffleFace(Math.floor(Math.random() * 6)), 100);
    return () => clearInterval(timer);
  }, [isRolling]);

  const shown = isRolling ? shuffleFace : Math.max(diceValue - 1, 0);

  return (
    <div className="flex flex-col items-center gap-2">
    <button
      className="hover:scale-105 active:scale-100 duration-300 md:w-auto w-[200px] disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed"
      onClick={roll}
      disabled={busy || isGameOver}
      aria-label="Roll the die"
    >
      {faces.map((src, index) => (
        <img
          key={index}
          src={src}
          alt={`Die showing ${index + 1}`}
          className={shown === index ? "" : "hidden"}
        />
      ))}
    </button>
    <p className="hidden md:block text-xs text-[#ffffffa0]" aria-hidden="true">
      Press <kbd className="font-mono">Space</kbd> to roll
    </p>
    </div>
  );
}
