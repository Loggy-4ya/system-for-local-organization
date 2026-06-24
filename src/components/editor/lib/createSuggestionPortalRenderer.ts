"use client";

/**
 * @fileoverview Shared TipTap suggestion popup portal (positioning + ReactRenderer lifecycle).
 *
 * Uses `position: fixed` viewport coordinates, hides popups until a valid caret
 * rect is measured, and clears stale body portals before each new session so
 * orphaned menus do not stick in the top-left corner.
 *
 * Tests: `npm run test:suggestion-portal-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module src/components/editor/lib/createSuggestionPortalRenderer
 */

import { ReactRenderer } from "@tiptap/react";
import type { ComponentType, RefAttributes } from "react";
import type { SuggestionOptions } from "@tiptap/suggestion";
import {
  applySuggestionPortalPosition,
  hideSuggestionPortalUntilPositioned,
  removeStaleSuggestionPortals,
  resolveSuggestionPortalRect,
  type SuggestionClientRect,
} from "./suggestionPortalLogic";

/** Base props every suggestion list component must accept. */
export interface SuggestionListBaseProps<TItem> {
  /** Rows to render. */
  items: TItem[];
  /** TipTap selection callback. */
  command: (item: TItem) => void;
  /** Keyboard-highlighted row index. */
  selectedIndex: number;
}

/** Imperative keyboard handle for suggestion lists. */
export interface SuggestionListHandle {
  /** Handle arrow/enter keys; return true when consumed. */
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/** Configuration for {@link createSuggestionPortalRenderer}. */
export interface CreateSuggestionPortalRendererOptions<
  TItem,
  TListProps extends SuggestionListBaseProps<TItem>,
> {
  /** CSS class on the portal wrapper appended to `document.body`. */
  portalClassName: string;
  /** React list component rendered inside the portal. */
  ListComponent: ComponentType<TListProps & RefAttributes<SuggestionListHandle>>;
  /** Map TipTap suggestion props to list component props. */
  mapProps: (props: {
    items: TItem[];
    command: (item: TItem) => void;
    selectedIndex: number;
  }) => TListProps;
}

/**
 * Position the active portal using TipTap's `clientRect` callback.
 *
 * @param popup - Body portal wrapper.
 * @param clientRect - TipTap caret rect provider.
 * @param lastValidRect - Cached rect from the current suggestion session.
 * @returns Updated cache when placement succeeded.
 */
function updatePortalPosition(
  popup: HTMLElement,
  clientRect: (() => SuggestionClientRect | null) | null | undefined,
  lastValidRect: SuggestionClientRect | null,
): SuggestionClientRect | null {
  const { rect, positioned } = resolveSuggestionPortalRect(clientRect, lastValidRect);
  if (!positioned || !rect) {
    hideSuggestionPortalUntilPositioned(popup);
    return lastValidRect;
  }
  applySuggestionPortalPosition(popup, rect);
  return rect;
}

/**
 * Tear down the portal DOM node and ReactRenderer instance.
 *
 * @param popup - Active portal wrapper, if any.
 * @param component - Active ReactRenderer, if any.
 */
function destroySuggestionPortal(
  popup: HTMLDivElement | null,
  component: ReactRenderer | null,
): void {
  component?.destroy();
  popup?.remove();
}

/**
 * Build a TipTap `render` factory that mounts a React suggestion list in a body portal.
 *
 * @param options - Portal class, list component, and prop mapper.
 * @returns TipTap suggestion `render` callback.
 */
export function createSuggestionPortalRenderer<
  TItem,
  TListProps extends SuggestionListBaseProps<TItem>,
>(
  options: CreateSuggestionPortalRendererOptions<TItem, TListProps>,
): NonNullable<SuggestionOptions<TItem>["render"]> {
  return () => {
    let component: ReactRenderer<SuggestionListHandle, TListProps> | null = null;
    let popup: HTMLDivElement | null = null;
    let lastValidRect: SuggestionClientRect | null = null;

    const cleanup = () => {
      destroySuggestionPortal(popup, component);
      popup = null;
      component = null;
      lastValidRect = null;
    };

    return {
      onStart: (props: {
        clientRect?: (() => DOMRect | null) | null;
        items: TItem[];
        command: (item: TItem) => void;
        editor: unknown;
      }) => {
        cleanup();
        removeStaleSuggestionPortals(options.portalClassName);

        component = new ReactRenderer(options.ListComponent, {
          props: options.mapProps({
            items: props.items,
            command: props.command,
            selectedIndex: 0,
          }),
          editor: props.editor as never,
        });

        popup = document.createElement("div");
        popup.className = options.portalClassName;
        hideSuggestionPortalUntilPositioned(popup);
        popup.appendChild(component.element);
        document.body.appendChild(popup);

        lastValidRect = updatePortalPosition(popup, props.clientRect, lastValidRect);
      },
      onUpdate: (props: {
        clientRect?: (() => DOMRect | null) | null;
        items: TItem[];
        command: (item: TItem) => void;
      }) => {
        component?.updateProps(
          options.mapProps({
            items: props.items,
            command: props.command,
            selectedIndex: 0,
          }),
        );
        if (popup) {
          lastValidRect = updatePortalPosition(popup, props.clientRect, lastValidRect);
        }
      },
      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === "Escape") {
          return true;
        }
        return component?.ref?.onKeyDown(props.event) ?? false;
      },
      onExit: () => {
        cleanup();
      },
    };
  };
}
