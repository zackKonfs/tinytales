import { useEffect, useMemo, useState } from "react";
import { loadSignedPhotoUrls } from "./childJournal.api";
import { modalStyles } from "./childJournal.styles";

function formatDateLine(entry) {
  const raw = entry?.created_at || entry?.entry_date;
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";

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

  return `${day}${suffix} ${month} ${year}, ${weekday}`;
}

/**
 * EntryViewerModal (read-only)
 * Props:
 * - isOpen: boolean
 * - entry: entry object
 * - onClose: () => void
 */
export default function EntryViewerModal({ isOpen, entry, onClose }) {
  const [photoUrls, setPhotoUrls] = useState([]);
  const [loading, setLoading] = useState(false);

  const dateLine = useMemo(() => formatDateLine(entry), [entry]);

  useEffect(() => {
    if (!isOpen || !entry?.id) return;

    let alive = true;
    setLoading(true);
    setPhotoUrls([]);

    (async () => {
      try {
        const urls = await loadSignedPhotoUrls(entry.id);
        if (!alive) return;
        setPhotoUrls((urls || []).slice(0, 3));
      } catch {
        if (!alive) return;
        setPhotoUrls([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, entry?.id]);

  if (!isOpen || !entry) return null;

  return (
    <div style={modalStyles.backdrop} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.notebook}>
          <div style={modalStyles.date}>{dateLine}</div>

          <div style={modalStyles.field}>
            <div style={modalStyles.label}>Title</div>
            <div style={{ padding: "10px 0", fontWeight: 800 }}>
              {entry.title || "Untitled"}
            </div>
          </div>

          <div style={{ ...modalStyles.field, flex: 1 }}>
            <div style={modalStyles.label}>Content</div>
            <div
              style={{
                ...modalStyles.textarea,
                height: 330,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {entry.content || ""}
            </div>
          </div>

          <div style={modalStyles.bottomSection}>
            <div style={modalStyles.photoRow}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={modalStyles.photoSlot}>
                  {photoUrls[i] ? (
                    <img src={photoUrls[i]} alt="" style={modalStyles.photoImg} />
                  ) : (
                    <span style={modalStyles.plus}>{loading ? "…" : ""}</span>
                  )}
                </div>
              ))}
            </div>

            <div style={modalStyles.actions}>
              <button style={modalStyles.secondary} onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}