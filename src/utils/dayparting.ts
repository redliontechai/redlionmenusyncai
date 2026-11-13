import { Category, Schedule } from '../types/menu';

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function getCurrentHHMM(simulatedTimeOverride: string | null): string {
  if (simulatedTimeOverride) return simulatedTimeOverride;
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function getActiveDaypartSchedule(
  schedules: Schedule[],
  branchId: string,
  screenId: string | null,
  simulatedTimeOverride: string | null
): Schedule | null {
  const currentHHMM = getCurrentHHMM(simulatedTimeOverride);
  const currentMin = timeToMinutes(currentHHMM);
  const currentDay = new Date().getDay();

  const matching = schedules
    .filter((s) => {
      if (!s.is_active) return false;
      if (s.branch_id !== branchId) return false;
      if (s.screen_id && screenId && s.screen_id !== screenId) return false;
      if (!s.days_of_week.includes(currentDay)) return false;

      const startMin = timeToMinutes(s.start_time);
      const endMin = timeToMinutes(s.end_time);

      if (startMin <= endMin) {
        return currentMin >= startMin && currentMin <= endMin;
      } else {
        // Overnight schedule (e.g. 22:00 to 02:00)
        return currentMin >= startMin || currentMin <= endMin;
      }
    })
    .sort((a, b) => b.priority - a.priority);

  return matching[0] || null;
}

export function filterCategoriesForActiveSchedule(
  categories: Category[],
  activeSchedule: Schedule | null
): Category[] {
  const activeCats = categories
    .filter((c) => c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (!activeSchedule || activeSchedule.category_ids.length === 0) {
    return activeCats;
  }

  const filtered = activeCats.filter((c) =>
    activeSchedule.category_ids.includes(c.id)
  );
  return filtered.length > 0 ? filtered : activeCats;
}

