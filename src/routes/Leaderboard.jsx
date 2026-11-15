import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaSearch, FaTrophy } from "react-icons/fa";
import { api } from "src/api/client";
import useApi from "src/hooks/useApi";
import Page, { LoadState } from "src/components/Page";

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_STYLES = [
  "border-[#facc1566] bg-[#facc1514] md:order-2 md:-translate-y-3",
  "border-[#cbd5e166] bg-[#cbd5e114] md:order-1",
  "border-[#c0845a66] bg-[#c0845a14] md:order-3",
];

function PodiumCard({ player, index }) {
  return (
    <Link
      to={`/player/${encodeURIComponent(player.name)}`}
      className={`group rounded-2xl border p-4 text-center transition duration-300 hover:-translate-y-1 hover:bg-[#ffffff20] ${PODIUM_STYLES[index]}`}
    >
      <span className="text-3xl" aria-hidden="true">{MEDALS[index]}</span>
      <p className="mt-2 truncate font-bold group-hover:text-[#f0a8eb]">{player.name}</p>
      <p className="mt-1 text-2xl font-black">{player.wins}</p>
      <p className="text-xs uppercase tracking-wider text-[#ffffffa0]">wins</p>
      <p className="mt-3 text-sm text-[#ffffffb8]">{player.winRate}% win rate</p>
    </Link>
  );
}

export default function Leaderboard() {
  const { data, error, loading, reload } = useApi(() => api.leaderboard());
  const [name, setName] = useState("");
  const navigate = useNavigate();

  function lookUp(e) {
    e.preventDefault();
    if (name.trim()) navigate(`/player/${encodeURIComponent(name.trim())}`);
  }

  return (
    <Page title="Leaderboard">
      <div className="space-y-2 text-center">
        <p className="text-[#ffffffb0]">The bravest pigs rise to the top.</p>
        <form onSubmit={lookUp} className="mx-auto flex max-w-md gap-2">
          <label htmlFor="player-search" className="sr-only">Look up a player</label>
          <input
            id="player-search"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Look up a player's stats"
            maxLength={24}
            className="min-w-0 grow rounded-lg border border-[#ffffff35] bg-[#ffffff15] px-3 py-2 placeholder:text-[#ffffff70]"
          />
          <button className="flex items-center gap-2 rounded-lg bg-[#D30CBD] px-4 py-2 font-bold transition hover:bg-[#ed28d5]" aria-label="Search player">
            <FaSearch size={13} aria-hidden="true" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>
      </div>

      <LoadState loading={loading} error={error} onRetry={reload}>
        {data && data.players.length === 0 ? (
          <div className="space-y-4 rounded-2xl border border-[#ffffff25] bg-[#ffffff0d] py-10 text-center">
            <FaTrophy className="mx-auto text-4xl text-[#facc15]" aria-hidden="true" />
            <p>No finished games yet. Be the first on the board!</p>
            <Link to="/live-game/setup?mode=bot" className="inline-block rounded px-8 py-3 bg-[#D30CBD] font-bold">
              Play now
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <section aria-label="Top three players" className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {data?.players.slice(0, 3).map((player, index) => (
                <PodiumCard key={player.name} player={player} index={index} />
              ))}
            </section>
            <div className="overflow-x-auto rounded-2xl border border-[#ffffff25] bg-[#ffffff0d]">
            <table className="w-full min-w-[620px] text-center">
              <caption className="sr-only">Top players ranked by wins</caption>
              <thead className="bg-[#ffffff18] text-left text-xs uppercase tracking-wider text-[#ffffffa0]">
                <tr>
                  <th scope="col" className="px-4 py-3">Rank</th>
                  <th scope="col" className="px-4 py-3">Player</th>
                  <th scope="col" className="px-4 py-3 text-right">Wins</th>
                  <th scope="col" className="px-4 py-3 text-right">Games</th>
                  <th scope="col" className="px-4 py-3 text-right">Win rate</th>
                  <th scope="col" className="px-4 py-3 text-right">Vs computer</th>
                </tr>
              </thead>
              <tbody>
                {data?.players.map((p) => (
                  <tr key={p.name} className="border-t border-[#ffffff18] transition hover:bg-[#ffffff0d]">
                    <td className="px-4 py-3 font-bold">{p.rank <= 3 ? MEDALS[p.rank - 1] : p.rank}</td>
                    <td className="px-4 py-3 text-left">
                      <Link to={`/player/${encodeURIComponent(p.name)}`} className="font-semibold hover:text-[#f0a8eb]">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{p.wins}</td>
                    <td className="px-4 py-3 text-right text-[#ffffffc0]">{p.games}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold">{p.winRate}%</span>
                      <span className="ml-2 hidden h-1.5 w-16 overflow-hidden rounded-full bg-[#ffffff20] align-middle sm:inline-block">
                        <span className="block h-full rounded-full bg-[#D30CBD]" style={{ width: `${p.winRate}%` }} />
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#ffffffc0]">{p.botWins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </LoadState>
      <p className="text-center text-sm text-[#ffffffa0]">Only finished games count. The computer is never ranked.</p>
    </Page>
  );
}
