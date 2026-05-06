import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { UserCircle, Upload, CheckCircle2, Mail, Phone, Badge, BriefcaseBusiness } from "lucide-react";
import { createPageUrl } from "@/utils";
import { toast } from "react-hot-toast";

// Match MyProfile departments
const departments = [
  "Video Editor",
  "Graphic Designer",
  "Web Designer",
  "Content Writer",
  "Developer"
];

export default function CompleteProfile() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    mobile_number: '',
    employee_id: '',
    department: '',
    profile_photo: '',
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    base44.auth.me().then((userData) => {
      setUser(userData);
      setFormData({
        mobile_number: userData?.mobile_number || '',
        employee_id: userData?.employee_id || '',
        department: userData?.department || '',
        profile_photo: userData?.profile_photo || '',
      });
    }).catch(() => {});
  }, []);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      toast.success('Profile saved!');
      setTimeout(() => {
        window.location.href = user?.company_id
          ? createPageUrl('Dashboard')
          : createPageUrl('CompanySetup');
      }, 500);
    },
    onError: (error) => {
      console.error('[CompleteProfile] Save failed:', error);
      toast.error('Failed: ' + (error?.error || error?.message || 'Unknown error'));
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large (max 5MB)');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      console.log('[CompleteProfile] Upload result:', result);

      // Safely extract URL from response shape
      const fileUrl = result?.file_url || result?.url || result?.secure_url;

      if (!fileUrl) {
        console.error('[CompleteProfile] No URL in upload response:', result);
        toast.error('Upload returned no URL');
        return;
      }

      setFormData((prev) => ({ ...prev, profile_photo: fileUrl }));
      toast.success('Photo uploaded — click Save to apply');
    } catch (error) {
      console.error('[CompleteProfile] Upload error:', error);
      toast.error('Failed to upload: ' + (error?.error || error?.message || 'Unknown error'));
    } finally {
      setUploading(false);
      // Reset input so same file can be picked again
      e.target.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.mobile_number) {
      toast.error('Please fill in your mobile number');
      return;
    }

    if (formData.mobile_number.length < 10) {
      toast.error('Mobile number too short (min 10 digits)');
      return;
    }

    if (!formData.department) {
      toast.error('Please select your department');
      return;
    }

    updateProfileMutation.mutate(formData);
  };

  const isProfileComplete = user?.mobile_number && user?.department;

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-pulse text-lime-100/35">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black flex items-center justify-center p-4 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(163,211,18,0.16),transparent_30%),radial-gradient(circle_at_82%_88%,rgba(34,197,94,0.10),transparent_28%),linear-gradient(135deg,#000000_0%,#040700_52%,#000000_100%)]" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-3xl"
      >
        <Card className="overflow-hidden border border-lime-400/15 bg-[#020806]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-400 shadow-[0_0_28px_rgba(163,211,18,0.28)]">
              <UserCircle className="h-10 w-10 text-black" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold text-white">
              {isProfileComplete ? 'Update Your Profile' : 'Complete Your Profile'}
            </CardTitle>
            <p className="text-lime-100/50 mt-2">
              {isProfileComplete 
                ? 'Keep your information up to date' 
                : 'Please provide your details to get started'
              }
            </p>
          </CardHeader>

          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Profile Photo */}
              <div className="rounded-3xl border border-lime-400/15 bg-black p-5">
                <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-lime-400/15 bg-lime-400/10">
                    {formData.profile_photo ? (
                      <AvatarImage src={formData.profile_photo} alt={user.full_name} />
                    ) : (
                      <AvatarFallback className="bg-lime-400/10 text-lime-300 text-2xl font-semibold">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="text-center md:text-left">
                  <p className="text-lg font-semibold text-white">{user.full_name}</p>
                  <p className="mt-1 text-sm text-lime-100/45">{user.email}</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => document.getElementById('photo-upload').click()}
                    className="mt-4 cursor-pointer border-lime-400/20 bg-transparent text-lime-100 hover:bg-lime-400/10 hover:text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : formData.profile_photo ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  <p className="text-xs text-lime-100/35 mt-2">JPG, PNG, max 5MB</p>
                </div>
                </div>
              </div>

              {/* Full Name (Read-only) */}
              <div className="grid gap-4 md:grid-cols-2">
                <ReadOnlyField label="Full Name" value={user.full_name} note="Contact admin to change your name" />
                <ReadOnlyField label="Email Address" value={user.email} icon={Mail} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Mobile Number */}
                <div className="space-y-2">
                  <Label className="text-lime-100/75">Mobile Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-lime-300/55" />
                    <Input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                      className="border-lime-400/15 bg-black pl-10 text-white placeholder:text-lime-100/25"
                    />
                  </div>
                </div>

                {/* Employee ID */}
                <div className="space-y-2">
                  <Label className="text-lime-100/75">Employee ID</Label>
                  <div className="relative">
                    <Badge className="absolute left-3 top-3 h-4 w-4 text-lime-300/55" />
                    <Input
                      placeholder={user.company_id ? "EMP001" : "Assigned after company setup"}
                      value={formData.employee_id}
                      onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                      disabled={!user.company_id}
                      className="border-lime-400/15 bg-black pl-10 text-white placeholder:text-lime-100/25"
                    />
                  </div>
                </div>
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-lime-100/75">
                  <BriefcaseBusiness className="h-4 w-4 text-lime-300" />
                  Department *
                </Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                >
                  <SelectTrigger className="h-11 rounded-xl border-lime-400/15 bg-black text-white">
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={updateProfileMutation.isPending || uploading}
                className="w-full bg-lime-400 hover:bg-lime-300 text-base py-6 font-bold text-black"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                {updateProfileMutation.isPending ? 'Saving...' : isProfileComplete ? 'Update Profile' : 'Complete Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function ReadOnlyField({ label, value, note, icon: Icon = UserCircle }) {
  return (
    <div className="space-y-2">
      <Label className="text-lime-100/75">{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-3 h-4 w-4 text-lime-300/45" />
        <Input
          value={value || ''}
          disabled
          className="border-lime-400/10 bg-black/70 pl-10 text-lime-100/60 disabled:opacity-100"
        />
      </div>
      {note && <p className="text-xs text-lime-100/35">{note}</p>}
    </div>
  );
}
