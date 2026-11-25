import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
/** Fetch an API resource with cancellation, loading/error states, and explicit refresh. */
export function useResource(path) {
  const [state, setState] = useState({ data: null, error: '', loading: Boolean(path) });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api(path, { signal: controller.signal }).then(data => setState({ key: path + ':' + version, data, error: '', loading: false })).catch(error => { if (error.name !== 'AbortError') setState({ key: path + ':' + version, data: null, error: error.message, loading: false }); });
    return () => controller.abort();
  }, [path, version]);
  return state.key === path + ':' + version ? { ...state, reload } : { data: null, error: '', loading: Boolean(path), reload };
}
