import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";
import { LiveGameContext } from "src/context/useLiveGameContext";
import { getInitialPlayerData } from "src/utils/live_game/getInitialData";
import { toPlayerData, readSession, writeSession } from "src/utils/live_game/gameMapping";
import { api, ApiError } from "src/api/client";
import Tutorial from "src/components/Tutorial";
import { prefersReducedMotion, markTutorialSeen } from "src/utils/accessibility";
import useAudio from "src/hooks/useAudio";
import diceRollSound from "src/sound_effect/dice_roll.mp3";
import addPlayerSound from "src/sound_effect/add_player.mp3";
import loseSound from "src/sound_effect/lose_sound.mp3";
import celebrationSound from "src/sound_effect/celebration.mp3";
import invalidSound from "src/sound_effect/invalid.mp3";

const ROLL_MS = 1500; // how long the die "tumbles" before showing the server's number
const BOT_ROLL_MS = 900; // the computer's rolls are quicker so its turn does not drag
const BOT_PAUSE_MS = 600;
const GAME_OVER_DELAY_MS = 1000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function playSound(audio) {
  if (!audio) return;
  audio.currentTime = 0;
  audio.play()?.catch(() => {}); // browsers may block sound before the first tap
}

function LivePage() {
  const { preloadSrcList, pigPetNames } = useGreedyPigContext();
  const pigs = useMemo(() => preloadSrcList.filter((src) => src.includes("pig")), [preloadSrcList]);

  // Setup screen state (who is going to play)
  const [setupPlayers, setSetupPlayers] = useState(
    getInitialPlayerData(preloadSrcList.slice(0, 9), pigPetNames)
  );
  const [maxPoints, setMaxPoints] = useState(100);
  const [difficulty, setDifficulty] = useState("medium");

  // In-game state (always a copy of what the server says)
  const [playerData, setPlayerData] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [diceValue, setDiceValue] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [session, setSession] = useState(readSession); // { id, token } of the game being played

  // UI state
  const [isRolling, setIsRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { text, kind }
  const [changeBackground, setChangeBackground] = useState(false);
  const [isContinue, setIsContinue] = useState(false);
  const [numberRolled, setNumberRolled] = useState(0);
  const [gameHistory, setGameHistory] = useState([]);
  const [isRunning, setIsRunning] = useState("?");
  const [tutorialOpen, setTutorialOpen] = useState(false);

  const busyRef = useRef(false);
  const latest = useRef({});
  latest.current = { session, playerData, currentPlayer, isGameOver };

  const rollAudio = useAudio(diceRollSound);
  const addPlayerAudio = useAudio(addPlayerSound);
  const loseAudio = useAudio(loseSound);
  const celebrationAudio = useAudio(celebrationSound);
  const invalidAudio = useAudio(invalidSound);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  function openTutorial() {
    setTutorialOpen(true);
  }
  const closeTutorial = useCallback(() => {
    markTutorialSeen();
    setTutorialOpen(false);
  }, []);

  // Tumble time: very short for people who asked their device to reduce motion.
  const rollMs = () => (prefersReducedMotion() ? 300 : ROLL_MS);
  const botRollMs = () => (prefersReducedMotion() ? 300 : BOT_ROLL_MS);

  function say(text, kind = "info") {
    setMessage({ text, kind });
  }

  // Copy the server's version of the game into React state.
  function applyGame(game, { instantGameOver = false } = {}) {
    setPlayerData(toPlayerData(game, pigs));
    setCurrentPlayer(game.currentPlayer);
    setDiceValue(game.lastRoll);
    setMaxPoints(game.maxPoints);
    if (game.status === "finished") {
      if (instantGameOver) {
        setIsGameOver(true);
      } else {
        setTimeout(() => {
          if (!isMounted.current) return;
          playSound(celebrationAudio);
          setIsGameOver(true);
        }, GAME_OVER_DELAY_MS);
      }
    } else {
      setIsGameOver(false);
    }
  }

  function describe(event, game) {
    const name = (i) => game.players[i].name;
    const next = name(game.currentPlayer);
    switch (event.type) {
      case "roll": {
        const running = game.players[event.player].runningPoints;
        return [`${name(event.player)} rolled a ${event.value}. Turn total: ${running}.`, "info"];
      }
      case "bust":
        return [`${name(event.player)} rolled a 1 and lost this turn's points. ${next}'s turn.`, "bad"];
      case "hold":
        return [`${name(event.player)} banked ${event.banked} points. ${next}'s turn.`, "good"];
      case "win":
        return [`${name(event.player)} rolled a ${event.value} and wins with ${game.maxPoints} points!`, "good"];
      default:
        return ["", "info"];
    }
  }

  // Something went wrong: tell the player, and re-sync with the server if the
  // error suggests our copy of the game may be out of date.
  async function handleActionError(err) {
    const apiErr = err instanceof ApiError ? err : new ApiError("Something unexpected happened.");
    say(apiErr.message, "error");
    playSound(invalidAudio);
    const s = latest.current.session;
    if (!s || apiErr.network || ![409, 422].includes(apiErr.status)) return;
    try {
      const { game } = await api.getGame(s.id);
      applyGame(game, { instantGameOver: true });
    } catch {
      /* the message above is enough */
    }
  }

  async function roll() {
    const { session: s, isGameOver: over } = latest.current;
    if (busyRef.current || over || !s) return;
    busyRef.current = true;
    setBusy(true);
    setIsRolling(true);
    setChangeBackground(true);
    playSound(rollAudio);
    let next = null;
    try {
      // Wait for BOTH the server's answer and the tumble animation.
      const [res] = await Promise.all([api.roll(s.id, s.token), sleep(rollMs())]);
      if (!isMounted.current) return;
      applyGame(res.game);
      const [text, kind] = describe(res.event, res.game);
      say(text, kind);
      if (res.event.type === "bust") playSound(loseAudio);
      next = res.game;
    } catch (err) {
      await handleActionError(err);
    } finally {
      busyRef.current = false;
      rollAudio?.pause(); // the sound is longer than the tumble, stop it when the die lands
      if (isMounted.current) {
        setIsRolling(false);
        setChangeBackground(false);
        setBusy(false);
      }
    }
    if (isMounted.current && isComputersTurn(next)) await runBotTurn({ delay: 1400 });
  }

  async function hold() {
    const { session: s, isGameOver: over, playerData: players, currentPlayer: cp } = latest.current;
    if (busyRef.current || over || !s) return;
    if (players[cp]?.running_points === 0) {
      say("Roll at least once before passing, so you have points to bank.", "info");
      playSound(invalidAudio);
      return;
    }
    busyRef.current = true;
    setBusy(true);
    let next = null;
    try {
      const res = await api.hold(s.id, s.token);
      if (!isMounted.current) return;
      playSound(addPlayerAudio);
      applyGame(res.game);
      const [text, kind] = describe(res.event, res.game);
      say(text, kind);
      next = res.game;
    } catch (err) {
      await handleActionError(err);
    } finally {
      busyRef.current = false;
      if (isMounted.current) setBusy(false);
    }
    if (isMounted.current && isComputersTurn(next)) await runBotTurn({ delay: 1400 });
  }

  function isComputersTurn(game) {
    return Boolean(game) && game.status === "active" && game.players[game.currentPlayer].isBot;
  }

  // The SERVER plays the computer's whole turn and returns every step; we
  // just replay those steps with the dice animation so it feels like a player.
  async function runBotTurn({ delay = 0 } = {}) {
    const { session: s } = latest.current;
    if (busyRef.current || !s) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (delay) await sleep(delay); // let the player read what just happened
      if (!isMounted.current) return;
      say("The computer is thinking…");
      const [res] = await Promise.all([api.botTurn(s.id, s.token), sleep(700)]);
      const botIndex = res.steps[0].player;
      const name = res.game.players[botIndex].name;
      for (const step of res.steps) {
        if (!isMounted.current) return;
        if (step.type === "hold") {
          await sleep(BOT_PAUSE_MS / 2);
          playSound(addPlayerAudio);
          setPlayerData((prev) =>
            prev.map((p, i) =>
              i === botIndex
                ? { ...p, total_points: p.total_points + step.banked, running_points: 0 }
                : p
            )
          );
          say(`${name} banked ${step.banked} points. Your turn!`, "good");
          continue;
        }
        setIsRolling(true);
        setChangeBackground(true);
        playSound(rollAudio);
        await sleep(botRollMs());
        rollAudio?.pause();
        if (!isMounted.current) return;
        setIsRolling(false);
        setChangeBackground(false);
        setDiceValue(step.value);
        if (step.type === "roll") {
          setPlayerData((prev) =>
            prev.map((p, i) => (i === botIndex ? { ...p, running_points: step.running } : p))
          );
          say(`${name} rolled a ${step.value}. Turn total: ${step.running}.`);
          await sleep(BOT_PAUSE_MS);
        } else if (step.type === "bust") {
          playSound(loseAudio);
          setPlayerData((prev) =>
            prev.map((p, i) => (i === botIndex ? { ...p, running_points: 0 } : p))
          );
          say(`${name} rolled a 1 and lost this turn's points. Your turn!`, "bad");
        } else if (step.type === "win") {
          say(`${name} rolled a ${step.value} and wins with ${res.game.maxPoints} points!`, "bad");
        }
      }
      applyGame(res.game); // the server's version is the final truth
    } catch (err) {
      await handleActionError(err);
    } finally {
      busyRef.current = false;
      rollAudio?.pause();
      if (isMounted.current) {
        setIsRolling(false);
        setChangeBackground(false);
        setBusy(false);
      }
    }
  }

  // If the page was refreshed during the computer's turn, carry on with it.
  function resumeBotIfNeeded() {
    const { playerData: players, currentPlayer: cp, isGameOver: over } = latest.current;
    if (!over && players[cp]?.is_bot) runBotTurn();
  }

  // Called by the Setup screen. Throws an ApiError if the server says no.
  async function startGame({ mode = "friends" } = {}) {
    // Against the computer there is one human; the server adds the bot.
    const humans = mode === "bot" ? setupPlayers.slice(0, 1) : setupPlayers;
    const payload = {
      mode,
      difficulty: mode === "bot" ? difficulty : undefined,
      maxPoints: Number(maxPoints),
      players: humans.map((p) => ({
        name: p.name.trim() || p.tag,
        avatar: p.pig_index,
      })),
    };
    const res = await api.createGame(payload);
    const next = { id: res.game.id, token: res.token };
    writeSession(next);
    setSession(next);
    applyGame(res.game);
    setIsContinue(true);
    const first = res.game.players[0].name;
    say(`Game started. ${first} goes first. Press Space or tap the die to roll.`);
    return res.game;
  }

  // Called when the Game screen opens without a game in memory (e.g. after a
  // page refresh). Returns "ok" | "none" | "gone", or throws on network errors.
  async function loadSavedGame() {
    const s = latest.current.session;
    if (!s) return "none";
    try {
      const { game } = await api.getGame(s.id);
      applyGame(game, { instantGameOver: true });
      setIsContinue(game.status === "active");
      return "ok";
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        writeSession(null);
        setSession(null);
        return "gone";
      }
      throw err;
    }
  }

  return (
    <>
      <div className="bg-[#111111] min-h-screen min-w-full relative z-10 sec-font ">
        <div
          className={`${
            changeBackground
              ? " bg-[#D30CBD] blur-[200px] md:blur-[300px] "
              : diceValue === 1
              ? "bg-[#D30C0C]  blur-[500px] md:blur-[800px]"
              : "bg-[#056FA4]  blur-[500px] md:blur-[800px]"
          } rounded-full w-[800px] h-[800px] -z-10 fixed -bottom-[700px] -left-[700px] md:-bottom-96 md:-left-96 `}
        ></div>
        <div
          className={`${
            changeBackground
              ? "bg-[#056FA4] blur-[200px] md:blur-[300px] "
              : diceValue === 1
              ? "bg-[#D30C0C] blur-[500px] md:blur-[800px] "
              : "bg-[#D30CBD] blur-[500px] md:blur-[800px]"
          } rounded-full w-[800px] h-[800px]  -z-10 fixed -top-[700px] -right-[700px] md:-top-96 md:-right-96`}
        ></div>
        <LiveGameContext.Provider
          value={{
            // setup
            setupPlayers,
            setSetupPlayers,
            maxPoints,
            setMaxPoints,
            difficulty,
            setDifficulty,
            // game
            playerData,
            setPlayerData,
            currentPlayer,
            setCurrentPlayer,
            diceValue,
            setDiceValue,
            isGameOver,
            setIsGameOver,
            session,
            // actions
            roll,
            hold,
            startGame,
            loadSavedGame,
            resumeBotIfNeeded,
            tutorialOpen,
            openTutorial,
            closeTutorial,
            // ui
            isRolling,
            busy,
            message,
            setMessage,
            changeBackground,
            setChangeBackground,
            isContinue,
            setIsContinue,
            numberRolled,
            setNumberRolled,
            gameHistory,
            setGameHistory,
            isRunning,
            setIsRunning,
          }}
        >
          <Outlet />
          <Tutorial open={tutorialOpen} onClose={closeTutorial} />
        </LiveGameContext.Provider>
      </div>
    </>
  );
}

export default LivePage;
