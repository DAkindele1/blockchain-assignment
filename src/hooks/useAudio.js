import { useRef } from "react";
import { useGreedyPigContext } from "src/context/useGreedyPigContext";

export default function useAudio(src) {
  const { hasSound } = useGreedyPigContext();
  const audio = useRef(null);
  if (!audio.current) audio.current = new Audio(src); // created once, not every render
  if (!hasSound) return;
  return audio.current;
}
