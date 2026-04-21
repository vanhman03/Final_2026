import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, Eye, EyeOff, CheckCircle, AlertCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FloatingElements } from "@/components/FloatingElements";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

type PageState = "loading" | "form" | "success" | "error";

export default function ResetPinPage() {
  const { t } = useTranslation();
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const { user, updatePin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Session error:", error);
        setErrorMessage(t('pin.reset.messages.invalidLink'));
        setPageState("error");
        return;
      }

      if (!session) {
        const hash = window.location.hash;
        if (hash.includes("type=recovery")) {
          setTimeout(async () => {
            const {
              data: { session: newSession },
            } = await supabase.auth.getSession();
            if (newSession) {
              setPageState("form");
            } else {
              setErrorMessage(t('pin.reset.messages.requestNew'));
              setPageState("error");
            }
          }, 1000);
        } else {
          setErrorMessage(t('pin.reset.messages.requestNew'));
          setPageState("error");
        }
      } else {
        setPageState("form");
      }
    };

    checkSession();
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPin.length < 4 || newPin.length > 6) {
      toast({
        title: t('pin.reset.messages.invalidPin'),
        description: t('pin.errors.invalidPinDesc'),
        variant: "destructive",
      });
      return;
    }

    if (newPin !== confirmPin) {
      toast({
        title: t('pin.reset.messages.pinMismatch'),
        description: t('pin.reset.messages.pinMismatchDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await updatePin(newPin);
      setPageState("success");

      toast({
        title: t('pin.reset.messages.successTitle'),
        description: t('pin.reset.messages.successDesc'),
      });
    } catch (error: any) {
      console.error("PIN reset error:", error);
      toast({
        title: t('pin.reset.messages.failed'),
        description: error.message || t('common.error'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoHome = () => {
    navigate("/home");
  };

  const handleRequestNew = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <FloatingElements />

      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
          >
            <Star className="w-12 h-12 text-primary fill-current" />
          </motion.div>
          <span className="font-extrabold text-3xl text-gradient-hero">
            EduKids
          </span>
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-3xl shadow-card p-8 border border-border"
        >
          {pageState === "loading" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">{t('pin.reset.verifying')}</p>
            </div>
          )}

          {pageState === "form" && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-extrabold mb-2">{t('pin.reset.title')}</h1>
                <p className="text-muted-foreground">
                  {t('pin.reset.subtitle')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPin">{t('pin.reset.newPin')}</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="newPin"
                      type={showPin ? "text" : "password"}
                      placeholder={t('pin.reset.newPinPlaceholder')}
                      value={newPin}
                      onChange={(e) =>
                        setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      className="pl-12 pr-12 h-12 rounded-xl"
                      maxLength={6}
                      autoFocus
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPin">{t('pin.reset.confirmPin')}</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPin"
                      type={showPin ? "text" : "password"}
                      placeholder={t('pin.reset.confirmPinPlaceholder')}
                      value={confirmPin}
                      onChange={(e) =>
                        setConfirmPin(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      className="pl-12 h-12 rounded-xl"
                      maxLength={6}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full mt-2"
                  disabled={isLoading || newPin.length < 4}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      {t('pin.reset.saving')}
                    </span>
                  ) : (
                    t('pin.reset.button')
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Success State */}
          {pageState === "success" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-success/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-2xl font-extrabold mb-2">
                {t('pin.reset.success')}
              </h1>
              <p className="text-muted-foreground mb-6">
                {t('pin.reset.successDesc')}
              </p>

              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={handleGoHome}
              >
                {t('pin.reset.goHome')}
              </Button>
            </div>
          )}

          {/* Error State */}
          {pageState === "error" && (
            <div className="text-center">
              <div className="w-16 h-16 bg-destructive/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-extrabold mb-2">
                {t('pin.reset.error')}
              </h1>
              <p className="text-muted-foreground mb-6">{errorMessage}</p>

              <div className="space-y-3">
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleRequestNew}
                >
                  {t('pin.reset.backToLogin')}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
