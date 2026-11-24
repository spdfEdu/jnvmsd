import { Link, NavLink } from "react-router-dom";

const Navbar = () => {
  const navLinks = [
    { name: "Home", path: "/homepage" },
    { name: "Reunion 2026", path: "/reunion-2026" },
    { name: "Batches", path: "/batches" },
    { name: "Directory", path: "/directory" },
    { name: "Blood Donors", path: "/blood-donors" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
      <Link to="/homepage">
        <h1 className="text-xl font-bold text-gray-900">Alumni Association</h1>
      </Link>

      <div className="flex items-center gap-6">
        {navLinks.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.path === "/" || link.path === "/homepage"}
            className={({ isActive }) =>
              isActive
                ? "font-semibold text-blue-600"
                : "text-gray-600 hover:text-blue-600 transition-colors"
            }
          >
            {link.name}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
