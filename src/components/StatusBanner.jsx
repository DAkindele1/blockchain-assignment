// Shows the latest thing that happened in the game ("Ada rolled a 4",
// "Couldn't reach the server"...). It is also a polite live region, so screen
// readers announce every update without the player having to look for it.
import { useLiveGameContext } from "src/context/useLiveGameContext";

const STYLES = {
  info: "bg-[#ffffff15] border-[#ffffff40] text-white",
  good: "bg-[#16a34a30] border-[#16a34a] text-[#bbf7d0]",
  bad: "bg-[#D30C0C30] border-[#D30C0C] text-[#fecaca]",
  error: "bg-[#D30C0C50] border-[#f87171] text-white",
};

export default function StatusBanner() {
  const { message } = useLiveGameContext();
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {message && (
        <div
          className={`${STYLES[message.kind] || STYLES.info} border rounded-lg px-4 py-2 text-center text-sm lg:text-base`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
