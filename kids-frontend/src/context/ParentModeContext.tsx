import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

const SESSION_TIMEOUT = 5 * 60 * 1000;

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

interface ParentModeContextType {
  isParentModeActive: boolean;
  activateParentMode: () => void;
  deactivateParentMode: () => void;
  extendSession: () => void;
  remainingTime: number | null;
}

const ParentModeContext = createContext<ParentModeContextType | undefined>(
  undefined,
);

export function ParentModeProvider({ children }: { children: ReactNode }) {
  const [isParentModeActive, setIsParentModeActive] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  const handleActivity = useCallback(() => {
    if (isParentModeActive) {
      setLastActivity(Date.now());
    }
  }, [isParentModeActive]);

  useEffect(() => {
    if (!isParentModeActive) return;

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isParentModeActive, handleActivity]);

  useEffect(() => {
    if (!isParentModeActive) {
      setRemainingTime(null);
      return;
    }

    const checkTimeout = () => {
      const elapsed = Date.now() - lastActivity;
      const remaining = SESSION_TIMEOUT - elapsed;

      if (remaining <= 0) {
        setIsParentModeActive(false);
        setRemainingTime(null);
        console.log("Parent Mode session expired due to inactivity");
      } else {
        setRemainingTime(remaining);
      }
    };

    checkTimeout();
    const interval = setInterval(checkTimeout, 1000);

    return () => clearInterval(interval);
  }, [isParentModeActive, lastActivity]);

  const activateParentMode = useCallback(() => {
    setIsParentModeActive(true);
    setLastActivity(Date.now());
    console.log("Parent Mode activated");
  }, []);

  const deactivateParentMode = useCallback(() => {
    setIsParentModeActive(false);
    setRemainingTime(null);
    console.log("Parent Mode deactivated");
  }, []);

  const extendSession = useCallback(() => {
    if (isParentModeActive) {
      setLastActivity(Date.now());
      console.log("Parent Mode session extended");
    }
  }, [isParentModeActive]);

  return (
    <ParentModeContext.Provider
      value={{
        isParentModeActive,
        activateParentMode,
        deactivateParentMode,
        extendSession,
        remainingTime,
      }}
    >
      {children}
    </ParentModeContext.Provider>
  );
}

export function useParentMode() {
  const context = useContext(ParentModeContext);
  if (context === undefined) {
    throw new Error("useParentMode must be used within a ParentModeProvider");
  }
  return context;
}

export function useFormattedRemainingTime(): string {
  const { remainingTime } = useParentMode();

  if (remainingTime === null) return "";

  const minutes = Math.floor(remainingTime / 60000);
  const seconds = Math.floor((remainingTime % 60000) / 1000);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
