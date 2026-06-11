"use client";

/**
 * @fileoverview Admin checklist for island-on-insert default component types.
 *
 * @module src/app/pages/EditorDefaultsPanel
 */

import puckConfig from "@/components/puck/config";
import { setEditorIslandDefaultComponents } from "@/components/puck/lib/editorIslandSettings";
import { DEFAULT_ISLAND_COMPONENTS } from "@shared/constants/editorSettings";
import { useCallback, useEffect, useState } from "react";

/** Save/load state for the editor defaults panel. */
type PanelStatus = "loading" | "ready" | "saving" | "saved" | "error";

/**
 * Checklist UI for toggling which Puck components auto-enable island mode on insert.
 *
 * @returns Editor defaults panel JSX.
 */
export function EditorDefaultsPanel() {
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<PanelStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/editor-settings");
        if (!res.ok) throw new Error("Failed to load editor settings.");
        const data = (await res.json()) as { islandDefaultComponents?: string[] };
        if (!cancelled) {
          const list = data.islandDefaultComponents ?? [...DEFAULT_ISLAND_COMPONENTS];
          setSelected(list);
          setEditorIslandDefaultComponents(list);
          setStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load settings.");
          setSelected([...DEFAULT_ISLAND_COMPONENTS]);
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback((componentKey: string) => {
    setSelected((prev) =>
      prev.includes(componentKey)
        ? prev.filter((key) => key !== componentKey)
        : [...prev, componentKey],
    );
    setStatus("ready");
  }, []);

  const handleSave = useCallback(async () => {
    setStatus("saving");
    setError(null);

    const secret = process.env.NEXT_PUBLIC_PUCK_SECRET;

    try {
      const res = await fetch("/api/editor-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({ islandDefaultComponents: selected }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save editor settings.");
      }

      setEditorIslandDefaultComponents(selected);
      setStatus("saved");
      setTimeout(() => setStatus("ready"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
      setStatus("error");
    }
  }, [selected]);

  const categories = puckConfig.categories ?? {};

  return (
    <div className="glass-panel flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--color-text-primary)",
          }}
        >
          Island mode on insert
        </p>
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
          Checked components auto-enable island mode when dropped on the root canvas. Components
          inserted into a parent that already has island mode stay unchanged.
        </p>
      </div>

      {status === "loading" ? (
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Loading…</p>
      ) : (
        Object.entries(categories).map(([key, category]) => (
          <div key={key} className="editor-defaults-category">
            <p className="editor-defaults-category__title">{category.title}</p>
            <ul className="editor-defaults-category__list">
              {category.components.map((componentKey) => (
                <li key={componentKey}>
                  <label className="editor-defaults-check">
                    <input
                      type="checkbox"
                      checked={selected.includes(componentKey)}
                      onChange={() => toggle(componentKey)}
                    />
                    <span>{componentKey}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      {error ? (
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "#ef4444" }}>{error}</p>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "loading" || status === "saving"}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-accent-user)",
            color: "#fff",
            fontSize: "0.8125rem",
            fontWeight: 600,
            border: "none",
            cursor: status === "loading" || status === "saving" ? "not-allowed" : "pointer",
            opacity: status === "loading" || status === "saving" ? 0.6 : 1,
          }}
        >
          {status === "saving" ? "Saving…" : "Save defaults"}
        </button>
        {status === "saved" ? (
          <span style={{ fontSize: "0.8125rem", color: "var(--color-success)" }}>Saved</span>
        ) : null}
      </div>
    </div>
  );
}

export default EditorDefaultsPanel;
