// src/store/useActivity.ts
import { useAppContext } from "./AppContext";

export function useActivity() {
  const { loading, activityLog } = useAppContext();
  return { loading, activityLog };
}
