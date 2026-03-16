import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ParentModeProvider } from "@/context/ParentModeContext";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import HomePage from "./pages/HomePage";
import VideoLibraryPage from "./pages/child/VideoLibraryPage";
import FavoritesPage from "./pages/child/FavoritesPage";
import GamesPage from "./pages/child/GamesPage";
import ColorMatchGame from "./pages/child/games/ColorMatchGame";
import PuzzleGame from "./pages/child/games/PuzzleGame";
import LeaderboardPage from "./pages/child/LeaderboardPage";
import ParentModePage from "./pages/ParentModePage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ShopPage from "./pages/shop/ShopPage";
import PaymentResultPage from "./pages/shop/PaymentResultPage";
import ResetPinPage from "./pages/auth/ResetPinPage";
import BadgesPage from "./pages/BadgesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ParentModeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-pin" element={<ResetPinPage />} />

              {/* Main Parent UI (former child routes) */}
              <Route path="/home" element={<HomePage />} />
              <Route path="/videos" element={<VideoLibraryPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/games" element={<GamesPage />} />
              <Route path="/games/color-match" element={<ColorMatchGame />} />
              <Route path="/games/puzzle" element={<PuzzleGame />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />

              {/* Parent Mode (PIN protected) */}
              <Route path="/parent-mode" element={<ParentModePage />} />

              {/* Badges Page */}
              <Route path="/badges" element={<BadgesPage />} />

              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={<AdminDashboard />} />

              {/* Shop */}
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/payment/result" element={<PaymentResultPage />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ParentModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
