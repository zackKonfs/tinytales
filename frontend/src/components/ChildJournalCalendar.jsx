import { useMemo } from "react";

/**
 * ChildJournalCalendar
 *
 * Props:
 * - year: number (e.g. 2026)
 * - monthIndex: number (0-11)
 * - entriesByDate: Record<string, any[]>  // key: "YYYY-MM-DD" => entries[]
 * - selectedDateKey: string | null        // "YYYY-MM-DD"
 * - highlightColor: string                // e.g. "#f4b24f"
 * - onPrevMonth: () => void
 * - onNextMonth: () => void
 * - onSelectDate: (dateKey: string) => void
 * - onOpenYearPicker?: () => void
 * - minYear?: number (default 1950)
 * - maxYear?: number (default current year)
 * - birthdayMarks?: Array<{ key: string, color: string, label?: string }>
 */
export default function ChildJournalCalendar({
  year,
  monthIndex,
  entriesByDate,
  selectedDateKey,
  highlightColor = "#f4b24f",
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  onOpenYearPicker,
  minYear = 1950,
  maxYear = new Date().getFullYear(),
  birthdayMarks = [],
}) {
  const monthLabel = useMemo(() => {
    const d = new Date(year, monthIndex, 1);
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  }, [year, monthIndex]);

  const disablePrev = useMemo(() => year === minYear && monthIndex === 0, [year, monthIndex, minYear]);
  const disableNext = useMemo(() => year === maxYear && monthIndex === 11, [year, monthIndex, maxYear]);

  const birthdayMap = useMemo(() => {
    const m = {};
    for (const b of birthdayMarks || []) {
      if (b?.key) m[b.key] = b;
    }
    return m;
  }, [birthdayMarks]);

  const weeks = useMemo(() => {
    const first = new Date(year, monthIndex, 1);
    const startDay = first.getDay(); // 0 = Sun

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

    // We render 6 weeks (42 cells) to keep layout stable
    const cells = [];

    for (let i = 0; i < 42; i++) {
      const dayNum = i - startDay + 1;

      let cellYear = year;
      let cellMonth = monthIndex;
      let inMonth = true;
      let displayDay = dayNum;

      if (dayNum <= 0) {
        // prev month
        inMonth = false;
        cellMonth = monthIndex - 1;
        if (cellMonth < 0) {
          cellMonth = 11;
          cellYear = year - 1;
        }
        displayDay = daysInPrevMonth + dayNum;
      } else if (dayNum > daysInMonth) {
        // next month
        inMonth = false;
        cellMonth = monthIndex + 1;
        if (cellMonth > 11) {
          cellMonth = 0;
          cellYear = year + 1;
        }
        displayDay = dayNum - daysInMonth;
      }

      const key = `${cellYear}-${String(cellMonth + 1).padStart(2, "0")}-${String(displayDay).padStart(2, "0")}`;
      const count = entriesByDate?.[key]?.length || 0;

      const bday = birthdayMap[key] || null;

      cells.push({
        key,
        inMonth,
        displayDay,
        count,
        bday,
      });
    }

    // split to 6 rows
    const rows = [];
    for (let r = 0; r < 6; r++) {
      rows.push(cells.slice(r * 7, r * 7 + 7));
    }
    return rows;
  }, [year, monthIndex, entriesByDate, birthdayMap]);

  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div style={ui.wrap}>
      <div style={ui.header}>
        <button
          className="tt-arrow"
          style={{ ...ui.navBtn, ...(disablePrev ? ui.navBtnDisabled : {}) }}
          onClick={disablePrev ? undefined : onPrevMonth}
          aria-label="Previous month"
          disabled={disablePrev}
          title={disablePrev ? `Min year is ${minYear}` : "Previous month"}
        >
          ‹
        </button>

        <div style={ui.headerMid}>
          <div style={ui.monthLabel}>{monthLabel}</div>

          {onOpenYearPicker ? (
            <button className="tt-btn" style={ui.yearBtn} onClick={onOpenYearPicker} title="Pick year">
              Year
            </button>
          ) : null}
        </div>

        <button
          className="tt-arrow"
          style={{ ...ui.navBtn, ...(disableNext ? ui.navBtnDisabled : {}) }}
          onClick={disableNext ? undefined : onNextMonth}
          aria-label="Next month"
          disabled={disableNext}
          title={disableNext ? `Max year is ${maxYear}` : "Next month"}
        >
          ›
        </button>
      </div>

      <div style={ui.grid}>
        {weekday.map((w) => (
          <div key={w} style={ui.weekday}>
            {w}
          </div>
        ))}

        {weeks.map((row, rIdx) =>
          row.map((cell) => {
            const isSelected = selectedDateKey && cell.key === selectedDateKey;
            const hasEntries = cell.count > 0;

            const border = isSelected ? `2px solid ${highlightColor}` : "1px solid rgba(0,0,0,0.10)";

            const bg = isSelected
              ? "rgba(255,255,255,0.85)"
              : cell.bday
              ? `${cell.bday.color}22`
              : hasEntries
              ? "rgba(244,178,79,0.15)"
              : "rgba(255,255,255,0.65)";

            const dotColor = cell.bday ? cell.bday.color : highlightColor;

            return (
              <button
                key={`${rIdx}-${cell.key}`}
                className="tt-btn"
                style={{
                  ...ui.cell,
                  border,
                  background: bg,
                  opacity: cell.inMonth ? 1 : 0.38,
                }}
                onClick={() => onSelectDate?.(cell.key)}
                title={
                  cell.bday
                    ? cell.bday.label || "Birthday"
                    : hasEntries
                    ? `${cell.count} entr${cell.count === 1 ? "y" : "ies"}`
                    : ""
                }
              >
                <div style={ui.cellTop}>
                  <div style={ui.dayNum}>{cell.displayDay}</div>

                  {hasEntries ? (
                    <div style={{ ...ui.badge, borderColor: highlightColor, color: "#245a52" }}>{cell.count}</div>
                  ) : cell.bday ? (
                    <div style={{ ...ui.bdayBadge, borderColor: cell.bday.color, color: cell.bday.color }}>
                      🎂
                    </div>
                  ) : null}
                </div>

                {(hasEntries || cell.bday) ? (
                  <div style={{ ...ui.dot, background: dotColor }} />
                ) : (
                  <div style={ui.dotSpacer} />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

const ui = {
  wrap: {
    width: "min(680px, 92vw)",
    margin: "22px auto 0",
    background: "rgba(255,255,255,0.55)",
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 10px 20px rgba(0,0,0,0.06)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  headerMid: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  monthLabel: {
    fontWeight: 900,
    color: "#245a52",
    letterSpacing: 0.2,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.75)",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 900,
    transition: "transform 120ms ease, filter 120ms ease",
  },
  navBtnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
    filter: "grayscale(0.3)",
  },
  yearBtn: {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.85)",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
    transition: "transform 120ms ease, filter 120ms ease",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 8,
  },
  weekday: {
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.65,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textAlign: "center",
    paddingBottom: 2,
  },
  cell: {
    borderRadius: 14,
    padding: 10,
    minHeight: 68,
    textAlign: "left",
    cursor: "pointer",
    outline: "none",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "transform 120ms ease, filter 120ms ease",
  },
  cellTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dayNum: {
    fontWeight: 900,
    fontSize: 14,
    color: "#3b2a1d",
  },
  badge: {
    minWidth: 24,
    height: 22,
    padding: "0 6px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "rgba(255,255,255,0.9)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 900,
  },
  bdayBadge: {
    minWidth: 24,
    height: 22,
    padding: "0 6px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "rgba(255,255,255,0.95)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 900,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    alignSelf: "flex-end",
    opacity: 0.95,
  },
  dotSpacer: {
    width: 10,
    height: 10,
    borderRadius: 999,
    alignSelf: "flex-end",
    opacity: 0,
  },
};