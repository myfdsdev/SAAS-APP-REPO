import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cookie, Settings2, X } from "lucide-react";

const STORAGE_KEY = "attendease_cookie_consent";

const defaultPrefs = {
  necessary: true,    // always on
  analytics: false,
  marketing: false,
};

const loadConsent = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveConsent = (prefs) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...prefs, decided_at: new Date().toISOString() }),
    );
    window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: prefs }));
  } catch {}
};

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [prefs, setPrefs] = useState(defaultPrefs);

  useEffect(() => {
    // Show only on first visit (no decision yet).
    const existing = loadConsent();
    if (!existing) {
      // Slight delay so it doesn't pop the same instant the page paints.
      const t = setTimeout(() => setOpen(true), 700);
      return () => clearTimeout(t);
    }
  }, []);

  const acceptAll = () => {
    const next = { necessary: true, analytics: true, marketing: true };
    saveConsent(next);
    setOpen(false);
  };

  const declineAll = () => {
    saveConsent(defaultPrefs);
    setOpen(false);
  };

  const savePrefs = () => {
    saveConsent(prefs);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="consent"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 240 }}
          className="fixed inset-x-0 bottom-0 z-[100] flex justify-center px-3 pb-3 sm:px-6 sm:pb-6"
        >
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-lime-400/20 bg-[#020806]/95 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-md sm:p-6">
            {/* Glow */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-lime-400/10 blur-3xl" />

            <button
              type="button"
              onClick={declineAll}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full p-1.5 text-lime-100/40 transition hover:bg-lime-400/10 hover:text-lime-200"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lime-400/30 bg-lime-400/10">
                <Cookie className="h-5 w-5 text-lime-300" />
              </div>

              <div className="flex-1">
                <h3 className="text-base font-semibold text-white">
                  We use cookies 🍪
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-lime-100/60">
                  AttendEase uses cookies to keep you logged in, remember your
                  preferences, and understand how the app is used. You're in
                  control — pick what you're comfortable with.
                </p>

                {/* Customize panel */}
                <AnimatePresence initial={false}>
                  {showCustomize && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-2 rounded-lg border border-lime-400/15 bg-black/40 p-3">
                        <ToggleRow
                          label="Strictly necessary"
                          desc="Login session, security, basic app function. Always on."
                          checked
                          disabled
                        />
                        <ToggleRow
                          label="Analytics"
                          desc="Helps us understand which features get used."
                          checked={prefs.analytics}
                          onChange={(v) =>
                            setPrefs((p) => ({ ...p, analytics: v }))
                          }
                        />
                        <ToggleRow
                          label="Marketing"
                          desc="Personalized product tips & onboarding emails."
                          checked={prefs.marketing}
                          onChange={(v) =>
                            setPrefs((p) => ({ ...p, marketing: v }))
                          }
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Buttons */}
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setShowCustomize((s) => !s)}
                    className="inline-flex items-center gap-1.5 text-xs text-lime-100/60 transition hover:text-lime-300"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    {showCustomize ? "Hide options" : "Customize"}
                  </button>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={declineAll}
                      className="rounded-lg border border-lime-400/15 bg-black/40 px-4 py-2 text-sm text-lime-100/80 transition hover:border-lime-300/40 hover:text-white"
                    >
                      Decline
                    </button>
                    {showCustomize ? (
                      <button
                        type="button"
                        onClick={savePrefs}
                        className="rounded-lg bg-lime-400 px-5 py-2 text-sm font-semibold text-black transition hover:bg-lime-300"
                      >
                        Save preferences
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={acceptAll}
                        className="rounded-lg bg-lime-400 px-5 py-2 text-sm font-semibold text-black transition hover:bg-lime-300"
                      >
                        Accept all
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ToggleRow({ label, desc, checked, disabled, onChange }) {
  return (
    <label
      className={`flex items-start justify-between gap-3 rounded-md p-2 ${
        disabled ? "opacity-60" : "hover:bg-lime-400/5"
      }`}
    >
      <div className="flex-1">
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="mt-0.5 text-xs text-lime-100/50">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${
          checked ? "bg-lime-400" : "bg-white/15"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-black transition ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}
