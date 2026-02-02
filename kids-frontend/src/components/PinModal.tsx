import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, X, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, PinVerificationError } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 1 * 60 * 1000;

const getStorageKeys = (userId: string | undefined) => ({
  lockout: userId ? `pin_lockout_until_${userId}` : "pin_lockout_until",
  attempts: userId ? `pin_attempts_${userId}` : "pin_attempts",
});

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onForgotPin?: () => void;
  title?: string;
  description?: string;
}

const getErrorMessage = (error: PinVerificationError): string => {
  switch (error) {
    case "NOT_LOGGED_IN":
      return "Please log in to continue.";
    case "DATABASE_ERROR":
      return "Unable to verify PIN. Please try again.";
    case "NO_PIN_SET":
      return "No PIN has been set for this account. Please set a PIN in settings.";
    case "INCORRECT_PIN":
      return "Incorrect PIN. Please try again.";
    case "UNKNOWN_ERROR":
    default:
      return "An unexpected error occurred. Please try again.";
  }
};

export function PinModal({
  isOpen,
  onClose,
  onSuccess,
  onForgotPin,
  title = "Enter PIN",
  description = "Please enter your 4-6 digit PIN to continue",
}: PinModalProps) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<string>("");

  const { verifyPinWithDetails, user } = useAuth();
  const { toast } = useToast();

  const storageKeys = getStorageKeys(user?.id);

  useEffect(() => {
    const storedLockout = localStorage.getItem(storageKeys.lockout);
    const storedAttempts = localStorage.getItem(storageKeys.attempts);

    if (storedLockout) {
      const lockoutTime = parseInt(storedLockout, 10);
      if (lockoutTime > Date.now()) {
        setLockedUntil(lockoutTime);
      } else {
        localStorage.removeItem(storageKeys.lockout);
        localStorage.removeItem(storageKeys.attempts);
        setLockedUntil(null);
        setAttempts(0);
      }
    } else {
      setLockedUntil(null);
    }

    if (storedAttempts && !storedLockout) {
      setAttempts(parseInt(storedAttempts, 10));
    } else if (!storedLockout) {
      setAttempts(0);
    }
  }, [user?.id, storageKeys.lockout, storageKeys.attempts]);

  useEffect(() => {
    if (!lockedUntil) {
      setRemainingTime("");
      return;
    }

    const updateRemainingTime = () => {
      const now = Date.now();
      if (now >= lockedUntil) {
        setLockedUntil(null);
        setAttempts(0);
        localStorage.removeItem(storageKeys.lockout);
        localStorage.removeItem(storageKeys.attempts);
        setRemainingTime("");
      } else {
        const remaining = lockedUntil - now;
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setRemainingTime(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      }
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil, storageKeys.lockout, storageKeys.attempts]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      toast({
        title: "Account Locked",
        description: `Too many failed attempts. Try again in ${remainingTime}.`,
        variant: "destructive",
      });
      return;
    }

    if (pin.length < 4 || pin.length > 6) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be 4-6 digits.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      const result = await verifyPinWithDetails(pin);

      if (result.success) {
        setAttempts(0);
        localStorage.removeItem(storageKeys.attempts);
        localStorage.removeItem(storageKeys.lockout);
        setPin("");
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem(storageKeys.attempts, newAttempts.toString());

        if (newAttempts >= MAX_ATTEMPTS) {
          const lockoutTime = Date.now() + LOCKOUT_DURATION;
          setLockedUntil(lockoutTime);
          localStorage.setItem(storageKeys.lockout, lockoutTime.toString());

          toast({
            title: "Account Locked",
            description:
              "Too many failed attempts. Please try again in 1 minute.",
            variant: "destructive",
          });
        } else {
          const remainingAttempts = MAX_ATTEMPTS - newAttempts;
          const errorMessage = result.error
            ? getErrorMessage(result.error)
            : "Verification failed.";

          toast({
            title: "Verification Failed",
            description: `${errorMessage} ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`,
            variant: "destructive",
          });
        }

        setPin("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify PIN. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setPin("");
    onClose();
  };

  const handleForgotPin = () => {
    setPin("");
    if (onForgotPin) {
      onForgotPin();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm mx-4 bg-card rounded-3xl shadow-card border border-border p-6"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div
                className={`w-16 h-16 ${isLocked ? "bg-destructive/20" : "bg-primary/20"} rounded-2xl flex items-center justify-center mx-auto mb-4`}
              >
                {isLocked ? (
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                ) : (
                  <Lock className="w-8 h-8 text-primary" />
                )}
              </div>
              <h2 className="text-xl font-bold mb-2">
                {isLocked ? "Account Locked" : title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isLocked
                  ? `Too many failed attempts. Try again in ${remainingTime}.`
                  : description}
              </p>
            </div>

            {!isLocked && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Input
                    type={showPin ? "text" : "password"}
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={(e) =>
                      setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="h-14 text-center text-2xl tracking-widest pr-12"
                    maxLength={6}
                    autoFocus
                    disabled={isVerifying}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPin ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Attempt indicator */}
                {attempts > 0 && attempts < MAX_ATTEMPTS && (
                  <div className="flex items-center justify-center gap-1">
                    {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${i < attempts ? "bg-destructive" : "bg-muted"
                          }`}
                      />
                    ))}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={isVerifying || pin.length < 4}
                >
                  {isVerifying ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    "Verify PIN"
                  )}
                </Button>

                {/* Forgot PIN link */}
                {onForgotPin && (
                  <button
                    type="button"
                    onClick={handleForgotPin}
                    className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot PIN?
                  </button>
                )}
              </form>
            )}

            {isLocked && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-3xl font-mono font-bold text-destructive">
                    {remainingTime}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Time remaining until unlock
                  </p>
                </div>

                {onForgotPin && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleForgotPin}
                  >
                    Reset PIN via Email
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
