import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Building,
  IdCard,
  Shield,
  Edit3,
  Camera,
  AlertCircle,
  CheckCircle2,
  Copy,
  CalendarDays,
  Mail,
  Phone,
  Sparkles,
  Save,
  X,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import AchievementWall from "@/components/profile/AchievementWall";
import RankBadge from "@/components/profile/RankBadge";

const departments = ["Video Editor", "Graphic Designer", "Web Designer", "Content Writer", "Developer"];
const MAX_FILE_SIZE_MB = 2;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

const emptyForm = {
  mobile_number: '',
  employee_id: '',
  department: '',
  profile_photo: '',
};

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Banner({ type = 'success', message }) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm font-medium",
        type === 'success'
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
          : "border-rose-500/20 bg-rose-500/10 text-rose-300"
      )}
    >
      <div className="flex items-start gap-2 min-w-0">
        {type === 'success' ? (
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        )}
        <span className="break-words">{message}</span>
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-lime-400/15 bg-black/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-lime-400/15 bg-[#020806]/90/40">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-lime-300 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle ? <p className="text-xs text-lime-100/45 mt-0.5">{subtitle}</p> : null}
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, action }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="p-1.5 bg-lime-400/10 rounded-lg shrink-0">
        <Icon className="w-3.5 h-3.5 text-lime-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-lime-100/45 font-bold leading-none mb-1">
          {label}
        </p>
        <p className="text-sm text-white break-words leading-snug">
          {value || '---'}
        </p>
      </div>
      {action}
    </div>
  );
}

export default function MyProfile() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [banner, setBanner] = useState({ type: '', message: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    base44.auth.me().then((userData) => {
      setUser(userData);
      setFormData({
        mobile_number: userData.mobile_number || '',
        employee_id: userData.employee_id || '',
        department: userData.department || '',
        profile_photo: userData.profile_photo || '',
      });
    });
  }, []);

  useEffect(() => {
    if (!banner.message) return;
    const timer = setTimeout(() => setBanner({ type: '', message: '' }), 3000);
    return () => clearTimeout(timer);
  }, [banner]);

  const initialData = useMemo(() => ({
    mobile_number: user?.mobile_number || '',
    employee_id: user?.employee_id || '',
    department: user?.department || '',
    profile_photo: user?.profile_photo || '',
  }), [user]);

  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  const profileCompleteness = useMemo(() => {
    if (!user) return 0;
    const fields = [
      user.full_name,
      user.email,
      formData.mobile_number,
      formData.employee_id,
      formData.department,
      formData.profile_photo,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [user, formData]);

  const validateForm = () => {
    const nextErrors = {};

    const phone = formData.mobile_number.trim();
    const employeeId = formData.employee_id.trim();

    if (phone && !/^[0-9+\-\s()]{8,15}$/.test(phone)) {
      nextErrors.mobile_number = 'Enter a valid mobile number.';
    }

    if (employeeId && !/^[A-Za-z0-9\-_]{3,20}$/.test(employeeId)) {
      nextErrors.employee_id = 'Employee ID must be 3–20 characters and use only letters, numbers, - or _.';
    }

    if (!formData.department) {
      nextErrors.department = 'Please select a department.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setIsEditing(false);
      setErrors({});
      setBanner({ type: 'success', message: 'Profile updated successfully.' });
    },
    onError: (error) => {
      setBanner({
        type: 'error',
        message: error?.message || 'Failed to update profile. Please try again.',
      });
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setBanner({ type: 'error', message: 'Only JPG, PNG, WEBP or GIF images are allowed.' });
      return;
    }

    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      setBanner({ type: 'error', message: `Image must be smaller than ${MAX_FILE_SIZE_MB}MB.` });
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData((prev) => ({ ...prev, profile_photo: file_url }));
      setBanner({ type: 'success', message: 'Profile photo uploaded.' });
    } catch (error) {
      setBanner({ type: 'error', message: 'Image upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setBanner({ type: '', message: '' });

    if (!validateForm()) return;
    if (!isDirty) {
      setBanner({ type: 'error', message: 'No changes to save.' });
      return;
    }

    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
    setBanner({ type: '', message: '' });
    setFormData(initialData);
  };

  const handleCopyEmployeeId = async () => {
    if (!user?.employee_id) return;
    await navigator.clipboard.writeText(user.employee_id);
    setBanner({ type: 'success', message: 'Employee ID copied.' });
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-lime-400/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white pb-12 overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px]  rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] blur-[120px] rounded-full" />
      </div>

      <div className="w-full px-4 md:px-8 py-6 lg:py-8 relative z-10 space-y-6">
        <Banner type={banner.type} message={banner.message} />

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-lime-300" />
              <span className="text-xs uppercase tracking-[0.18em] text-lime-100/45 font-semibold">
                Account Workspace
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">My Profile</h1>
            <p className="text-lime-100/55 mt-2">
              Manage your personal details, work identity, and profile media.
            </p>
          </div>

          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-lime-400 hover:bg-lime-400 text-black border border-lime-400/15 shadow-[0_0_28px_rgba(132,255,0,0.16)] w-full md:w-auto"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-4 min-w-0">
  <Card className="bg-[#000000] border-lime-400/15 backdrop-blur-md sticky top-8 overflow-hidden h-full ">
    <div className="h-16 bg-gradient-to-r from-lime-400 to-blue-600" />

    <CardContent className="px-5 pb-5 pt-0 -mt-10 text-center">
      <div className="relative inline-block mb-3">
        <Avatar className="w-24 h-24 border-4 border-[#05070a] shadow-xl">
          <AvatarImage src={formData.profile_photo || user.profile_photo} className="object-cover" />
          <AvatarFallback className="bg-[#061006]/80 text-lime-300 text-2xl font-bold">
            {getInitials(user.full_name)}
          </AvatarFallback>
        </Avatar>

        {user.role === 'admin' && (
          <div className="absolute bottom-0.5 right-0.5 bg-lime-400 p-1 rounded-full border-2 border-[#05070a]">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold text-white mb-0.5 break-words">
        {user.full_name}
      </h2>
      <p className="text-lime-100/55 text-sm mb-3 break-words">
        {user.email}
      </p>

      <Badge
        variant="outline"
        className="border-lime-400/20 bg-lime-400/10 text-lime-100/75 px-3 py-1 text-xs"
      >
        {user.role.toUpperCase()}
      </Badge>

      <RankBadge
        rank={user.current_rank}
        points={user.total_points}
        className="mt-5"
      />

      <div className="mt-5 rounded-2xl border border-lime-400/15 bg-black/50 px-4 py-3 text-left">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[10px] uppercase tracking-widest text-lime-100/45 font-bold">
            Profile Completeness
          </p>
          <span className="text-sm font-semibold text-white">{profileCompleteness}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#061006]/80 overflow-hidden">
          <div
            className="h-2 rounded-full bg-lime-400 transition-all"
            style={{ width: `${profileCompleteness}%` }}
          />
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-lime-400/15 space-y-6 text-left">
        <InfoRow
          icon={Building}
          label="Department"
          value={user.department || 'Not Assigned'}
          
        />

        <InfoRow
          icon={IdCard}
          label="Employee ID"
          value={user.employee_id || '---'}
          action={
            user.employee_id ? (
              <button
                onClick={handleCopyEmployeeId}
                className="p-1.5 rounded-lg hover:bg-[#061006]/80/60 text-lime-100/55 hover:text-white"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            ) : null
          }
        />

        <InfoRow
          icon={CalendarDays}
          label="Joined"
          value={user.created_date ? format(new Date(user.created_date), 'MMMM d, yyyy') : '---'}
        />

        <InfoRow
          icon={Shield}
          label="Account State"
          value="Profile available"
        />
      </div>
    </CardContent>
  </Card>
</div>

          {/* Main Area */}
          <div className="lg:col-span-8 min-w-0">
            <Card className="bg-[#020806]/90/40 border-lime-400/15 backdrop-blur-md overflow-hidden h-full">
              <CardHeader className="border-b border-lime-400/15 bg-[#020806]/90/20">
                <CardTitle className="text-white flex items-center gap-2 text-xl">
                  {isEditing ? (
                    <>
                      <Edit3 className="w-5 h-5 text-lime-300" />
                      Edit Profile Details
                    </>
                  ) : (
                    <>
                      <User className="w-5 h-5 text-lime-300" />
                      Account Details
                    </>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 md:p-8">
                <AnimatePresence mode="wait">
                  {isEditing ? (
                    <motion.form
                      key="edit"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit}
                      className="space-y-6"
                    >
                      <SectionCard
                        title="Profile Media"
                        subtitle="Upload or replace your profile picture."
                        icon={Camera}
                      >
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                          <div
                            className="relative cursor-pointer"
                            onClick={() => document.getElementById('photo-upload-edit')?.click()}
                          >
                            <Avatar className="w-24 h-24 border-2 border-lime-400/40">
                              <AvatarImage src={formData.profile_photo} />
                              <AvatarFallback className="bg-[#061006]/80 text-lime-300">
                                <Camera className="w-8 h-8" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 bg-lime-400 rounded-full p-2 border border-[#05070a]">
                              <Upload className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-white">Profile Picture</h4>
                            <p className="text-xs text-lime-100/55 mt-1">
                              JPG, PNG, WEBP or GIF. Max {MAX_FILE_SIZE_MB}MB. Square image recommended.
                            </p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              id="photo-upload-edit"
                            />
                            {uploading && (
                              <p className="text-xs text-lime-300 animate-pulse mt-2">Uploading image...</p>
                            )}
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="Personal Information"
                        subtitle="Basic contact details used for your employee profile."
                        icon={Phone}
                      >
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-lime-100/55">Full Name</Label>
                            <Input
                              value={user.full_name}
                              disabled
                              className="bg-black/50 border-lime-400/15 text-lime-100/45 cursor-not-allowed"
                            />
                            <p className="text-xs text-lime-100/45">Name is managed by admin or HR.</p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-lime-100/55">Email Address</Label>
                            <Input
                              value={user.email}
                              disabled
                              className="bg-black/50 border-lime-400/15 text-lime-100/45 cursor-not-allowed"
                            />
                            <p className="text-xs text-lime-100/45">Email is locked for account security.</p>
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-lime-100/75">Mobile Number</Label>
                            <Input
                              type="tel"
                              className="bg-black border-lime-400/15 text-white"
                              value={formData.mobile_number}
                              onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                              placeholder="Enter mobile number"
                            />
                            {errors.mobile_number && (
                              <p className="text-xs text-rose-400">{errors.mobile_number}</p>
                            )}
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="Work Information"
                        subtitle="Update your department and internal employee details."
                        icon={Building}
                      >
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-lime-100/75">Employee ID</Label>
                            <Input
                              className="bg-black border-lime-400/15 text-white"
                              value={formData.employee_id}
                              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                              placeholder="Enter employee ID"
                            />
                            {errors.employee_id && (
                              <p className="text-xs text-rose-400">{errors.employee_id}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label className="text-lime-100/75">Department</Label>
                            <Select
                              value={formData.department}
                              onValueChange={(value) => setFormData({ ...formData, department: value })}
                            >
                              <SelectTrigger className="bg-black border-lime-400/15 text-white">
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#020806]/90 border-lime-400/15 text-white">
                                {departments.map((dept) => (
                                  <SelectItem key={dept} value={dept}>
                                    {dept}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errors.department && (
                              <p className="text-xs text-rose-400">{errors.department}</p>
                            )}
                          </div>
                        </div>
                      </SectionCard>

                      <div className="flex flex-col-reverse sm:flex-row gap-4 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 border-lime-400/20 bg-[#020806]/90 text-white hover:bg-[#061006]/80"
                          onClick={handleCancel}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>

                        <Button
                          type="submit"
                          disabled={updateProfileMutation.isPending || !isDirty}
                          className="flex-1 bg-lime-400 hover:bg-lime-400"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid gap-6"
                    >
                      <SectionCard
                        title="Profile Overview"
                        subtitle="Your visible account and work identity information."
                        icon={User}
                      >
                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-1">
                            <Label className="text-lime-100/45 text-[11px] uppercase tracking-widest font-bold">Full Name</Label>
                            <p className="text-lg text-white font-medium break-words">{user.full_name}</p>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-lime-100/45 text-[11px] uppercase tracking-widest font-bold">Email</Label>
                            <p className="text-lg text-white font-medium break-words">{user.email}</p>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-lime-100/45 text-[11px] uppercase tracking-widest font-bold">Phone</Label>
                            <p className="text-lg text-white font-medium break-words">{user.mobile_number || '---'}</p>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-lime-100/45 text-[11px] uppercase tracking-widest font-bold">Department</Label>
                            <p className="text-lg text-white font-medium break-words">{user.department || 'Not Assigned'}</p>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-lime-100/45 text-[11px] uppercase tracking-widest font-bold">Employee ID</Label>
                            <p className="text-lg text-white font-medium break-words">{user.employee_id || '---'}</p>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-lime-100/45 text-[11px] uppercase tracking-widest font-bold">Account State</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              <p className="text-emerald-500 font-medium">Profile available</p>
                            </div>
                          </div>
                        </div>
                      </SectionCard>

                      <AchievementWall
                        initialBadges={user.badges || []}
                        embedded
                      />

                      <div className="p-4 rounded-xl bg-black/50 border border-lime-400/15">
                        <div className="flex items-start gap-3 text-lime-100/55 text-sm italic">
                          <Shield className="w-4 h-4 text-lime-300 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="break-words">
                              Personal information is only visible to management and IT admins.
                            </p>
                            <p className="text-xs text-lime-100/45 mt-2">
                              Need name or email changes? Contact admin or HR.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
