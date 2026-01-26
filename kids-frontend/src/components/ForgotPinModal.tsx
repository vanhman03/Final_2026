import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, X, KeyRound, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ForgotPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToPin?: () => void;
}

type ModalState = "request" | "sent" | "error";

export function ForgotPinModal({
  isOpen,
  onClose,
  onBackToPin,
}: ForgotPinModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modalState, setModalState] = useState<ModalState>("request");
  const [errorMessage, setErrorMessage] = useState("");

  const { user, requestPinReset } = useAuth();
  const { toast } = useToast();

  const defaultEmail = user?.email || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailToUse = email || defaultEmail;

    if (!emailToUse) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToUse)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await requestPinReset(emailToUse);

      if (result.success) {
        setModalState("sent");
      } else {
        setErrorMessage(result.error || "Failed to send reset email");
        setModalState("error");
      }
    } catch (error) {
      setErrorMessage("An unexpected error occurred");
      setModalState("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setModalState("request");
    setErrorMessage("");
    onClose();
  };

  const handleBackToPin = () => {
    setEmail("");
    setModalState("request");
    setErrorMessage("");
    if (onBackToPin) {
      onBackToPin();
    }
  };

  const handleTryAgain = () => {
    setModalState("request");
    setErrorMessage("");
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

            {/* Request State */}
            {modalState === "request" && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <KeyRound className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Reset Your PIN</h2>
                  <p className="text-sm text-muted-foreground">
                    We'll send you an email with instructions to reset your PIN.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder={defaultEmail || "Enter your email"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-12 rounded-xl"
                        disabled={isLoading}
                      />
                    </div>
                    {defaultEmail && !email && (
                      <p className="text-xs text-muted-foreground">
                        Using: {defaultEmail}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="hero"
                    size="lg"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      "Send Reset Email"
                    )}
                  </Button>

                  {onBackToPin && (
                    <button
                      type="button"
                      onClick={handleBackToPin}
                      className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      Back to PIN entry
                    </button>
                  )}
                </form>
              </>
            )}

            {/* Success State */}
            {modalState === "sent" && (
              <div className="text-center">
                <div className="w-16 h-16 bg-success/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <h2 className="text-xl font-bold mb-2">Email Sent!</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Check your inbox for instructions to reset your PIN. The link
                  will expire in 1 hour.
                </p>

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleClose}
                  >
                    Close
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Didn't receive the email?{" "}
                    <button
                      onClick={handleTryAgain}
                      className="text-primary hover:underline"
                    >
                      Try again
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {modalState === "error" && (
              <div className="text-center">
                <div className="w-16 h-16 bg-destructive/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="text-xl font-bold mb-2">Something Went Wrong</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {errorMessage ||
                    "Unable to send reset email. Please try again."}
                </p>

                <div className="space-y-3">
                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={handleTryAgain}
                  >
                    Try Again
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
