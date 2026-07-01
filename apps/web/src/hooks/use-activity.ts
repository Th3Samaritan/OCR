import * as React from "react";
import {
  computeStats,
  getActivity,
  subscribeActivity,
  type ActivityEvent,
  type ActivityStats,
} from "@/lib/activity";

/** Subscribe a component to the local activity log + derived stats. */
export function useActivity(): { events: ActivityEvent[]; stats: ActivityStats } {
  const [events, setEvents] = React.useState<ActivityEvent[]>(() => getActivity());

  React.useEffect(() => {
    const refresh = () => setEvents(getActivity());
    refresh();
    return subscribeActivity(refresh);
  }, []);

  const stats = React.useMemo(() => computeStats(events), [events]);
  return { events, stats };
}
