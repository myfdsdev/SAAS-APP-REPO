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
  Users,
  Star,
  Copy,
  Search,
  Settings,
  UserPlus,
  EyeOff,
} from "lucide-react";

export default function GroupConversationMenu({ group, onAction }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="w-5 h-5 text-gray-600" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => onAction('view-members')}>
          <Users className="w-4 h-4 mr-2" />
          View members
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => onAction('add-member')}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add members
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => onAction('star')}>
          <Star className="w-4 h-4 mr-2" />
          Star conversation
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => onAction('copy')}>
          <Copy className="w-4 h-4 mr-2" />
          Copy group name
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => onAction('search')}>
          <Search className="w-4 h-4 mr-2" />
          Search in conversation
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => onAction('settings')}>
          <Settings className="w-4 h-4 mr-2" />
          Group settings
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => onAction('hide')} className="text-red-600">
          <EyeOff className="w-4 h-4 mr-2" />
          Hide
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}