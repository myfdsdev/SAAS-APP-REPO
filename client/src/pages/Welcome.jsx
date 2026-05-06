import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Button } from '@/components/ui/button';
import { Mail, Building2, CheckCircle2, Clock, Users, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { useAppSettings } from '@/lib/AppSettingsContext';

export default function Welcome() {
  const navigate = useNavigate();
  const loginInProgress = useRef(false);
  const { settings } = useAppSettings();
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const appName = settings?.app_name || 'AttendEase';

  const {
    user,
    isAuthenticated,
    isLoadingAuth,
    googleLogin,
  } = useAuth();

  const redirectUser = (u) => {
    if (!u) return;

    if (u.role === 'super_admin') {
      navigate(createPageUrl('SuperAdmin'), { replace: true });
      return;
    }

    if (!u.mobile_number || !u.department) {
      navigate(createPageUrl('CompleteProfile'), { replace: true });
      return;
    }

    if (!u.company_id) {
      navigate(createPageUrl('CompanySetup'), { replace: true });
      return;
    }

    navigate(
      createPageUrl(u.role === 'admin' ? 'AdminDashboard' : 'Dashboard'),
      { replace: true }
    );
  };

  useEffect(() => {
    if (isLoadingAuth) return;

    if (isAuthenticated && user) {
      redirectUser(user);
    }
  }, [isLoadingAuth, isAuthenticated, user]);

  const handleGoogleSuccess = async (credentialResponse) => {
    if (loginInProgress.current) return;

    if (!credentialResponse?.credential) {
      toast.error('Google login failed — no credential');
      return;
    }

    loginInProgress.current = true;

    try {
      const result = await googleLogin(credentialResponse.credential);

      toast.success('Welcome!');
      redirectUser(result.user);
    } catch (error) {
      console.error('[Welcome] Google login error:', error);
      toast.error(error?.error || error?.message || 'Google login failed');
    } finally {
      loginInProgress.current = false;
    }
  };

  const handleGoogleError = () => {
    toast.error('Google login was cancelled');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div
        className="lg:w-3/5 bg-black text-white flex items-center justify-center p-8 lg:p-12 relative overflow-hidden"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPointer({
            x: ((event.clientX - rect.left) / rect.width - 0.5) * 24,
            y: ((event.clientY - rect.top) / rect.height - 0.5) * 24,
          });
        }}
        onMouseLeave={() => setPointer({ x: 0, y: 0 })}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(163,211,18,0.16),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(34,197,94,0.10),transparent_28%),linear-gradient(135deg,#000000_0%,#040700_48%,#000000_100%)]" />
        <motion.div
          className="absolute left-12 top-14 h-32 w-32 rounded-full border border-lime-400/15"
          animate={{ x: pointer.x, y: pointer.y }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        />
        <motion.div
          className="absolute bottom-16 right-16 h-44 w-44 rounded-full border border-lime-400/10"
          animate={{ x: -pointer.x, y: -pointer.y }}
          transition={{ type: 'spring', stiffness: 70, damping: 20 }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-xl"
        >
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-lime-400 rounded-xl flex items-center justify-center overflow-hidden shadow-[0_0_24px_rgba(163,211,18,0.28)]">
              {settings?.app_logo ? (
                <img src={settings.app_logo} alt={appName} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="w-7 h-7 text-black" />
              )}
            </div>
            <span className="text-2xl font-bold">{appName}</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
            Your team's workspace,
            <br />
            <span className="text-lime-300">all in one place.</span>
          </h1>

          <p className="text-lg text-lime-100/60 mb-10">
            Track attendance, manage projects, chat in real-time, and stay connected with your team.
          </p>

          <div className="space-y-4">
            <Feature icon={Clock} text="Smart attendance tracking with live status" />
            <Feature icon={Users} text="Real-time team chat & group messaging" />
            <Feature icon={BarChart3} text="Project boards & task management" />
            <Feature icon={CheckCircle2} text="Leave requests & approvals" />
          </div>
        </motion.div>
      </div>

      <div className="lg:w-2/5 bg-[#020806] flex items-center justify-center p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-lime-400 rounded-xl flex items-center justify-center overflow-hidden">
              {settings?.app_logo ? (
                <img src={settings.app_logo} alt={appName} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="w-6 h-6 text-black" />
              )}
            </div>
            <span className="text-xl font-bold text-white">{appName}</span>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Get Started</h2>
            <p className="text-lime-100/50">Sign in to access your workspace</p>
          </div>

          <div className="space-y-4">
            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_black"
                size="large"
                width="320"
                text="continue_with"
                shape="rectangular"
              />
            </div>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-lime-400/15" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#020806] px-3 text-lime-100/35 font-medium uppercase">
                  Or
                </span>
              </div>
            </div>

            <Button
              onClick={() => navigate(createPageUrl('Register'))}
              variant="outline"
              size="lg"
              className="w-full h-12 border border-lime-400/20 bg-black text-lime-100 hover:bg-lime-400/10 hover:text-white font-medium"
            >
              <Mail className="w-5 h-5 mr-3 text-lime-300" />
              Continue with Email
            </Button>
          </div>

          <p className="text-center text-sm text-lime-100/50 mt-8">
            Already have an account?{' '}
            <Link
              to={createPageUrl('Login')}
              className="text-lime-300 hover:text-lime-200 font-semibold"
            >
              Sign in
            </Link>
          </p>

          <p className="text-center text-xs text-lime-100/35 mt-12">
            By continuing, you agree to our{' '}
            <Link to={createPageUrl('PrivacyPolicy')} className="underline hover:text-lime-200">
              Privacy Policy
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

const Feature = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 bg-lime-400/10 border border-lime-400/15 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-lime-300" />
    </div>
    <span className="text-lime-100/70">{text}</span>
  </div>
);
