import React from 'react';
import { Building2 } from 'lucide-react';
import { useAppSettings } from '@/lib/AppSettingsContext';

/**
 * Shows the app logo + name from settings.
 * Falls back to default icon if no custom logo set.
 */
export default function AppLogo({ size = 'md', iconOnly = false, className = '' }) {
  const { settings = {} } = useAppSettings();

  const sizes = {
    sm: { box: 'w-8 h-8', icon: 'w-5 h-5', text: 'text-lg', rounded: 'rounded-lg' },
    md: { box: 'w-10 h-10', icon: 'w-6 h-6', text: 'text-xl', rounded: 'rounded-xl' },
    lg: { box: 'w-12 h-12', icon: 'w-7 h-7', text: 'text-2xl', rounded: 'rounded-xl' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${s.box} bg-lime-400 ${s.rounded} flex items-center justify-center overflow-hidden shadow-[0_0_24px_rgba(163,211,18,0.22)]`}>
        {settings?.app_logo ? (
          <img
            src={settings.app_logo}
            alt={settings?.app_name || 'Logo'}
            className="w-full h-full object-cover"
          />
        ) : (
          <Building2 className={`${s.icon} text-black`} />
        )}
      </div>

      {!iconOnly && (
        <span className={`${s.text} font-bold text-white dark:text-white`}>
          {settings?.app_name || 'AttendEase'}
        </span>
      )}
    </div>
  );
}
