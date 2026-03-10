import { useState } from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { AuthDialog } from "../AuthDialog";

const SearchPageFooter = () => {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  
  const navigationLinks = [
    { label: "Book Now", to: "/search" },
  ];

  const supportLinks: { label: string; to: string }[] = [
    // Hidden for now
    // { label: "Help Center", to: "/help-center" },
    // { label: "Support", to: "/support" },
  ];

  return (
    <>
      <footer className="bg-white py-12 w-full">
        <div className="px-6">
          <div className="bg-card-bg rounded-3xl p-8 md:p-12 lg:p-16">
            {/* Top Section */}
            <div className="flex flex-col lg:flex-row justify-between gap-12 mb-12">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <span className="text-2xl font-bold">CompanyLogo</span>
              </div>

              {/* Link Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12">
                {/* Navigation Column */}
                <div>
                  <h3 className="font-bold text-base mb-2">Navigation</h3>
                  <div className="w-12 h-1 bg-primary mb-4"></div>
                  <ul className="space-y-2">
                    {navigationLinks.map((link) => (
                      <li key={link.label}>
                        <Link
                          to={link.to}
                          className="text-foreground hover:text-primary transition-colors"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Hosts Column */}
                <div>
                  <h3 className="font-bold text-base mb-2">Hosts</h3>
                  <div className="w-12 h-1 bg-primary mb-4"></div>
                  <ul className="space-y-2">
                    <li>
                      <Link
                        to="/become-host"
                        className="text-foreground hover:text-primary transition-colors"
                      >
                        Become a Host
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={() => setAuthDialogOpen(true)}
                        className="text-foreground hover:text-primary transition-colors"
                      >
                        Log In
                      </button>
                    </li>
                  </ul>
                </div>

                {/* Support Column */}
                <div>
                  <h3 className="font-bold text-base mb-2">Support</h3>
                  <div className="w-12 h-1 bg-primary mb-4"></div>
                  <ul className="space-y-2">
                    {supportLinks.map((link) => (
                      <li key={link.label}>
                        <Link
                          to={link.to}
                          className="text-foreground hover:text-primary transition-colors"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Bottom Section - Copyright */}
            <div className="text-center pt-8 border-t border-card-border">
              <p className="text-text-secondary">
                © 2025 [Platform Name]. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </>
  );
};

export default SearchPageFooter;
