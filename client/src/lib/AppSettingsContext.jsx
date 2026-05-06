import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { getToken } from '@/api/apiClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DEFAULT_SETTINGS = {
  app_name: 'AttendEase',
  app_logo: '',
  html_title: 'AttendEase',
  favicon: '',
  primary_color: '#6366f1',
  auto_checkout_enabled: true,
  auto_checkout_hours: 2,
  auto_checkout_warning_minutes: 20,
};

const AppSettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  loading: true,
  refresh: () => {},
  updateSettings: () => {},
});

export const AppSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const applyToHead = (s) => {
    if (s.html_title) {
      document.title = s.html_title;
    }

    if (s.favicon) {
      document.querySelectorAll("link[rel*='icon']").forEach((el) => el.remove());

      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = s.favicon;
      document.head.appendChild(link);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${API_URL}/app-settings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const loaded = { ...DEFAULT_SETTINGS, ...res.data };
      setSettings(loaded);
      applyToHead(loaded);
    } catch (error) {
      console.error('[AppSettings] Failed to load:', error);
      applyToHead(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const handler = () => fetchSettings();
    window.addEventListener('app-settings-refresh', handler);
    return () => window.removeEventListener('app-settings-refresh', handler);
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};

    try {
      const setupSocketListener = async () => {
        const { getSocket } = await import('@/api/socketClient');
        const socket = getSocket();

        if (socket) {
          const handler = (newSettings) => {
            const updated = { ...DEFAULT_SETTINGS, ...newSettings };
            setSettings(updated);
            applyToHead(updated);
          };

          socket.on('app_settings_updated', handler);
          unsubscribe = () => socket.off('app_settings_updated', handler);
        }
      };

      setupSocketListener();
    } catch (err) {}

    return () => unsubscribe();
  }, []);

  const updateSettings = async (newData) => {
    const token = getToken();

    const res = await axios.put(`${API_URL}/app-settings`, newData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const newSettings = { ...DEFAULT_SETTINGS, ...res.data };
    setSettings(newSettings);
    applyToHead(newSettings);
    return newSettings;
  };

  const refresh = fetchSettings;

  return (
    <AppSettingsContext.Provider value={{ settings, loading, refresh, updateSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);

  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }

  return context;
};
