import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Clock, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import toast from 'react-hot-toast';
import { useAppSettings } from '@/lib/AppSettingsContext';

export default function Register() {
  const { settings } = useAppSettings();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.full_name) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await base44.auth.register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
      });
      toast.success('Account created successfully. Please sign in.');
      window.location.href = createPageUrl('Login');
    } catch (err) {
      toast.error(err?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(163,211,18,0.16),transparent_30%),radial-gradient(circle_at_80%_90%,rgba(34,197,94,0.10),transparent_26%),linear-gradient(135deg,#000000_0%,#040700_50%,#000000_100%)]" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-lime-400 rounded-2xl mb-4 shadow-[0_0_30px_rgba(163,211,18,0.28)] overflow-hidden">
            {settings?.app_logo ? (
              <img src={settings.app_logo} alt={settings?.app_name || 'Logo'} className="h-full w-full object-cover" />
            ) : (
              <Clock className="w-9 h-9 text-black" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-white">{settings?.app_name || 'AttendEase'}</h1>
          <p className="text-lime-100/55 mt-1">Create your account</p>
        </div>

        {/* Card */}
        <Card className="p-8 border border-lime-400/15 bg-[#020806]/95 backdrop-blur-lg shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          <h2 className="text-2xl font-bold text-white mb-6">Sign up</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="full_name" className="text-lime-100/75">Full name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-3 w-4 h-4 text-lime-300/55" />
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Your name"
                  className="pl-10 border-lime-400/15 bg-black text-white placeholder:text-lime-100/25"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-lime-100/75">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-lime-300/55" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="pl-10 border-lime-400/15 bg-black text-white placeholder:text-lime-100/25"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-lime-100/75">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-lime-300/55" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  className="pl-10 border-lime-400/15 bg-black text-white placeholder:text-lime-100/25"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-lime-100/75">Confirm password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-lime-300/55" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="pl-10 border-lime-400/15 bg-black text-white placeholder:text-lime-100/25"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-lime-400 hover:bg-lime-300 text-black py-6 mt-2 font-bold"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="text-center mt-6 pt-6 border-t border-lime-400/15">
            <p className="text-sm text-lime-100/55">
              Already have an account?{' '}
              <a href={createPageUrl('Login')} className="text-lime-300 font-semibold hover:underline">Sign in</a>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
