import { useState, useEffect } from "react";
import { Menu, X, LogOut, LayoutDashboard, Utensils, Calculator, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "./NavLink";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { NotificationCenter } from "./NotificationCenter";
import type { User } from "@supabase/supabase-js";

const ADMIN_EMAILS = [
  'laxmidevimachannagari@gmail.com',
  'achsahgrace15@gmail.com'
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  return <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-primary">
              ZENPAL
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/features">Features</NavLink>
            <NavLink to="/technology">Technology</NavLink>
            <NavLink to="/ai-ml">AI & ML</NavLink>
            <NavLink to="/impact">Impact</NavLink>
            <NavLink to="/team">Team</NavLink>
            <NavLink to="/contact">Contact</NavLink>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/meal-planning">
                    <Utensils className="h-4 w-4 mr-2" />
                    Meal Plan
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/bmi-calculator">
                    <Calculator className="h-4 w-4 mr-2" />
                    BMI
                  </Link>
                </Button>
                {user.email && ADMIN_EMAILS.includes(user.email) && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin/messages">
                      <Shield className="h-4 w-4 mr-2" />
                      Admin
                    </Link>
                  </Button>
                )}
                <NotificationCenter />
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </> : <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth">Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/auth">Sign Up</Link>
                </Button>
              </>}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && <div className="md:hidden mt-4 pb-4 space-y-4">
            <NavLink to="/" onClick={() => setIsOpen(false)}>Home</NavLink>
            <NavLink to="/features" onClick={() => setIsOpen(false)}>Features</NavLink>
            <NavLink to="/technology" onClick={() => setIsOpen(false)}>Technology</NavLink>
            <NavLink to="/ai-ml" onClick={() => setIsOpen(false)}>AI & ML</NavLink>
            <NavLink to="/impact" onClick={() => setIsOpen(false)}>Impact</NavLink>
            <NavLink to="/team" onClick={() => setIsOpen(false)}>Team</NavLink>
            <NavLink to="/contact" onClick={() => setIsOpen(false)}>Contact</NavLink>
            
            <div className="pt-4 border-t border-border/50 space-y-2">
              {user ? <>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to="/meal-planning" onClick={() => setIsOpen(false)}>
                      <Utensils className="h-4 w-4 mr-2" />
                      Meal Plan
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to="/bmi-calculator" onClick={() => setIsOpen(false)}>
                      <Calculator className="h-4 w-4 mr-2" />
                      BMI Calculator
                    </Link>
                  </Button>
                  {user.email && ADMIN_EMAILS.includes(user.email) && (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to="/admin/messages" onClick={() => setIsOpen(false)}>
                        <Shield className="h-4 w-4 mr-2" />
                        Admin
                      </Link>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="w-full" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </> : <>
                  <Button variant="ghost" size="sm" className="w-full" asChild>
                    <Link to="/auth" onClick={() => setIsOpen(false)}>Login</Link>
                  </Button>
                  <Button size="sm" className="w-full" asChild>
                    <Link to="/auth" onClick={() => setIsOpen(false)}>Sign Up</Link>
                  </Button>
                </>}
            </div>
          </div>}
      </div>
    </nav>;
};
export default Navbar;