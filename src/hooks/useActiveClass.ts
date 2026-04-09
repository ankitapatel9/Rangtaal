import { useEffect, useState } from "react";
import { getActiveClass } from "../lib/classes";
import { ClassDoc } from "../types/class";

export interface UseActiveClassState {
  class_: ClassDoc | null;
  loading: boolean;
}

export function useActiveClass(): UseActiveClassState {
  const [state, setState] = useState<UseActiveClassState>({
    class_: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    getActiveClass().then((c) => {
      if (!cancelled) setState({ class_: c, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
