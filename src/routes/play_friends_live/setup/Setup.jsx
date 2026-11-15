import { useState } from "react";
import Navbar from "src/components/Navbar";
import { useLiveGameContext } from "src/context/useLiveGameContext";
import AddPlayerButton from "./components/AddPlayerButton";
import NameInput from "./components/NameInput";
import ImageSlider from "./components/ImageSlider";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getInitialPlayerData } from "src/utils/live_game/getInitialData";
import SoundSwitch from "src/components/SoundSwitch";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";

const MIN_POINTS = 25;
const MAX_POINTS = 500;

const DIFFICULTIES = [
  { value: "easy", label: "Easy", hint: "Banks early and a bit randomly" },
  { value: "medium", label: "Medium", hint: "Banks once it has 20 points" },
  { value: "hard", label: "Hard", hint: "Adapts to the score and takes risks when you are close" },
];

function Segmented({ legend, options, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={legend} className="flex rounded-lg border border-[#ffffff60] overflow-hidden">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-5 py-2 font-semibold duration-200 ${
            value === o.value ? "bg-[#D30CBD]" : "bg-[#ffffff10] hover:bg-[#ffffff30]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function LiveGameSetup() {
  const {
    setupPlayers,
    setSetupPlayers,
    maxPoints,
    setMaxPoints,
    startGame,
    isContinue,
    difficulty,
    setDifficulty,
    openTutorial,
  } = useLiveGameContext();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "bot" ? "bot" : "friends";
  const setMode = (m) => setParams(m === "bot" ? { mode: "bot" } : {}, { replace: true });
  const { preloadSrcList, pigPetNames } = useGreedyPigContext();
  const pigs = preloadSrcList.filter((pig) => pig.includes("pig"));
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  const points = Number(maxPoints);
  const pointsInvalid = !Number.isInteger(points) || points < MIN_POINTS || points > MAX_POINTS;

  async function begin(resume) {
    setError("");
    if (resume) {
      navigate("/live-game/game");
      return;
    }
    if (pointsInvalid) {
      setError(`Max score must be a whole number from ${MIN_POINTS} to ${MAX_POINTS}.`);
      return;
    }
    setIsStarting(true);
    try {
      await startGame({ mode });
      navigate("/live-game/game");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsStarting(false);
    }
  }

  function clearsPlayers() {
    setSetupPlayers(getInitialPlayerData(pigs, pigPetNames));
  }

  const startLabel = isStarting ? "Starting…" : "Start Game";
  const startClasses =
    "w-full md:w-fit sec-font text-xl rounded px-16 py-4 bg-[#D30CBD] font-bold duration-500 hover:skew-x-0 hover:scale-95 hover:bg-[#d30cbc] disabled:opacity-60 disabled:cursor-wait";

  return (
    <>
      <div>
        <Navbar />
        <div className="flex flex-col items-center gap-8 text-white px-[5%] md:px-[10%] py-4 ">
          <section className="flex flex-col items-center gap-4">
            <Segmented
              legend="Game mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: "friends", label: "With friends" },
                { value: "bot", label: "Vs computer" },
              ]}
            />
            {mode === "bot" && (
              <>
                <Segmented
                  legend="Computer difficulty"
                  value={difficulty}
                  onChange={setDifficulty}
                  options={DIFFICULTIES}
                />
                <p className="text-sm text-[#ffffffc0]" aria-live="polite">
                  {DIFFICULTIES.find((d) => d.value === difficulty)?.hint}
                </p>
              </>
            )}
          </section>
          <section className="flex flex-col">
            <label htmlFor="max-score">Max Score</label>
            <input
              id="max-score"
              type="number"
              min={MIN_POINTS}
              max={MAX_POINTS}
              value={maxPoints}
              onChange={(e) => {
                setMaxPoints(e.target.value);
              }}
              aria-invalid={pointsInvalid}
              aria-describedby="max-score-hint"
              className="p-2 bg-[#ffffff20] border rounded-md min-w-[5%] w-[250px]  "
              required
            />
            <p
              id="max-score-hint"
              className={`text-xs mt-1 ${pointsInvalid ? "text-[#fca5a5]" : "text-[#ffffffa0]"}`}
            >
              {MIN_POINTS} to {MAX_POINTS} points. First to reach it wins.
            </p>
          </section>
          <div className=" w-full  gap-2 flow-root">
            <section className="max-h-[350px] w-full overflow-y-auto bg-[#ffffff10] border rounded-lg p-4 grid grid-cols-fluid justify-center gap-4">
              {(mode === "bot" ? setupPlayers.slice(0, 1) : [...setupPlayers]).map((player, index) => (
                <div
                  key={player.id}
                  className=" flex flex-col w-full items-center  gap-2 p-2 rounded-lg border border-[#FFFFFF40] hover:border-[#ffffff80] duration-300"
                >
                  <NameInput player={player} index={index} />
                  <ImageSlider player={player} index={index} />
                </div>
              ))}

              {mode === "bot" ? (
                <div className="flex flex-col w-full items-center justify-center gap-2 p-2 rounded-lg border border-dashed border-[#FFFFFF60]">
                  <img src={pigs[5]} alt="" width={120} />
                  <p className="text-lg font-medium capitalize">Computer ({difficulty})</p>
                  <p className="text-xs text-[#ffffffa0]">Your opponent</p>
                </div>
              ) : (
                <AddPlayerButton />
              )}
            </section>
            {mode === "friends" && (
              <button
                className="text-right text-xs p-2 bg-[#D30C0C40] text-[#ffffff] w-fit border border-[#D30C0C80] duration-300 hover:bg-[#D30C0C80]   hover:border-[#D30C0C] rounded float-right mt-2"
                onClick={clearsPlayers}
              >
                Clear Players
              </button>
            )}
            <SoundSwitch />
            <button
              onClick={openTutorial}
              className="text-xs underline text-[#ffffffc0] hover:text-white ml-4"
            >
              How do I play?
            </button>
          </div>
          {error && (
            <p
              role="alert"
              className="bg-[#D30C0C50] border border-[#f87171] rounded-lg px-4 py-2 text-center max-w-md"
            >
              {error}
            </p>
          )}
          <section className="flex gap-4 flex-wrap justify-center">
            {isContinue ? (
              <>
                <button
                  onClick={() => begin(false)}
                  disabled={isStarting}
                  className={`${startClasses} skew-x-6`}
                >
                  {isStarting ? "Starting…" : "Start New Game"}
                </button>
                <button
                  onClick={() => begin(true)}
                  disabled={isStarting}
                  className={`${startClasses} -skew-x-6`}
                >
                  Resume Game
                </button>
              </>
            ) : (
              <button
                onClick={() => begin(false)}
                disabled={isStarting}
                className={`${startClasses} skew-x-6`}
              >
                {startLabel}
              </button>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

export default LiveGameSetup;
