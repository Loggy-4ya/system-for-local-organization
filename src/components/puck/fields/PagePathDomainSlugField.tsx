"use client";

/**
 * @fileoverview Domain picker + page slug editor for `/domain/page_slug` URLs.
 *
 * Domains render inside a collapsible inset list so large catalogs stay scannable.
 * Editors with `pages.create` may add custom domains or hide labels from the picker.
 *
 * @module src/components/puck/fields/PagePathDomainSlugField
 */

import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import {
  composePageAddress,
  formatPageDomainLabel,
  formatPagePathLabel,
  normalizePageSlugSegment,
  splitPageAddress,
} from "@shared/lib/pagePathLogic";
import { validatePagePathDomainSegment } from "@shared/lib/pagePathDomainListLogic";
import {
  addPagePathDomain,
  fetchPagePathDomains,
  removePagePathDomain,
} from "../lib/pagePathDomainClient";
import { usePageEditorMeta } from "../lib/pageEditorMetaContext";
import { validatePageSlug } from "../lib/pageSlugValidation";
import { editorPagePathRef } from "../lib/editorPagePathRef";
import { PageMetaBadge } from "./PageMetaBadge";

/** Props for {@link PagePathDomainSlugField}. */
export interface PagePathDomainSlugFieldProps {
  /** Combined slug stored in puck (`news/fair`). */
  slug: string;
  /** Called when domain or page slug changes. */
  onSlugChange: (nextSlug: string) => void;
  /** Focus handler for deferred slug commit. */
  onSlugFocus?: () => void;
  /** Blur handler for deferred slug commit. */
  onSlugBlur?: () => void;
  /** Reserved paths for collision checks. */
  reservedPaths: string[];
  /** Optional paste collision error from parent. */
  pasteError?: string | null;
  /** Clears paste error after edits. */
  onClearPasteError?: () => void;
  /** Reports paste validation failures. */
  onPasteError?: (message: string) => void;
}

/**
 * Domain label picker and page slug input for Puck page settings.
 *
 * @param props - See {@link PagePathDomainSlugFieldProps}.
 * @returns Domain + slug address editor.
 */
export function PagePathDomainSlugField({
  slug,
  onSlugChange,
  onSlugFocus,
  onSlugBlur,
  reservedPaths,
  pasteError = null,
  onClearPasteError,
  onPasteError,
}: PagePathDomainSlugFieldProps) {
  const meta = usePageEditorMeta();
  const addInputRef = useRef<HTMLInputElement>(null);

  const [domains, setDomains] = useState<string[]>([]);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [removingDomain, setRemovingDomain] = useState<string | null>(null);
  const [addingDomain, setAddingDomain] = useState(false);
  const [addDraft, setAddDraft] = useState("");
  const [addVisible, setAddVisible] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const address = useMemo(() => splitPageAddress(slug, domains), [slug, domains]);
  const activeDomainInclude = address.domain ? [address.domain] : [];

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const rows = await fetchPagePathDomains({
        alwaysInclude: activeDomainInclude,
      });
      if (!cancelled) setDomains(rows);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeDomainInclude.join("|")]);

  useEffect(() => {
    if (!address.domain) {
      setListOpen(true);
    }
  }, [address.domain]);

  useEffect(() => {
    if (addVisible) {
      addInputRef.current?.focus();
    }
  }, [addVisible]);

  const validation = useMemo(
    () =>
      validatePageSlug(slug, {
        slugLocked: false,
        currentPath: editorPagePathRef.currentPath,
        reservedPaths,
      }),
    [slug, reservedPaths],
  );

  const slugError = pasteError ?? validation.error;
  const canManageDomains = meta.canManagePagePathDomains;

  const updateAddress = (
    nextDomain: string,
    nextPageSlug: string,
    options?: { commit?: boolean },
  ) => {
    onClearPasteError?.();
    setDomainError(null);
    onSlugChange(composePageAddress(nextDomain, nextPageSlug));
    // Domain picker changes do not focus the slug input, so deferred Puck commit
    // (blur-only) would never run — persist immediately when the domain changes.
    if (options?.commit) {
      onSlugBlur?.();
    }
  };

  const selectDomain = (domain: string) => {
    updateAddress(domain, address.pageSlug, { commit: true });
    setListOpen(false);
  };

  const handleRemoveDomain = async (domain: string) => {
    const label = formatPageDomainLabel(domain);
    const confirmed = window.confirm(
      `Remove ${label} from the domain list?\n\nExisting pages under this domain keep their URLs.`,
    );
    if (!confirmed) return;

    setDomainError(null);
    setRemovingDomain(domain);

    try {
      const { domains: nextDomains, pageCount } = await removePagePathDomain(domain);
      setDomains(nextDomains);

      if (address.domain === domain) {
        updateAddress("", address.pageSlug, { commit: true });
        setListOpen(true);
      }

      if (pageCount > 0) {
        setDomainError(
          `${label} was hidden from the picker. ${pageCount} existing page${pageCount === 1 ? "" : "s"} still use this domain.`,
        );
      }
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : "Failed to remove domain.");
    } finally {
      setRemovingDomain(null);
    }
  };

  const handleAddDomain = async () => {
    const validationResult = validatePagePathDomainSegment(addDraft);
    if (!validationResult.valid || !validationResult.normalized) {
      setDomainError(validationResult.error ?? "Enter a valid domain label.");
      return;
    }

    if (domains.includes(validationResult.normalized)) {
      selectDomain(validationResult.normalized);
      setAddDraft("");
      setAddVisible(false);
      return;
    }

    setDomainError(null);
    setAddingDomain(true);

    try {
      const nextDomains = await addPagePathDomain(validationResult.normalized);
      setDomains(nextDomains);
      selectDomain(validationResult.normalized);
      setAddDraft("");
      setAddVisible(false);
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : "Failed to add domain.");
    } finally {
      setAddingDomain(false);
    }
  };

  const handleSlugPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").trim();
    if (!pasted) return;

    const pastedValidation = validatePageSlug(pasted.replace(/^\//, ""), {
      slugLocked: false,
      currentPath: editorPagePathRef.currentPath,
      reservedPaths,
    });

    if (!pastedValidation.valid && pastedValidation.error?.includes("already used")) {
      event.preventDefault();
      onPasteError?.(pastedValidation.error);
    }
  };

  const toggleLabel = address.domain
    ? formatPageDomainLabel(address.domain)
    : "Choose a domain";

  return (
    <div className="nexus-page-path-address">
      <div className="nexus-page-path-domain-panel">
        <button
          type="button"
          className="nexus-page-path-domain-panel__toggle"
          aria-expanded={listOpen}
          aria-controls="nexus-page-path-domain-list"
          onClick={() => setListOpen((open) => !open)}
        >
          <span className="nexus-page-path-domain-panel__toggle-copy">
            <span className="nexus-page-path-domain-panel__toggle-label">Domain</span>
            <span
              className={`nexus-page-path-domain-panel__toggle-value${
                address.domain ? "" : " nexus-page-path-domain-panel__toggle-value--empty"
              }`}
            >
              {toggleLabel}
            </span>
          </span>
          <ChevronDown
            className={`nexus-page-path-domain-panel__chevron${listOpen ? " is-open" : ""}`}
            aria-hidden="true"
          />
        </button>

        {listOpen ? (
          <div
            id="nexus-page-path-domain-list"
            className="nexus-page-path-domain-panel__body"
          >
            {domains.length === 0 ? (
              <p className="nexus-page-path-domain-panel__empty">No domains yet.</p>
            ) : (
              <ul className="nexus-page-path-domain-list" role="listbox" aria-label="Page domains">
                {domains.map((domain) => {
                  const selected = address.domain === domain;
                  const removing = removingDomain === domain;
                  return (
                    <li
                      key={domain}
                      className={`nexus-page-path-domain-row${
                        selected ? " nexus-page-path-domain-row--selected" : ""
                      }`}
                      role="option"
                      aria-selected={selected}
                    >
                      <button
                        type="button"
                        className="nexus-page-path-domain-row__select"
                        disabled={Boolean(removingDomain)}
                        onClick={() => selectDomain(domain)}
                      >
                        <span className="nexus-page-path-domain-row__label">
                          {formatPageDomainLabel(domain)}
                        </span>
                        {selected ? (
                          <Check className="nexus-page-path-domain-row__check" aria-hidden="true" />
                        ) : null}
                      </button>
                      {canManageDomains ? (
                        <button
                          type="button"
                          className="nexus-page-path-domain-row__remove"
                          aria-label={`Remove domain ${formatPageDomainLabel(domain)}`}
                          disabled={Boolean(removingDomain)}
                          onClick={() => {
                            void handleRemoveDomain(domain);
                          }}
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      ) : null}
                      {removing ? (
                        <span className="nexus-page-path-domain-row__status">Removing…</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}

            {canManageDomains ? (
              <div className="nexus-page-path-domain-add">
                {!addVisible ? (
                  <button
                    type="button"
                    className="nexus-page-path-domain-add__trigger"
                    onClick={() => {
                      setAddVisible(true);
                      setDomainError(null);
                    }}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Add domain
                  </button>
                ) : (
                  <div className="nexus-page-path-domain-add__form">
                    <div className="nexus-page-path-domain-add__input-row">
                      <span className="nexus-page-path-domain-add__prefix" aria-hidden="true">
                        /
                      </span>
                      <input
                        ref={addInputRef}
                        type="text"
                        className="nexus-puck-input nexus-page-path-domain-add__input"
                        value={addDraft}
                        placeholder="events"
                        disabled={addingDomain}
                        onChange={(event) => {
                          setAddDraft(event.target.value);
                          setDomainError(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault();
                            setAddVisible(false);
                            setAddDraft("");
                            return;
                          }
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleAddDomain();
                          }
                        }}
                      />
                    </div>
                    <div className="nexus-page-path-domain-add__actions">
                      <button
                        type="button"
                        className="nexus-page-path-domain-add__submit"
                        disabled={addingDomain || !addDraft.trim()}
                        onClick={() => {
                          void handleAddDomain();
                        }}
                      >
                        {addingDomain ? "Adding…" : "Add"}
                      </button>
                      <button
                        type="button"
                        className="nexus-page-path-domain-add__cancel"
                        disabled={addingDomain}
                        onClick={() => {
                          setAddVisible(false);
                          setAddDraft("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="nexus-page-slug-row nexus-page-path-address-row">
        {address.domain ? (
          <span className="nexus-page-path-domain-badge nexus-page-path-domain-badge--readonly">
            {formatPageDomainLabel(address.domain)}
          </span>
        ) : (
          <span className="nexus-page-path-domain-badge nexus-page-path-domain-badge--placeholder">
            /domain
          </span>
        )}
        <span className="nexus-page-path-address-separator" aria-hidden="true">
          /
        </span>
        <input
          type="text"
          className="nexus-puck-input nexus-page-slug-row__input nexus-page-path-slug-input"
          value={address.pageSlug}
          onChange={(event) => {
            onClearPasteError?.();
            updateAddress(address.domain, event.target.value);
          }}
          onFocus={onSlugFocus}
          onBlur={onSlugBlur}
          onPaste={handleSlugPaste}
          placeholder="page-slug"
          title="Page slug after the domain"
          aria-invalid={Boolean(slugError)}
        />
      </div>

      {slugError ? (
        <p className="nexus-page-slug-error" role="alert">
          {slugError}
        </p>
      ) : null}

      {domainError ? (
        <p className="nexus-page-path-domain-note" role="status">
          {domainError}
        </p>
      ) : null}

      {validation.valid && slug.trim() ? (
        <div className="nexus-page-path-preview">
          <span className="nexus-page-path-preview__label">Page link</span>
          <PageMetaBadge href={validation.normalizedPath}>
            {formatPagePathLabel(validation.normalizedPath)}
          </PageMetaBadge>
        </div>
      ) : null}

      {!address.domain ? (
        <p className="nexus-page-path-address__hint">Pick a domain label, then enter the page slug.</p>
      ) : !normalizePageSlugSegment(address.pageSlug) ? (
        <p className="nexus-page-path-address__hint">Enter the page slug after the domain.</p>
      ) : null}
    </div>
  );
}

export default PagePathDomainSlugField;
