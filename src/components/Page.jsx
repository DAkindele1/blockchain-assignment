import Navbar from "src/components/Navbar";

// Shared frame for the simple content pages (leaderboard, player stats).
export default function Page({ title, children }) {
  return (
    <div className="min-h-screen text-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-[5%] md:px-0 py-6 space-y-6">
        <h2 className="pri-font text-3xl md:text-5xl text-center">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function LoadState({ loading, error, onRetry, children }) {
  if (loading) {
    return <p role="status" className="text-center py-10">Loading…</p>;
  }
  if (error) {
    return (
      <div role="alert" className="text-center space-y-4 py-6">
        <p className="bg-[#D30C0C50] border border-[#f87171] rounded-lg px-4 py-2 inline-block">{error}</p>
        <div>
          <button onClick={onRetry} className="rounded px-8 py-3 bg-[#D30CBD] font-bold hover:scale-95 duration-300">
            Try again
          </button>
        </div>
      </div>
    );
  }
  return children;
}
