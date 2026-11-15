import React from "react";
import { useLiveGameContext } from "src/context/useLiveGameContext";
import Menu from "./Menu";
import { Dice } from "src/components/Dice";

function DiceSectionMobile() {
  const { playerData, currentPlayer, maxPoints, hold, busy, isGameOver } = useLiveGameContext();
  const cantPass = playerData[currentPlayer]?.running_points === 0;

  return (
    <div className=" border-r-[#ffffff40] border-r md:hidden flex flex-col items-center justify-around px-2 bg-[#00000010] h-[60vh] ">
      <button
        className={`bg-[#056FA480] w-[200px] md:w-full text-white text-center text-base lg:text-xl xl:text-2xl font-semibold py-2 lg:py-4 rounded border hover:scale-105 active:scale-100 duration-300 ${
          busy || isGameOver || cantPass ? "opacity-60 cursor-not-allowed hover:scale-100" : ""
        }`}
        onClick={hold}
        aria-disabled={busy || isGameOver || cantPass}
        aria-label="Pass the turn and bank your points"
      >
        PASS
      </button>

      <Dice />

      <Menu />
      <div className="text-white flex justify-between w-full">
        <p className="text-center text-sm lg:text-lg">{playerData.length} players</p>
        <p className="text-center text-sm  lg:text-lg">{maxPoints} max points</p>
      </div>
    </div>
  );
}

export default DiceSectionMobile;
