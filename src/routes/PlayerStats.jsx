import { Link, useParams } from "react-router-dom";
import { api } from "src/api/client";
import useApi from "src/hooks/useApi";
import Page, { LoadState } from "src/components/Page";

function Stat({ label, value }) {
  return (
    <div className="bg-[#ffffff10] border rounded-lg p-4 text-center">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-[#ffffffc0]">{label}</p>
    </div>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function PlayerStats() {
  const { name } = useParams();
  const { data, error, loading, reload } = useApi(() => api.player(name), [name]);

  return (
    <Page title={data?.name || name}>
      <LoadState loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <section aria-label="Stats" className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat label="Games played" value={data.stats.games} />
              <Stat label="Wins" value={data.stats.wins} />
              <Stat label="Losses" value={data.stats.losses} />
              <Stat label="Win rate" value={`${data.stats.winRate}%`} />
              <Stat label="Wins vs computer" value={data.stats.botWins} />
              <Stat label="Current win streak" value={data.stats.winStreak} />
            </section>

            <section aria-label="Match history" className="space-y-2">
              <h2 className="text-xl font-bold">Recent games</h2>
              <ul className="space-y-2">
                {data.history.map((g) => (
                  <li key={g.gameId} className="bg-[#ffffff10] border rounded-lg p-3 flex items-center gap-3">
                    <span
                      className={`shrink-0 w-16 text-center rounded font-bold py-1 ${
                        g.won ? "bg-[#16a34a60] text-[#bbf7d0]" : "bg-[#D30C0C60] text-[#fecaca]"
                      }`}
                    >
                      {g.won ? "WIN" : "LOSS"}
                    </span>
                    <div className="grow text-sm md:text-base">
                      <p>
                        {g.score} pts vs{" "}
                        {g.opponents.map((o) => `${o.name} (${o.score})`).join(", ")}
                      </p>
                      <p className="text-xs text-[#ffffffa0]">
                        {g.mode === "bot" ? `Vs computer · ${g.difficulty}` : "With friends"} · first to {g.maxPoints} ·{" "}
                        {formatDate(g.finishedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </LoadState>
      <p className="text-center">
        <Link to="/leaderboard" className="underline">← Back to leaderboard</Link>
      </p>
    </Page>
  );
}
