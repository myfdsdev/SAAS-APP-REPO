import React, { useMemo, useState } from 'react';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function GifPickerPopover({
  open,
  onOpenChange,
  onGifSelect,
  trigger,
}) {
  const [query, setQuery] = useState('');
  const apiKey = import.meta.env.VITE_GIPHY_API_KEY;

  const giphyFetch = useMemo(() => {
    if (!apiKey) return null;
    return new GiphyFetch(apiKey);
  }, [apiKey]);

  const fetchGifs = (offset) => {
    if (!giphyFetch) return Promise.resolve({ data: [], pagination: { total_count: 0 } });
    const params = { offset, limit: 12, rating: 'pg-13' };
    return query.trim()
      ? giphyFetch.search(query.trim(), params)
      : giphyFetch.trending(params);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent className="rounded-lg bg-gray-950 text-white dark:bg-lime-50 dark:text-gray-950">
          <p>GIF</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        side="top"
        className="w-[360px] rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-lime-400/15 dark:bg-[#020806]"
      >
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-lime-100/45" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search GIFs"
            className="h-10 rounded-xl border-gray-200 bg-gray-50 pl-9 text-gray-900 placeholder:text-gray-400 dark:border-lime-400/15 dark:bg-black dark:text-white dark:placeholder:text-lime-100/45"
          />
        </div>

        {!apiKey ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            Add VITE_GIPHY_API_KEY in client/.env.local to enable GIF search.
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto rounded-xl">
            <Grid
              key={query}
              width={330}
              columns={3}
              gutter={6}
              noLink
              fetchGifs={fetchGifs}
              onGifClick={(gif, event) => {
                event.preventDefault();
                const imageUrl =
                  gif.images?.downsized_medium?.url ||
                  gif.images?.downsized?.url ||
                  gif.images?.original?.url;
                if (imageUrl) {
                  onGifSelect?.(imageUrl, gif.title || 'GIF');
                  onOpenChange?.(false);
                }
              }}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
