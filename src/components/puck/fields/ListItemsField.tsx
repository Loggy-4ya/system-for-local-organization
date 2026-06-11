"use client";

/**
 * @fileoverview Reorderable list items editor for NexusList Puck sidebar.
 *
 * @module src/components/puck/fields/ListItemsField
 */

import { FieldLabel } from "@measured/puck";
import { Button } from "@/components/ui/button";

/** Single list item stored in Puck props. */
export interface ListItemValue {
  text: string;
}

/** Props passed by Puck to the list items field renderer. */
interface ListItemsFieldProps {
  field: { label?: string };
  value: ListItemValue[];
  onChange: (value: ListItemValue[]) => void;
}

/**
 * Move an array entry from one index to another (immutable).
 *
 * @param items - Source array.
 * @param from - Current index.
 * @param to - Target index.
 * @returns Reordered array.
 */
function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [entry] = next.splice(from, 1);
  next.splice(to, 0, entry);
  return next;
}

/**
 * Custom Puck field for NexusList items with up/down reorder controls.
 *
 * @param props - Puck custom field props.
 * @returns List items editor UI.
 */
export function ListItemsField({ field, value, onChange }: ListItemsFieldProps) {
  const items = value?.length ? value : [{ text: "" }];

  const updateItem = (index: number, text: string) => {
    const next = items.map((item, idx) => (idx === index ? { ...item, text } : item));
    onChange(next);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      onChange([{ text: "" }]);
      return;
    }
    onChange(items.filter((_, idx) => idx !== index));
  };

  const addItem = () => {
    onChange([...items, { text: "New list item" }]);
  };

  return (
    <FieldLabel label={field.label || "List Items"}>
      <div className="nexus-puck-field flex flex-col gap-2" style={{ marginTop: 4 }}>
        {items.map((item, index) => (
          <div
            key={index}
            className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 p-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">
                Item {index + 1}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  disabled={index === 0}
                  aria-label={`Move item ${index + 1} up`}
                  onClick={() => onChange(moveItem(items, index, index - 1))}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  disabled={index === items.length - 1}
                  aria-label={`Move item ${index + 1} down`}
                  onClick={() => onChange(moveItem(items, index, index + 1))}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove item ${index + 1}`}
                  onClick={() => removeItem(index)}
                >
                  ✕
                </Button>
              </div>
            </div>
            <input
              type="text"
              className="nexus-puck-input w-full"
              value={item.text}
              placeholder="List item text"
              onChange={(e) => updateItem(index, e.target.value)}
            />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          + Add item
        </Button>
      </div>
    </FieldLabel>
  );
}

export default ListItemsField;
