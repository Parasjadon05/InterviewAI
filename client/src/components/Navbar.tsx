
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Sparkles } from "lucide-react";
import AuthDialog from "./AuthDialog";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate, useLocation } from "react-router-dom";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  const openAuthDialog = (mode: "signin" | "signup") => {
    setAuthDialogOpen(true);
    setAuthTab(mode);
  };

  const closeAuthDialog = () => {
    setAuthDialogOpen(false);
  };

  const switchAuthMode = (mode: "signin" | "signup") => {
    setAuthTab(mode);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <button
              className="flex items-center space-x-2 focus:outline-none group cursor-pointer"
              onClick={() => {
                if (location.pathname.startsWith("/history")) {
                  navigate("/");
                  setIsMenuOpen(false);
                } else {
                  scrollToSection('home');
                }
              }}
              aria-label="Go to Home"
              type="button"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">InterviewAI</span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => {
                  if (location.pathname.startsWith("/history")) {
                    navigate("/");
                    setIsMenuOpen(false);
                  } else {
                    scrollToSection('home');
                  }
                }}
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                Home
              </button>
              {!user && (
                <button
                  onClick={() => scrollToSection('about')}
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                >
                  About
                </button>
              )}
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
              >
                How It Works
              </button>
              {!user && (
                <button
                  onClick={() => scrollToSection('features')}
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                >
                  Features
                </button>
              )}
              {user && (
                <button
                  onClick={() => { navigate("/history"); setIsMenuOpen(false); }}
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                >
                  History
                </button>
              )}
              {/* Auth/User Section */}
              <div className="flex items-center space-x-3">
                {loading ? null : user ? (
                  <>
                    <Avatar>
                      <AvatarFallback>{user.name?.[0] || user.email?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <span className="text-gray-700 font-medium">{user.name || user.email}</span>
                    <Button
                      onClick={logout}
                      variant="outline"
                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => { setAuthTab("signin"); setAuthDialogOpen(true); }}
                      variant="ghost"
                      className="text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                    >
                      Sign In
                    </Button>
                    <Button
                      onClick={() => { setAuthTab("signup"); setAuthDialogOpen(true); }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden bg-white border-t border-gray-200 py-4 animate-fade-in">
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => {
                    if (location.pathname.startsWith("/history")) {
                      navigate("/");
                      setIsMenuOpen(false);
                    } else {
                      scrollToSection('home');
                    }
                  }}
                  className="text-left text-gray-700 hover:text-blue-600 transition-colors font-medium px-4 py-2"
                >
                  Home
                </button>
                <button
                  onClick={() => scrollToSection('about')}
                  className="text-left text-gray-700 hover:text-blue-600 transition-colors font-medium px-4 py-2"
                >
                  About
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="text-left text-gray-700 hover:text-blue-600 transition-colors font-medium px-4 py-2"
                >
                  How It Works
                </button>
                <button
                  onClick={() => scrollToSection('features')}
                  className="text-left text-gray-700 hover:text-blue-600 transition-colors font-medium px-4 py-2"
                >
                  Features
                </button>
                {/* Mobile Auth/User Section */}
                <div className="px-4 pt-2 space-y-2">
                  {loading ? null : user ? (
                    <>
                      <div className="flex items-center space-x-2">
                        <Avatar>
                          <AvatarFallback>{user.name?.[0] || user.email?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <span className="text-gray-700 font-medium">{user.name || user.email}</span>
                      </div>
                      <Button
                        onClick={logout}
                        variant="outline"
                        className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                      >
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => { setAuthTab("signin"); setAuthDialogOpen(true); }}
                        variant="outline"
                        className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                      >
                        Sign In
                      </Button>
                      <Button
                        onClick={() => { setAuthTab("signup"); setAuthDialogOpen(true); }}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        Sign Up
                      </Button>
                    </>
                  )}
                </div>
                {user && (
                  <button
                    onClick={() => { navigate("/history"); setIsMenuOpen(false); }}
                    className="text-left text-gray-700 hover:text-blue-600 transition-colors font-medium px-4 py-2"
                  >
                    History
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Auth Dialog */}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultTab={authTab}
      />
    </>
  );
};

export default Navbar;
