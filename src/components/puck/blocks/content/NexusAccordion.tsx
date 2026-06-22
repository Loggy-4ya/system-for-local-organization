"use client";

/**
 * @fileoverview Puck block for an Accordion.
 *
 * Renders an interactive, collapsible list of panels using Shadcn Accordion (Base UI).
 *
 * @module src/components/puck/blocks/content/NexusAccordion
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ensureAccordionPanelTitles,
  resolveArrayItemSummaryLabel,
} from "../../lib/arrayItemLabels";

/** Default empty accordion panel — title filled by {@link ensureAccordionPanelTitles}. */
const emptyAccordionPanel = { title: "", content: "" };

export const NexusAccordion = {
  label: "Accordion",
  fields: {
    items: {
      type: "array" as const,
      label: "Accordion Panels",
      getItemSummary: (item: { title?: string } | undefined, index?: number) =>
        resolveArrayItemSummaryLabel("panel", item, index ?? 0, "title"),
      defaultItemProps: emptyAccordionPanel,
      arrayFields: {
        title: { type: "text" as const, label: "Panel Title" },
        content: { type: "textarea" as const, label: "Panel Content" },
      },
    },
    allowMultiple: {
      type: "radio" as const,
      label: "Allow Multiple Open",
      options: [
        { label: "No (Single)", value: "no" },
        { label: "Yes (Multiple)", value: "yes" },
      ],
    },
  },
  defaultProps: {
    items: [
      {
        title: "How do I join the Student Council?",
        content:
          "You can submit an application during the spring or autumn registration window via the Council Apply page.",
      },
      {
        title: "What is the Star system?",
        content:
          "Stars are awarded for completing tasks, organizing events, and achieving academic excellence. They can be redeemed for college rewards.",
      },
    ],
    allowMultiple: "no" as const,
  },
  resolveData: ({ props }: { props: { items?: typeof emptyAccordionPanel[] } }) => ({
    props: {
      ...props,
      items: ensureAccordionPanelTitles(props.items),
    },
  }),
  render({
    items,
    allowMultiple,
  }: {
    items: Array<{ title: string; content: string }>;
    allowMultiple: "no" | "yes";
  }) {
    return (
      <Accordion
        multiple={allowMultiple === "yes"}
        className="flex w-full flex-col gap-2 text-left"
      >
        {items.map((item, idx) => (
          <AccordionItem
            key={idx}
            value={`panel-${idx}`}
            className="glass-panel overflow-hidden rounded-md border border-border bg-card px-4"
          >
            <AccordionTrigger className="py-3 text-[13px] font-semibold hover:no-underline data-[panel-open]:text-primary">
              {item.title || "Untitled Panel"}
            </AccordionTrigger>
            <AccordionContent className="border-t border-border bg-muted/40 pb-3 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {item.content || "No content provided."}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  },
};

export default NexusAccordion;
