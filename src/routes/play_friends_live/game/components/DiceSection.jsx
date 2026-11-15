import React from "react";
import { useLiveGameContext } from "src/context/useLiveGameContext";
import Menu from "./Menu";
import { Dice } from "src/components/Dice";

function DiceSection() {
  const { playerData, currentPlayer, maxPoints, hold, busy, isGameOver } = useLiveGameContext();
  const cantPass = playerData[currentPlayer]?.running_points === 0;

  return (
    <div className="h-screen border-r-[#ffffff40] border-r hidden md:flex flex-col items-center justify-around p-8 sticky top-0 bg-[#00000010] ">
      <Dice />
      <button
        className={`bg-[#056FA4c0] w-full text-white text-center text-base lg:text-xl xl:text-2xl font-semibold py-2 lg:py-4 rounded-lg border hover:scale-105 active:scale-100 duration-300 ${
          busy || isGameOver || cantPass ? "opacity-60 cursor-not-allowed hover:scale-100" : ""
        }`}
        onClick={hold}
        aria-disabled={busy || isGameOver || cantPass}
        aria-label="Pass the turn and bank your points"
      >
        PASS <span className="hidden lg:inline text-xs font-normal" aria-hidden="true">(P)</span>
      </button>
      <div className="text-white grid place-content-center gap-2 bg-[#ffffff10] w-full p-4 rounded-lg border border-[#ffffff40]">
        <p className="text-center text-sm lg:text-lg">{playerData.length} players</p>
        <p className="text-center text-sm  lg:text-lg">{maxPoints} max points</p>
      </div>
      <Menu />
    </div>
  );
}

export default DiceSection;
