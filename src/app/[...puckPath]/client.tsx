"use client";

/**
 * @fileoverview Puck editor + viewer Client Component for Project Nexus.
 *
 * @module src/app/[...puckPath]/client
 */

import puckConfig from "@/components/puck/config";
import { Render } from "@measured/puck";
import { installSafePointerCapture } from "@/lib/safePointerCapture";
import type { Data } from "@measured/puck";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

installSafePointerCapture();

/** Puck editor loaded only on the client to avoid hydration mismatches. */
const PuckEditorShell = dynamic(
  () => import("./PuckEditorShell").then((m) => m.PuckEditorShell),
  {
    ssr: false,
    loading: () => <PuckEditorLoading />,
  },
);

/** Props accepted by the Puck client component. */
interface PuckClientProps {
  /** Absolute page path (e.g. `"/news"`) used as the MongoDB document key. */
  path: string;
  /** Serialised Puck layout data loaded from MongoDB, or `null` for new pages. */
  data: Data | null;
  /** Human-readable page title from MongoDB. */
  pageTitle: string;
  /** When true, renders the full Puck editor. Otherwise renders `<Render>`. */
  isEditing: boolean;
}

/**
 * Minimal placeholder shown while the client-only Puck bundle loads.
 *
 * @returns Loading skeleton for the editor chrome.
 */
function PuckEditorLoading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        color: "var(--color-text-secondary)",
        fontSize: 14,
      }}
      aria-busy="true"
      aria-label="Loading page editor"
    >
      Loading editor…
    </div>
  );
}

/**
 * Merge server root title into Puck data once at editor init.
 *
 * @param data - Loaded Puck payload.
 * @param title - MongoDB page title fallback.
 * @returns Initial editor data object.
 */
function buildEditorData(data: Data | null, title: string): Data {
  return {
    ...(data ?? { content: [], zones: {} }),
    root: {
      ...(data?.root ?? {}),
      props: {
        ...(data?.root as { props?: Record<string, unknown> })?.props,
        title:
          (data?.root as { props?: { title?: string } })?.props?.title ??
          title ??
          "Untitled Page",
      },
    },
  };
}

/**
 * Puck Client Component — renders either the editor or the static viewer.
 *
 * @param props - See {@link PuckClientProps}.
 * @returns JSX for the Puck editor or the Puck render view.
 */
export function PuckClient({ path, data, pageTitle, isEditing }: PuckClientProps) {
  const router = useRouter();
  const [editorData, setEditorData] = useState<Data>(() => buildEditorData(data, pageTitle));
  const [error, setError] = useState<string | null>(null);

  const handlePublished = useCallback(
    (nextPath: string) => {
      if (nextPath !== path) {
        router.replace(`${nextPath}/edit`);
      } else {
        router.refresh();
      }
    },
    [path, router],
  );

  if (isEditing) {
    return (
      <PuckEditorShell
        path={path}
        pageTitle={pageTitle}
        editorData={editorData}
        onEditorDataChange={setEditorData}
        onPublished={handlePublished}
        error={error}
        onError={setError}
      />
    );
  }

  if (!data) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          color: "var(--color-text-secondary)",
          fontSize: 14,
        }}
      >
        This page has no content yet.
      </div>
    );
  }

  return <Render config={puckConfig} data={data} />;
}

export default PuckClient;
