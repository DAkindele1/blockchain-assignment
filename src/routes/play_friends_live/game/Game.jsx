import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "src/components/Navbar";
import StatusBanner from "src/components/StatusBanner";
import { useLiveGameContext } from "src/context/useLiveGameContext";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import { hasSeenTutorial } from "src/utils/accessibility";
import PlayerTable from "./components/PlayerTable";
import StatsSection from "./components/StatsSection";
import GameOver from "./GameOver";
import DiceSection from "./components/DiceSection";
import StatsSectionMobile from "./components/StatsSectionMobile";
import CurrentPlayerMobile from "./components/CurrentPlayerMobile";
import DiceSectionMobile from "./components/DiceSectionMobile";

export default function LiveGame() {
  const {
    playerData,
    currentPlayer,
    isGameOver,
    setIsContinue,
    loadSavedGame,
    resumeBotIfNeeded,
    setMessage,
    roll,
    hold,
    tutorialOpen,
    openTutorial,
  } = useLiveGameContext();
  const { hasSound, setHasSound } = useGreedyPigContext();
  const navigate = useNavigate();
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setIsContinue(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opened directly (or refreshed)? Fetch the saved game from the server.
  useEffect(() => {
    if (playerData.length > 0) return;
    let cancelled = false;
    setLoadError("");
    loadSavedGame()
      .then((result) => {
        if (cancelled) return;
        if (result === "none" || result === "gone") {
          if (result === "gone") {
            setMessage({ text: "That game no longer exists. Start a new one!", kind: "info" });
          }
          navigate("/live-game/setup", { replace: true });
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // Only (re)load when the screen opens or the player taps "Try again".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Keyboard shortcuts. The handler always sees the latest actions via a ref.
  const keys = useRef({});
  keys.current = { roll, hold, tutorialOpen, openTutorial, hasSound, setHasSound };
  useEffect(() => {
    function onKeyDown(e) {
      const k = keys.current;
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || k.tutorialOpen) return;
      const target = e.target;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return;
      const key = e.key.toLowerCase();
      // Space on a focused button/link already activates it natively.
      if (key === " " && target.closest?.("button, a, [role=radio]")) return;
      if (key === " " || key === "r") {
        e.preventDefault();
        k.roll();
      } else if (key === "p" || key === "h") {
        e.preventDefault();
        k.hold();
      } else if (key === "m") {
        k.setHasSound(!k.hasSound);
      } else if (key === "?" || key === "/") {
        e.preventDefault();
        k.openTutorial();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isLoaded = playerData.length > 0;
  useEffect(() => {
    // First time anyone opens a game, show the tutorial.
    if (isLoaded && !hasSeenTutorial()) openTutorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);
  useEffect(() => {
    if (isLoaded) resumeBotIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  if (playerData.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-white p-4 text-center">
        {loadError ? (
          <>
            <p role="alert" className="max-w-md">{loadError}</p>
            <button
              onClick={() => setAttempt((n) => n + 1)}
              className="rounded px-8 py-3 bg-[#D30CBD] font-bold hover:scale-95 duration-300"
            >
              Try again
            </button>
            <Link to="/live-game/setup" className="underline">
              Back to setup
            </Link>
          </>
        ) : (
          <p role="status">Loading your game…</p>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Phones: header + status stay pinned to the top of the whole page */}
      <div className="md:hidden sticky top-0 z-20 space-y-2 bg-[#111111e6] backdrop-blur-sm pb-2">
        <Navbar />
        <div className="px-2">
          <StatusBanner />
        </div>
      </div>
      <div className="md:grid md:grid-cols-[minmax(auto,_200px)_1fr_minmax(auto,_200px)] lg:grid-cols-[minmax(auto,_250px)_1fr_minmax(auto,_250px)] xl:grid-cols-[auto_1fr_minmax(auto,_300px)] relative">
        <DiceSection />
        <div className=" space-y-2 p-2">
          <div className="hidden md:block sticky top-0 z-20 space-y-2">
            <Navbar />
            <StatusBanner />
          </div>
          <PlayerTable playerData={playerData} currentPlayer={currentPlayer} />
        </div>
        <CurrentPlayerMobile playerData={playerData} currentPlayer={currentPlayer} />
        <DiceSectionMobile />

        <StatsSection playerData={playerData} currentPlayer={currentPlayer} />
        <StatsSectionMobile playerData={playerData} currentPlayer={currentPlayer} />
        {isGameOver ? (
          <GameOver playerData={playerData} currentPlayer={currentPlayer} setIsContinue={setIsContinue} />
        ) : (
          <></>
        )}
      </div>
    </>
  );
}
