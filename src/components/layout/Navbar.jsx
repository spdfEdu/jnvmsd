import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../../auth/useAuth";

/** Show navigation appropriate to the server-verified role. */
function AccountNav() {
  const { account } = useAuth();
  return (
    <nav className="alumni-account-nav" aria-label="Member services">
      <Link to="/profile">{account ? "My profile" : "Member sign-in"}</Link>
      {(account?.isCore || account?.isAdmin) && (
        <Link to="/organizers">Participation</Link>
      )}
      {account?.isAdmin && <Link to="/manage">Administration</Link>}
    </nav>
  );
}

/** Render the navbar view. */
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Home", path: "/homepage" },
    { name: "Reunion 2026", path: "/reunion-2026" },
    { name: "Batches", path: "/batches" },
    { name: "Directory", path: "/directory" },
    { name: "Blood Donors", path: "/blood-donors" },
    { name: "Events", path: "/events" },
    { name: "Gallery", path: "/gallery" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  /** Close navigation after the user chooses a destination. */
  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-[1250px] rounded-full px-6 py-[4px] bg-amber-100 ">
      <div className="mx-auto flex max-w-7xl items-center justify-between">

        {/* Logo */}
        <Link to="/homepage" onClick={closeMenu}>
          <img
            src={`${import.meta.env.BASE_URL}images/logo.png`}
            alt="Logo"
            className="h-14 w-auto object-contain"
          />
        </Link>

        {/* Dropdown Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 rounded-full text-gray-700 bg-white/10 px-5 py-3 backdrop-blur-md transition hover:bg-white/20"
          aria-expanded={isOpen}
          aria-label="Toggle navigation menu"
        >
          {/* <span className="text-sm font-medium">Menu</span> */}

          {isOpen ? (
            <X size={20} />
          ) : (
            <Menu size={20} />
          )}
        </button>
      </div>

      {/* Dropdown Menu */}
      <div
        className={`absolute right-6 top-20 w-64 origin-top-right rounded-2xl border border-white/10 bg-[#1E1917]/95 p-3 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          isOpen
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible -translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1">
          {navLinks.map((link, index) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === "/" || link.path === "/homepage"}
              onClick={closeMenu}
              style={{ transitionDelay: isOpen ? `${index * 30}ms` : "0ms" }}
              className={({ isActive }) =>
                `rounded-xl px-4 py-3 text-sm transition-colors duration-200 ${
                  isActive
                    ? "bg-white/15 font-semibold text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}

          <AccountNav />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
