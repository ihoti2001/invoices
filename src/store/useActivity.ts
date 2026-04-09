import { useAppContext } from "./AppContext";

export function useActivity() {
  const { activityLog } = useAppContext();
  return { activityLog };
}
