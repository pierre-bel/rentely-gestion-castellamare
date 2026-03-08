import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AuthDialog } from "@/components/AuthDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { isAdmin, isHost } = useUserRole();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  return (
    <nav className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-2 sm:px-3 md:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1 sm:gap-2">
          <Link to="/" className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
            <Home className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
            <span className="font-bold text-base sm:text-lg md:text-xl">Rentely</span>
          </Link>

          <div className="hidden md:flex flex-1 justify-end items-center gap-6 mr-4">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
              Accueil
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors outline-none">
                Fonctionnalités
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/features/calendar">Calendrier & Disponibilités</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/features/bookings">Réservations & Paiements</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/features/automation">Communication & Automatisation</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/features/tools">Outils avancés</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {user && (
              <Link to="/host/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                Tableau de bord
              </Link>
            )}
            <Link to="/faq" className="text-sm font-medium hover:text-primary transition-colors">
              FAQ
            </Link>
            <Link to="/help-center" className="text-sm font-medium hover:text-primary transition-colors">
              Aide
            </Link>
          </div>

          <div className="flex md:hidden flex-1 justify-end items-center gap-1 sm:gap-2">
            <Link to="/" className="text-[10px] sm:text-xs font-medium hover:text-primary transition-colors px-1">
              Accueil
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-0.5 text-[10px] sm:text-xs font-medium hover:text-primary transition-colors px-1 outline-none">
                Fonctionnalités
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/features/calendar">Calendrier</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/features/bookings">Réservations</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/features/automation">Automatisation</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/features/tools">Outils</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {user && (
              <Link to="/host/dashboard" className="text-[10px] sm:text-xs font-medium hover:text-primary transition-colors px-1">
                Tableau de bord
              </Link>
            )}
            <Link to="/faq" className="text-[10px] sm:text-xs font-medium hover:text-primary transition-colors px-1">
              FAQ
            </Link>
          </div>

          <div className="flex items-center flex-shrink-0 ml-1 sm:ml-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs md:text-sm h-8 sm:h-9 px-2 sm:px-3">
                    <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Mon compte</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isHost && (
                    <DropdownMenuItem asChild>
                      <Link to="/host/dashboard">Gestion des biens</Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/dashboard">Administration</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                size="sm" 
                className="rounded-full text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4 h-8 sm:h-9" 
                onClick={() => setAuthDialogOpen(true)}
              >
                Connexion
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </nav>
  );
};

export default Navbar;
