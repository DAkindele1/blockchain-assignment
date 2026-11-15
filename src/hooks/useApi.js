import { useCallback, useEffect, useState } from "react";

// Runs an API call on mount and exposes loading / error / retry state.
export default function useApi(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    fn()
      .then((data) => !cancelled && setState({ data, error: "", loading: false }))
      .catch((err) => !cancelled && setState({ data: null, error: err.message, loading: false }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { ...state, reload };
}
