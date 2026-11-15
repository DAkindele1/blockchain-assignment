import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "src/api/client";
import useApi from "src/hooks/useApi";
import Page, { LoadState } from "src/components/Page";

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
      <form onSubmit={lookUp} className="flex gap-2 justify-center">
        <label htmlFor="player-search" className="sr-only">Look up a player</label>
        <input
          id="player-search"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Look up a player's stats"
          maxLength={24}
          className="p-2 bg-[#ffffff20] border rounded-md w-full max-w-xs"
        />
        <button className="rounded px-4 bg-[#D30CBD] font-bold hover:scale-95 duration-300">Search</button>
      </form>

      <LoadState loading={loading} error={error} onRetry={reload}>
        {data && data.players.length === 0 ? (
          <div className="text-center space-y-4 py-6">
            <p>No finished games yet. Be the first on the board!</p>
            <Link to="/live-game/setup?mode=bot" className="inline-block rounded px-8 py-3 bg-[#D30CBD] font-bold">
              Play now
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto bg-[#ffffff10] border rounded-lg">
            <table className="w-full text-center">
              <caption className="sr-only">Top players ranked by wins</caption>
              <thead>
                <tr className="bg-[#ffffff20] text-sm md:text-base">
                  <th scope="col" className="p-3">#</th>
                  <th scope="col" className="p-3 text-left">Player</th>
                  <th scope="col" className="p-3">Wins</th>
                  <th scope="col" className="p-3">Games</th>
                  <th scope="col" className="p-3">Win rate</th>
                  <th scope="col" className="p-3">Beat computer</th>
                </tr>
              </thead>
              <tbody>
                {data?.players.map((p) => (
                  <tr key={p.name} className="border-t border-[#ffffff30]">
                    <td className="p-3">{p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : p.rank}</td>
                    <td className="p-3 text-left">
                      <Link to={`/player/${encodeURIComponent(p.name)}`} className="underline hover:text-[#D30CBD]">
                        {p.name}
                      </Link>
                    </td>
                    <td className="p-3 font-bold">{p.wins}</td>
                    <td className="p-3">{p.games}</td>
                    <td className="p-3">{p.winRate}%</td>
                    <td className="p-3">{p.botWins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LoadState>
      <p className="text-center text-sm text-[#ffffffa0]">Only finished games count. The computer is never ranked.</p>
    </Page>
  );
}
