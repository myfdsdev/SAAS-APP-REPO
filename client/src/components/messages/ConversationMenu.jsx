import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  User,
  Star,
  Copy,
  Search,
  EyeOff,
} from "lucide-react";

export default function ConversationMenu({ selectedUser, onAction, isStarred = false }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl text-lime-100/55 hover:text-white hover:bg-[#061006]/80"
        >
          <MoreVertical className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 rounded-2xl border border-lime-400/15 bg-[#020806]/90 text-white"
      >
        <DropdownMenuItem
          onClick={() => onAction('view-profile')}
          className="focus:bg-lime-400/10 focus:text-white"
        >
          <User className="w-4 h-4 mr-2" />
          View profile
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[#061006]/80" />

        <DropdownMenuItem
          onClick={() => onAction('star')}
          className="focus:bg-lime-400/10 focus:text-white"
        >
          <Star className="w-4 h-4 mr-2" />
          {isStarred ? 'Unstar conversation' : 'Star conversation'}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onAction('copy')}
          className="focus:bg-lime-400/10 focus:text-white"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy email
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onAction('search')}
          className="focus:bg-lime-400/10 focus:text-white"
        >
          <Search className=" w-4 h-4 mr-2" />
          Search in conversation
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[#061006]/80" />

        <DropdownMenuItem
          onClick={() => onAction('hide')}
          className="text-rose-300 focus:bg-rose-500/10 focus:text-rose-200"
        >
          <EyeOff className="w-4 h-4 mr-2" />
          Hide conversation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}