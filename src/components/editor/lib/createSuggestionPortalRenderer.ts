"use client";

/**
 * @fileoverview Shared TipTap suggestion popup portal (positioning + ReactRenderer lifecycle).
 *
 * @module src/components/editor/lib/createSuggestionPortalRenderer
 */

import { ReactRenderer } from "@tiptap/react";
import type { ComponentType, RefAttributes } from "react";
import type { SuggestionOptions } from "@tiptap/suggestion";

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

    const updatePosition = (clientRect?: (() => DOMRect | null) | null) => {
      if (!popup || !clientRect) return;
      const rect = clientRect();
      if (!rect) return;
      popup.style.left = `${rect.left + window.scrollX}px`;
      popup.style.top = `${rect.bottom + window.scrollY + 6}px`;
    };

    return {
      onStart: (props: {
        clientRect?: (() => DOMRect | null) | null;
        items: TItem[];
        command: (item: TItem) => void;
        editor: unknown;
      }) => {
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
        popup.appendChild(component.element);
        document.body.appendChild(popup);
        updatePosition(props.clientRect);
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
        updatePosition(props.clientRect);
      },
      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === "Escape") {
          return true;
        }
        return component?.ref?.onKeyDown(props.event) ?? false;
      },
      onExit: () => {
        popup?.remove();
        popup = null;
        component?.destroy();
        component = null;
      },
    };
  };
}
