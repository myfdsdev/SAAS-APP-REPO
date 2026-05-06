import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Calendar, User, Shield, Copy } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from 'react-hot-toast';

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-lime-400/15 bg-[#020806]/90/70 px-4 py-4">
      <div className="w-8 h-8 rounded-xl bg-[#061006]/80 border border-lime-400/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-lime-100/75" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-lime-100/45 mb-1">{label}</p>
        <p className="text-sm text-slate-100 break-words">{value}</p>
      </div>
    </div>
  );
}

export default function UserProfileDialog({ open, onClose, user }) {
  if (!user) return null;

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(user.email);
    toast.success('Email copied');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-[2rem] border border-lime-400/15 bg-black text-white p-0 overflow-hidden">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-lime-400/10 via-transparent to-emerald-500/10 pointer-events-none" />

          <div className="relative p-6 border-b border-lime-400/15">
            <DialogHeader>
              <DialogTitle className="text-left text-white">User Profile</DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <Avatar className="w-24 h-24">
                  {user.profile_photo ? (
                    <AvatarImage src={user.profile_photo} alt={user.full_name} />
                  ) : (
                    <AvatarFallback className="bg-lime-400/10 text-lime-300 text-2xl font-semibold">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  )}
                </Avatar>

                <div
                  className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-slate-950 ${
                    user.is_online ? 'bg-emerald-500' : 'bg-black0'
                  }`}
                />
              </div>

              <h3 className="text-xl font-semibold text-white">{user.full_name}</h3>
              <p className="text-sm text-lime-100/55 mb-3 break-words">{user.email}</p>

              <div className="flex items-center gap-2 flex-wrap justify-center">
                {user.role === 'admin' && (
                  <Badge className="bg-lime-400/10 text-lime-300 border border-lime-400/20">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
                <Badge className={user.is_online
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  : "bg-[#061006]/80 text-lime-100/75 border border-lime-400/20"
                }>
                  {user.is_online ? 'Online' : 'Offline'}
                </Badge>
              </div>

              <Button
                variant="outline"
                onClick={handleCopyEmail}
                className="mt-4 rounded-xl border-lime-400/20 bg-[#020806]/90 text-white hover:bg-[#061006]/80"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Email
              </Button>
            </div>

            <div className="space-y-3">
              <DetailRow icon={Mail} label="Email" value={user.email} />
              <DetailRow icon={Phone} label="Phone" value={user.phone} />
              <DetailRow icon={MapPin} label="Location" value={user.location} />
              <DetailRow
                icon={Calendar}
                label="Joined"
                value={user.created_date ? format(new Date(user.created_date), 'MMMM d, yyyy') : ''}
              />
              <DetailRow
                icon={User}
                label="Last Active"
                value={user.last_active_time ? format(new Date(user.last_active_time), 'MMM d, yyyy h:mm a') : ''}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}