import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteParent, fetchChildren, fetchEntries, fetchParents, patchChildActive } from "./devpanel.api";

export function useDevPanel({ isAllowed }) {
  // last API error
  const [lastApiError, setLastApiError] = useState(null);

  // parents
  const [parents, setParents] = useState([]);
  const [parentsLoading, setParentsLoading] = useState(false);
  const [parentsErr, setParentsErr] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [parentQuery, setParentQuery] = useState("");
  const [onlyParentsWithKids, setOnlyParentsWithKids] = useState(true);

  // children
  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [childrenErr, setChildrenErr] = useState("");

  // children filter + sort
  const [childFilter, setChildFilter] = useState("active");
  const [childSort, setChildSort] = useState("created_desc");

  // entries
  const [selectedChild, setSelectedChild] = useState(null);
  const [entries, setEntries] = useState([]);
  const [entriesCache, setEntriesCache] = useState({});
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesErr, setEntriesErr] = useState("");
  const [entriesIncludeInactive, setEntriesIncludeInactive] = useState(false);

  // action loading
  const [childActionLoadingId, setChildActionLoadingId] = useState(null);
  const [parentActionLoadingId, setParentActionLoadingId] = useState(null);

  const setApiError = useCallback((endpoint, status, message) => {
    setLastApiError({
      at: new Date().toISOString(),
      endpoint,
      status,
      message,
    });
  }, []);

  const copyText = useCallback((text) => {
    const val = String(text ?? "");
    if (!val) return;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(val).catch(() => {});
      return;
    }

    try {
      const ta = document.createElement("textarea");
      ta.value = val;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
        // ignore clipboard fallback error
    }
  }, []);

  const getAgeFromDob = useCallback((dob) => {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const age = new Date().getFullYear() - d.getFullYear();
    return age >= 0 ? age : null;
  }, []);

  const formatEntryDateTime = useCallback((input) => {
    if (!input) return "-";
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return "-";

    const day = String(d.getDate()).padStart(2, "0");
    const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
      d.getMonth()
    ];
    const year = d.getFullYear();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const rawHours = d.getHours();
    const ampm = rawHours >= 12 ? "PM" : "AM";
    const hours12 = String(rawHours % 12 || 12).padStart(2, "0");

    return `${day}${month}${year} ${hours12}:${minutes} ${ampm}`;
  }, []);

  const kidsCountByParentId = useMemo(() => {
    const map = {};
    for (const c of children) {
      const pid = c.parent_user_id || "";
      map[pid] = (map[pid] || 0) + 1;
    }
    return map;
  }, [children]);

  const selectedChildTitle = useMemo(() => {
    if (!selectedChild) return "No child selected";
    return selectedChild.name;
  }, [selectedChild]);

  const selectedParentLabel = useMemo(() => {
    if (!selectedParentId) return "All Parents";
    const p = parents.find((x) => x.id === selectedParentId);
    return p?.username || p?.email || selectedParentId;
  }, [selectedParentId, parents]);

  const visibleChildren = useMemo(() => {
    if (!selectedParentId) return children;
    return children.filter((c) => c.parent_user_id === selectedParentId);
  }, [children, selectedParentId]);

  const activeChildren = useMemo(() => visibleChildren.filter((c) => c.is_active), [visibleChildren]);
  const inactiveChildren = useMemo(() => visibleChildren.filter((c) => !c.is_active), [visibleChildren]);

  const shownChildren = useMemo(() => {
    let list = visibleChildren;

    if (childFilter === "active") list = list.filter((c) => c.is_active);
    if (childFilter === "deleted") list = list.filter((c) => !c.is_active);

    list = [...list];

    if (childSort === "created_desc") {
      list.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    } else if (childSort === "created_asc") {
      list.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
    } else if (childSort === "name_az") {
      list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }

    return list;
  }, [visibleChildren, childFilter, childSort]);

  const filteredParents = useMemo(() => {
    const q = parentQuery.trim().toLowerCase();

    const base = !q
      ? parents
      : parents.filter((p) => {
          const label = (p.username || "").toLowerCase();
          const email = (p.email || "").toLowerCase();
          return label.includes(q) || email.includes(q);
        });

    if (!onlyParentsWithKids) return base;
    return base.filter((p) => (kidsCountByParentId[p.id] || 0) > 0);
  }, [parents, parentQuery, onlyParentsWithKids, kidsCountByParentId]);

  const visibleStats = useMemo(() => {
    return {
      active: activeChildren.length,
      deleted: inactiveChildren.length,
      total: visibleChildren.length,
    };
  }, [activeChildren.length, inactiveChildren.length, visibleChildren.length]);

  const parentsStats = useMemo(() => {
    return { loaded: parents.length, shown: filteredParents.length };
  }, [parents.length, filteredParents.length]);

  const entryRows = useMemo(() => {
    return entries.map((e) => ({
      ...e,
      entryDateLabel: formatEntryDateTime(e.created_at || e.entry_date),
    }));
  }, [entries, formatEntryDateTime]);

  const visibleEntries = useMemo(() => {
    if (entriesIncludeInactive) return entryRows;
    return entryRows.filter((e) => e.is_active);
  }, [entryRows, entriesIncludeInactive]);

  const loadParents = useCallback(async () => {
    setParentsErr("");
    setParentsLoading(true);
    try {
      const { endpoint, res, json } = await fetchParents();

      if (!res.ok) {
        setParents([]);
        const msg = json.error || json.message || `Failed (${res.status})`;
        setParentsErr(msg);
        setApiError(endpoint, res.status, msg);
        return;
      }

      setParents(json.parents ?? []);
    } catch (e) {
      setParents([]);
      const msg = String(e);
      setParentsErr(msg);
      setApiError("/api/dev/parents", 0, msg);
    } finally {
      setParentsLoading(false);
    }
  }, [setApiError]);

  const loadChildren = useCallback(async () => {
    setChildrenErr("");
    setChildrenLoading(true);
    try {
      const { endpoint, res, json } = await fetchChildren();

      if (!res.ok) {
        setChildren([]);
        const msg = json.error || json.message || `Failed (${res.status})`;
        setChildrenErr(msg);
        setApiError(endpoint, res.status, msg);
        return;
      }

      setChildren(json.children ?? []);
    } catch (e) {
      setChildren([]);
      const msg = String(e);
      setChildrenErr(msg);
      setApiError("/api/dev/children", 0, msg);
    } finally {
      setChildrenLoading(false);
    }
  }, [setApiError]);

  const resetSelection = useCallback(() => {
    setSelectedChild(null);
    setEntries([]);
    setEntriesErr("");
    setEntriesLoading(false);
  }, []);

  const selectParent = useCallback(
    (parentId) => {
      setSelectedParentId(parentId);
      resetSelection();
    },
    [resetSelection]
  );

  const clearSelection = useCallback(() => {
    resetSelection();
  }, [resetSelection]);

  const clearEntriesCache = useCallback(() => {
    setEntriesCache({});
  }, []);

  const loadEntriesForChild = useCallback(
    async (child) => {
      if (!child?.id) return;

      setSelectedParentId(child.parent_user_id || "");
      setEntriesErr("");
      setSelectedChild(child);

      if (entriesCache[child.id]) {
        setEntries(entriesCache[child.id]);
        return;
      }

      setEntriesLoading(true);
      setEntries([]);
      try {
        const { endpoint, res, json } = await fetchEntries(child.id);

        if (!res.ok) {
          setEntries([]);
          const msg = json.error || json.message || `Failed (${res.status})`;
          setEntriesErr(msg);
          setApiError(endpoint, res.status, msg);
          return;
        }

        const loaded = json.entries ?? [];
        setEntriesCache((prev) => ({ ...prev, [child.id]: loaded }));
        setEntries(loaded);
      } catch (e) {
        setEntries([]);
        const msg = String(e);
        setEntriesErr(msg);
        setApiError(`/api/dev/children/${child.id}/entries`, 0, msg);
      } finally {
        setEntriesLoading(false);
      }
    },
    [entriesCache, setApiError]
  );

  const setChildActive = useCallback(
    async (childId, nextActive) => {
      if (!childId) return;

      const verb = nextActive ? "restore" : "delete";
      if (!window.confirm(`Confirm to ${verb} this child account?`)) return;

      setChildActionLoadingId(childId);
      setChildrenErr("");

      try {
        const { endpoint, res, json } = await patchChildActive(childId, nextActive);

        if (!res.ok) {
          const msg = json.error || json.message || `Failed (${res.status})`;
          setChildrenErr(msg);
          setApiError(endpoint, res.status, msg);
          return;
        }

        const updated = json.child;
        if (updated?.id) {
          setChildren((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
        } else {
          await loadChildren();
        }

        if (selectedChild?.id === childId) {
          setSelectedChild((prev) => (prev ? { ...prev, is_active: nextActive } : prev));
        }
      } catch (e) {
        const msg = String(e);
        setChildrenErr(msg);
        setApiError(`/api/dev/children/${childId}`, 0, msg);
      } finally {
        setChildActionLoadingId(null);
      }
    },
    [loadChildren, selectedChild, setApiError]
  );

  const removeParent = useCallback(
    async (parentId, parentLabel) => {
      if (!parentId) return;
      if (!window.confirm(`Confirm to delete parent account "${parentLabel || "this parent"}"?`)) return;

      setParentActionLoadingId(parentId);
      setParentsErr("");

      try {
        const { endpoint, res, json } = await deleteParent(parentId);
        if (!res.ok) {
          const msg = json.error || json.message || `Failed (${res.status})`;
          setParentsErr(msg);
          setApiError(endpoint, res.status, msg);
          return;
        }

        const removedChildIds = children.filter((c) => c.parent_user_id === parentId).map((c) => c.id);
        setParents((prev) => prev.filter((p) => p.id !== parentId));
        setChildren((prev) => prev.filter((c) => c.parent_user_id !== parentId));
        setEntriesCache((prev) => {
          const next = { ...prev };
          for (const cid of removedChildIds) delete next[cid];
          return next;
        });

        if (selectedParentId === parentId) {
          setSelectedParentId("");
          resetSelection();
          return;
        }

        if (selectedChild && removedChildIds.includes(selectedChild.id)) {
          resetSelection();
        }
      } catch (e) {
        const msg = String(e);
        setParentsErr(msg);
        setApiError(`/api/dev/parents/${parentId}`, 0, msg);
      } finally {
        setParentActionLoadingId(null);
      }
    },
    [children, resetSelection, selectedChild, selectedParentId, setApiError]
  );

  useEffect(() => {
    if (!isAllowed) return;
    loadParents();
    loadChildren();
  }, [isAllowed, loadParents, loadChildren]);

  useEffect(() => {
    if (!selectedParentId) return;
    const exists = parents.some((p) => p.id === selectedParentId);
    if (!exists) setSelectedParentId("");
  }, [parents, selectedParentId]);

  return {
    // last error
    lastApiError,
    setLastApiError,

    // parents
    parents,
    parentsLoading,
    parentsErr,
    selectedParentId,
    setSelectedParentId,
    parentQuery,
    setParentQuery,
    onlyParentsWithKids,
    setOnlyParentsWithKids,
    filteredParents,
    parentsStats,
    kidsCountByParentId,
    removeParent,
    parentActionLoadingId,
    selectParent,
    loadParents,

    // children
    children,
    childrenLoading,
    childrenErr,
    childFilter,
    setChildFilter,
    childSort,
    setChildSort,
    shownChildren,
    visibleStats,
    selectedParentLabel,
    setChildActive,
    childActionLoadingId,
    loadChildren,

    // entries
    selectedChild,
    selectedChildTitle,
    entries,
    visibleEntries,
    entriesCache,
    entriesLoading,
    entriesErr,
    entriesIncludeInactive,
    setEntriesIncludeInactive,
    loadEntriesForChild,
    clearSelection,
    clearEntriesCache,

    // misc
    copyText,
    getAgeFromDob,
  };
}
