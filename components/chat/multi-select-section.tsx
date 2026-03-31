"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, X } from "lucide-react";

export type MultiSelectOption = {
  id: string;
  title: string;
  hint?: string | null;
};

type MultiSelectSectionProps = {
  label: string;
  description: string;
  emptyState: string;
  options: MultiSelectOption[];
  selected: MultiSelectOption[];
  onToggle: (id: string) => void;
  icon?: ReactNode;
};

export function MultiSelectSection({
  label,
  description,
  emptyState,
  options,
  selected,
  onToggle,
  icon,
}: MultiSelectSectionProps) {
  const hasSelections = selected.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {hasSelections ? (
          <Badge variant="secondary">{selected.length}</Badge>
        ) : null}
      </div>

      <div className="min-h-[2.25rem] rounded-md border bg-muted/30 p-2">
        {hasSelections ? (
          <div className="flex flex-wrap gap-2">
            {selected.map((item) => (
              <Badge
                key={item.id}
                variant="secondary"
                className="flex items-center gap-1 pr-1 text-xs"
              >
                {icon}
                <span>{item.title}</span>
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-muted"
                  onClick={() => onToggle(item.id)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No selections yet. Use the finder below.
          </p>
        )}
      </div>

      {options.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
          {emptyState}
        </div>
      ) : (
        <Command className="rounded-lg border">
          <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
          <CommandList>
            <CommandEmpty>{emptyState}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.some((item) => item.id === option.id);
                return (
                  <CommandItem
                    key={option.id}
                    value={option.title}
                    onSelect={() => onToggle(option.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="space-y-0.5 text-left">
                      <p className="text-sm font-medium">{option.title}</p>
                      {option.hint ? (
                        <p className="text-xs text-muted-foreground">
                          {option.hint}
                        </p>
                      ) : null}
                    </div>
                    {isSelected ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <span className="h-4 w-4" aria-hidden="true" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      )}
    </div>
  );
}


