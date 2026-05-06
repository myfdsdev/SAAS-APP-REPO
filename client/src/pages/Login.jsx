import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Clock, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { createPageUrl } from "@/utils";
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { useAppSettings } from '@/lib/AppSettingsContext';

export default function Login() {
  const { settings } = useAppSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectAfterLogin = (user) => {
    if (user.role === 'super_admin') {
      window.location.href = createPageUrl('SuperAdmin');
      return;
    }

    if (user.mobile_number && user.department) {
      if (!user.company_id) {
        window.location.href = createPageUrl('CompanySetup');
        return;
      }

      window.location.href = user.role === 'admin'
        ? createPageUrl('AdminDashboard')
        : createPageUrl('Dashboard');
    } else {
      window.location.href = createPageUrl('CompleteProfile');
    }
  };

  // GOOGLE LOGIN
  const handleGoogleSuccess = async (credentialResponse) => {
    const credential = credentialResponse?.credential;

    if (!credential) {
      toast.error('Google login failed');
      return;
    }

    setLoading(true);

    try {
      const result = await base44.auth.googleLogin(credential);
      toast.success('Google login successful');
      redirectAfterLogin(result.user);
    } catch (err) {
      toast.error(err?.error || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  // EMAIL LOGIN
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const result = await base44.auth.login(email, password);
      toast.success('Welcome back!');
      redirectAfterLogin(result.user);
    } catch (err) {
      toast.error(err?.error || 'Login failed');
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
        {/* LOGO */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-lime-400 rounded-2xl mb-4 shadow-[0_0_30px_rgba(163,211,18,0.28)] overflow-hidden">
            {settings?.app_logo ? (
              <img src={settings.app_logo} alt={settings?.app_name || 'Logo'} className="h-full w-full object-cover" />
            ) : (
              <Clock className="w-9 h-9 text-black" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-white">{settings?.app_name || 'AttendEase'}</h1>
          <p className="text-lime-100/55 mt-1">Welcome back</p>
        </div>

        {/* CARD */}
        <Card className="p-8 border border-lime-400/15 bg-[#020806]/95 backdrop-blur-lg shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          <h2 className="text-2xl font-bold text-white mb-6">Sign in</h2>

          {/* GOOGLE LOGIN BUTTON */}
          <div className="mb-6">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google login failed')}
            />
          </div>

          {/* DIVIDER */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-lime-400/15" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#020806] px-2 text-lime-100/40">
                Or continue with email
              </span>
            </div>
          </div>

          {/* EMAIL LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-lime-100/75">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-lime-300/55" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 border-lime-400/15 bg-black text-white placeholder:text-lime-100/25"
                  autoComplete="current-password"
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
                  Sign in
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* FOOTER */}
          <div className="text-center mt-6 pt-6 border-t border-lime-400/15">
            <p className="text-sm text-lime-100/55">
              Don't have an account?{' '}
              <a href={createPageUrl('Register')} className="text-lime-300 font-semibold hover:underline">
                Sign up
              </a>
            </p>
          </div>
        </Card>

        <p className="text-center text-lime-100/55 text-sm mt-6">
          <a href={createPageUrl('Welcome')} className="hover:underline">
            ← Back to home
          </a>
        </p>
      </motion.div>
    </div>
  );
}
