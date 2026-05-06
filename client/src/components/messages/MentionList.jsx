import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const MentionList = forwardRef(({ items = [], command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = (index) => {
    const item = items[index];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((index) => (index + items.length - 1) % items.length);
        return true;
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((index) => (index + 1) % items.length);
        return true;
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  if (!items.length) {
    return (
      <div className="w-72 rounded-2xl border border-lime-400/15 bg-[#020806] p-3 text-sm text-lime-100/55 shadow-2xl">
        No matches
      </div>
    );
  }

  return (
    <div className="w-80 overflow-hidden rounded-2xl border border-lime-400/15 bg-[#020806] p-1.5 shadow-2xl">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onClick={() => selectItem(index)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
            index === selectedIndex
              ? "border border-lime-400/15 bg-lime-400/10 text-lime-200"
              : "border border-transparent text-lime-100/75 hover:bg-[#061006]/80"
          )}
        >
          <Avatar className="h-8 w-8">
            {item.avatar ? <AvatarImage src={item.avatar} alt={item.label} /> : null}
            <AvatarFallback className="border border-lime-400/15 bg-lime-400/10 text-xs font-semibold text-lime-300">
              {getInitials(item.label)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{item.label}</span>
            <span className="block truncate text-xs opacity-65">
              {item.role || item.email}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = "MentionList";

export default MentionList;
