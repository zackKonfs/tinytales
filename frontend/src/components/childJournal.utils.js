// childJournal.utils.js

const MIN_YEAR = 1950;
const MAX_YEAR = new Date().getFullYear();

export function formatToday() {
  const d = new Date();
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
      ? "rd"
      : "th";
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  const weekday = d.toLocaleString("en-US", { weekday: "long" });
  return `Today is ${day}${suffix} ${month} ${year}, ${weekday}`;
}

export function formatEntryDateTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-SG", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function localDateKeyFromISO(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key) {
  if (!key || typeof key !== "string") return null;
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex, day };
}

export function dateKeyFromEntry(e) {
  const raw = e?.entry_date;
  if (raw) {
    const s = String(raw);
    if (s.length >= 10) return s.slice(0, 10);
  }
  return localDateKeyFromISO(e?.created_at);
}

export function sortAscByTime(a, b) {
  const ta = new Date(a?.created_at || a?.entry_date || 0).getTime();
  const tb = new Date(b?.created_at || b?.entry_date || 0).getTime();
  return ta - tb;
}

export function sortDescByTime(a, b) {
  const ta = new Date(a?.created_at || a?.entry_date || 0).getTime();
  const tb = new Date(b?.created_at || b?.entry_date || 0).getTime();
  return tb - ta;
}

export function capFirst(s) {
  const t = String(s ?? "").trim();
  if (!t) return "";
  return t[0].toUpperCase() + t.slice(1);
}

export function monthClamp(y, m) {
  if (y < MIN_YEAR) return { y: MIN_YEAR, m: 0 };
  if (y > MAX_YEAR) return { y: MAX_YEAR, m: 11 };
  if (y === MIN_YEAR && m < 0) return { y: MIN_YEAR, m: 0 };
  if (y === MAX_YEAR && m > 11) return { y: MAX_YEAR, m: 11 };
  if (m < 0) return { y: y - 1, m: 11 };
  if (m > 11) return { y: y + 1, m: 0 };
  return { y, m };
}

// ===== Persist calendar view in sessionStorage =====
function viewStorageKey(childId) {
  return childId ? `tt_child_view_${childId}` : "tt_child_view_unknown";
}

export function loadSavedView(childId) {
  try {
    const raw = sessionStorage.getItem(viewStorageKey(childId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.year !== "number") return null;
    if (typeof parsed?.monthIndex !== "number") return null;
    if (parsed.monthIndex < 0 || parsed.monthIndex > 11) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveView(childId, year, monthIndex) {
  try {
    sessionStorage.setItem(viewStorageKey(childId), JSON.stringify({ year, monthIndex }));
  } catch {
    // ignore
  }
}

export function getBirthdayKeyForYear(dob, year) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;

  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const YEAR_RANGE = { MIN_YEAR, MAX_YEAR };