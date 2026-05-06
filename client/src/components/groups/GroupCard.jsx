import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Calendar, MoreVertical } from "lucide-react";
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function GroupCard({ group, memberCount, onEdit, onDelete, onViewMembers }) {
  const getTypeColor = (type) => {
    const colors = {
      attendance: 'bg-blue-100 text-blue-800',
      project: 'bg-green-100 text-green-800',
      department: 'bg-purple-100 text-purple-800',
      custom: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || colors.custom;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onViewMembers}>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{group.group_name}</CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Created {format(new Date(group.created_date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewMembers(); }}>
                View Members
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                Edit Group
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-rose-600"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                Delete Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          {group.description && (
            <p className="text-sm text-gray-600 mb-4">{group.description}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={getTypeColor(group.group_type)}>
                {group.group_type}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{memberCount} Members</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}