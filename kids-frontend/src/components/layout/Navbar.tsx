import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  Play,
  Gamepad2,
  ShoppingBag,
  Shield,
  LogOut,
  Menu,
  X,
  Settings,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  useParentMode,
  useFormattedRemainingTime,
} from "@/context/ParentModeContext";
import { PinModal } from "@/components/PinModal";
import { ForgotPinModal } from "@/components/ForgotPinModal";

export function Navbar() {
  const { user, logout } = useAuth();
  const { isParentModeActive, activateParentMode, deactivateParentMode } =
    useParentMode();
  const remainingTimeFormatted = useFormattedRemainingTime();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);

  const handleLogout = () => {
    deactivateParentMode();
    logout();
    navigate("/");
  };

  const handleParentModeClick = () => {
    if (isParentModeActive) {
      navigate("/parent-mode");
    } else {
      setShowPinModal(true);
    }
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    activateParentMode();
    navigate("/parent-mode");
  };

  const handleForgotPin = () => {
    setShowPinModal(false);
    setShowForgotPinModal(true);
  };

  const handleBackToPin = () => {
    setShowForgotPinModal(false);
    setShowPinModal(true);
  };

  const handleExitParentMode = () => {
    deactivateParentMode();
    navigate("/home");
  };

  const getNavItems = () => {
    if (!user) return [];

    if (user.role === "admin") {
      return [
        { label: "Dashboard", icon: Home, href: "/admin/dashboard" },
      ];
    }

    // Parent role - main child-friendly UI
    return [
      { label: "Home", icon: Home, href: "/home" },
      { label: "Videos", icon: Play, href: "/videos" },
      { label: "Games", icon: Gamepad2, href: "/games" },
      { label: "Shop", icon: ShoppingBag, href: "/shop" },
    ];
  };

  const navItems = getNavItems();

  const getHomeRoute = () => {
    if (!user) return "/";
    return user.role === "admin" ? "/admin/dashboard" : "/home";
  };

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border shadow-soft"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to={getHomeRoute()}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2"
              >
                <span className="text-3xl">🌟</span>
                <span className="font-extrabold text-xl md:text-2xl text-gradient-hero">
                  EduKids
                </span>
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            {user && (
              <div className="hidden md:flex items-center gap-2">
                {navItems.map((item) => (
                  <Link key={item.href} to={item.href}>
                    <Button variant="ghost" size="lg" className="gap-2">
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            )}

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  {/* Parent Mode Button - Only for parent role */}
                  {user.role === "parent" && (
                    <>
                      {isParentModeActive ? (
                        <div className="hidden md:flex items-center gap-2">
                          {/* Session timer indicator */}
                          <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full text-sm">
                            <Clock className="w-4 h-4 text-primary" />
                            <span className="font-mono text-primary">
                              {remainingTimeFormatted}
                            </span>
                          </div>

                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleParentModeClick}
                            className="gap-2 bg-primary"
                          >
                            <Shield className="w-4 h-4" />
                            Parent Mode
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExitParentMode}
                          >
                            Exit
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleParentModeClick}
                          className="hidden md:flex gap-2"
                        >
                          <Shield className="w-4 h-4" />
                          Parent Mode
                        </Button>
                      )}
                    </>
                  )}

                  <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-muted rounded-2xl">
                    <span className="text-2xl">{user.avatar || "👤"}</span>
                    <span className="font-semibold">{user.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleLogout}
                    className="hidden md:flex"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                  {/* Mobile menu button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                  >
                    {isMenuOpen ? (
                      <X className="w-6 h-6" />
                    ) : (
                      <Menu className="w-6 h-6" />
                    )}
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="outline">Log In</Button>
                  </Link>
                  <Link to="/register">
                    <Button variant="hero" className="hidden sm:flex">
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && user && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden pb-4"
            >
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
                {user.role === "parent" && (
                  <>
                    {isParentModeActive ? (
                      <>
                        <div className="flex items-center justify-center gap-2 py-2 bg-primary/10 rounded-xl">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="font-mono text-primary">
                            {remainingTimeFormatted}
                          </span>
                        </div>
                        <Button
                          variant="default"
                          className="w-full justify-start gap-3 bg-primary"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleParentModeClick();
                          }}
                        >
                          <Shield className="w-5 h-5" />
                          Parent Mode (Active)
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-3"
                          onClick={() => {
                            setIsMenuOpen(false);
                            handleExitParentMode();
                          }}
                        >
                          Exit Parent Mode
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleParentModeClick();
                        }}
                      >
                        <Shield className="w-5 h-5" />
                        Parent Mode
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 mt-2"
                  onClick={handleLogout}
                >
                  <LogOut className="w-5 h-5" />
                  Log Out
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.nav>

      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSuccess}
        onForgotPin={handleForgotPin}
        title="Enter Parent PIN"
        description="Enter your PIN to access Parent Mode"
      />

      <ForgotPinModal
        isOpen={showForgotPinModal}
        onClose={() => setShowForgotPinModal(false)}
        onBackToPin={handleBackToPin}
      />
    </>
  );
}
