import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import { fetchJson, loadSignedPhotoUrls } from "./childJournal.api";
import { modalStyles } from "./childJournal.styles";

function formatDateLine(entry) {
  const raw = entry?.created_at || entry?.entry_date;
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  const weekday = d.toLocaleString("en-US", { weekday: "long" });
  return `${day}${suffix} ${month} ${year}, ${weekday}`;
}

/**
 * EntryViewerModal (read-only)
 *
 * Props:
 * - isOpen: boolean
 * - entry: { id, title, content, created_at, entry_date, photo_paths } | null
 * - onClose: () => void
 */
export default function EntryViewerModal({ isOpen, entry, onClose }) {
  const [photoUrls, setPhotoUrls] = useState([]);
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => (entry?.title || "").trim() || "Untitled", [entry]);
  const content = useMemo(() => (entry?.content || "").trim() || "", [entry]);
  const dateLine = useMemo(() => formatDateLine(entry), [entry]);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!isOpen || !entry?.id) return;

      const hasPaths = Array.isArray(entry.photo_paths) && entry.photo_paths.length > 0;
      if (!hasPaths) {
        setPhotoUrls([]);
        return;
      }

      setLoading(true);
      try {
        const urls = await loadSignedPhotoUrls(entry.id);
        if (!alive) return;
        setPhotoUrls((urls || []).slice(0, 3));
      } catch {
        if (!alive) return;
        setPhotoUrls([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [isOpen, entry?.id, entry?.photo_paths]);

  if (!isOpen || !entry) return null;

  return (
    <div style={modalStyles.backdrop} onClick={() => onClose?.()}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.notebook}>
          <div style={modalStyles.date}>{dateLine}</div>

          <div style={modalStyles.field}>
            <div style={modalStyles.label}>Title</div>
            <div style={viewerStyles.readOnlyTitle} title={title}>
              {title}
            </div>
          </div>

          <div style={{ ...modalStyles.field, flex: 1, marginTop: 10 }}>
            <div style={modalStyles.label}>Content</div>
            <div style={viewerStyles.readOnlyContent}>{content || <span style={{ opacity: 0.6 }}>No content.</span>}</div>
          </div>

          <div style={modalStyles.bottomSection}>
            <div style={viewerStyles.viewerPhotosTitle}>Photos</div>

            {loading ? (
              <div style={{ opacity: 0.7, padding: "8px 0" }}>Loading photos...</div>
            ) : photoUrls.length === 0 ? (
              <div style={{ opacity: 0.7, padding: "8px 0" }}>No photos.</div>
            ) : (
              <div style={viewerStyles.viewerPhotoRow}>
                {photoUrls.map((u, idx) => (
                  <div key={idx} style={viewerStyles.viewerPhotoSlot}>
                    <img src={u} alt="" style={viewerStyles.viewerPhotoImg} />
                  </div>
                ))}
              </div>
            )}

            <div style={{ ...modalStyles.actions, marginTop: 12 }}>
              <button style={modalStyles.secondary} onClick={() => onClose?.()}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const viewerStyles = {
  readOnlyTitle: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #d8cfc2",
    background: "rgba(255,255,255,0.75)",
    fontWeight: 900,
    textAlign: "left",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  readOnlyContent: {
    height: 330,
    borderRadius: 12,
    border: "1px solid #d8cfc2",
    padding: 14,
    fontSize: 16,
    background: "rgba(255,255,255,0.75)",
    overflowY: "auto",
    textAlign: "left",
    whiteSpace: "pre-wrap",
  },
  viewerPhotosTitle: {
    fontWeight: 900,
    fontSize: 12,
    opacity: 0.75,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 10,
  },
  viewerPhotoRow: {
    display: "flex",
    gap: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  viewerPhotoSlot: {
    width: 90,
    height: 90,
    borderRadius: 16,
    background: "rgba(255,255,255,0.55)",
    border: "1px solid rgba(255,255,255,0.75)",
    position: "relative",
    overflow: "hidden",
  },
  viewerPhotoImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
};