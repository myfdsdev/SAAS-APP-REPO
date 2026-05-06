import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useAuth } from "@/lib/AuthContext";
import api from "@/api/apiClient";
import { getSocket, connectSocket } from "@/api/socketClient";
import AutoCheckoutWarning from "@/components/AutoCheckoutWarning";

// ===========================================================================
// TAB-OPEN HEARTBEAT TRACKER
// ---------------------------------------------------------------------------
// We no longer watch mouse/keyboard activity — that incorrectly logged users
// out when they were working in another app (Photoshop, VS Code, etc.) with
// the AttendEase tab in the background.
//
// New rule: as long as the tab exists in the browser, send a heartbeat every
// 30s. setInterval keeps firing in background tabs (browser-throttled, but
// still enough to satisfy a 2-hour idle threshold). When the tab is closed,
// the browser is closed, the laptop is closed, or the OS shuts down, the
// heartbeats stop arriving and the backend's auto-checkout cron will close
// the session after the configured idle window.
// ===========================================================================

const HEARTBEAT_INTERVAL_MS = 30_000;
const STATUS_REFRESH_MS = 60_000;

const ActivityTrackerContext = createContext({ hasActiveSession: false });

export const useActivityTracker = () => useContext(ActivityTrackerContext);

export function ActivityTrackerProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [warning, setWarning] = useState(null); // { minutesLeft, checkoutAt }

  const intervalRef = useRef(null);
  const statusIntervalRef = useRef(null);

  const refreshStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await api.get("/activity/status");
      setHasActiveSession(!!data.has_active_session);
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  const sendHeartbeat = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      await api.post("/activity/heartbeat", { timestamp: Date.now() });
      // If a warning was showing, dismiss it — we're alive again
      setWarning((w) => (w ? null : w));
    } catch {
      // ignore network blips — next tick will try again
    }
  }, [isAuthenticated]);

  // Status polling (whether a session is currently active)
  useEffect(() => {
    if (!isAuthenticated) return;

    refreshStatus();
    statusIntervalRef.current = setInterval(refreshStatus, STATUS_REFRESH_MS);

    return () => {
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    };
  }, [isAuthenticated, refreshStatus]);

  // Heartbeat loop — only while there's an active check-in session
  useEffect(() => {
    if (!isAuthenticated || !hasActiveSession) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    // Fire one immediately so the backend sees us right after check-in
    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isAuthenticated, hasActiveSession, sendHeartbeat]);

  // When the tab becomes visible again, fire a heartbeat right away.
  // Background tabs still tick, but a focus event guarantees a fresh ping.
  useEffect(() => {
    if (!isAuthenticated || !hasActiveSession) return;

    const onVisibilityChange = () => {
      if (!document.hidden) sendHeartbeat();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isAuthenticated, hasActiveSession, sendHeartbeat]);

  // Best-effort final heartbeat right before the tab actually closes.
  // sendBeacon survives page unload where fetch/XHR usually do not.
  useEffect(() => {
    if (!isAuthenticated || !hasActiveSession) return;

    const onUnload = () => {
      try {
        const token = localStorage.getItem("workflow_token");
        const apiBase =
          import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const url = `${apiBase}/activity/heartbeat`;

        const payload = new Blob(
          [JSON.stringify({ timestamp: Date.now(), token })],
          { type: "application/json" },
        );
        navigator.sendBeacon?.(url, payload);
      } catch {
        // ignore — best-effort
      }
    };

    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [isAuthenticated, hasActiveSession]);

  // Socket: warning + auto-checkout-done from backend
  useEffect(() => {
    if (!isAuthenticated) return;

    let socket = getSocket();
    if (!socket) socket = connectSocket();
    if (!socket) return;

    const onWarning = (payload) => setWarning(payload);
    const onDone = () => {
      setWarning(null);
      refreshStatus();
    };

    socket.on("auto_checkout_warning", onWarning);
    socket.on("auto_checkout_done", onDone);
    socket.on("auto_checkout", onDone);

    return () => {
      socket.off("auto_checkout_warning", onWarning);
      socket.off("auto_checkout_done", onDone);
      socket.off("auto_checkout", onDone);
    };
  }, [isAuthenticated, refreshStatus, user?.email]);

  return (
    <ActivityTrackerContext.Provider value={{ hasActiveSession }}>
      {children}
      {warning && (
        <AutoCheckoutWarning
          minutesLeft={warning.minutesLeft}
          checkoutAt={warning.checkoutAt}
          onStayActive={() => {
            sendHeartbeat();
            setWarning(null);
          }}
          onDismiss={() => setWarning(null)}
        />
      )}
    </ActivityTrackerContext.Provider>
  );
}
