import { Link, useLocation, useNavigate } from "react-router-dom";
import { getTokenPayload } from "../utils/token";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  const token = localStorage.getItem("token");
  const payload = getTokenPayload(token);
  const isAdmin = payload?.role === "admin";
  const navLinkStyle = isAdmin ? styles.adminLink : styles.link;
  const linksStyle = isAdmin ? { ...styles.links, gap: "4px" } : styles.links;
  const logoutButtonStyle = isAdmin
    ? styles.adminLogoutButton
    : styles.logoutButton;
  const navigationLinks = isAdmin
    ? [
        { to: "/admin", label: "Dashboard" },
        { to: "/admin/insights", label: "Insights" },
        { to: "/admin/challenges", label: "Challenges" },
        { to: "/admin/soc-cases", label: "SOC Cases" },
        { to: "/admin/incidents", label: "Incidents" },
        { to: "/admin/learning", label: "Learning Center" },
        { to: "/admin/reviews", label: "Reviews" },
        { to: "/admin/contact-messages", label: "Messages" },
        { to: "/leaderboard", label: "Leaderboard" },
      ]
    : [
        { to: "/dashboard", label: "Dashboard" },
        { to: "/tutorials", label: "Learning Center" },
        { to: "/challenges", label: "Challenges" },
        { to: "/soc-cases", label: "SOC Cases" },
        { to: "/incidents", label: "Incident Response" },
        { to: "/progress", label: "Progress" },
        { to: "/review", label: "Review" },
        { to: "/contact", label: "Contact" },
        { to: "/leaderboard", label: "Leaderboard" },
      ];

  return (
    <nav className="navbar" style={styles.navbar}>
      <div className="navbar-inner" style={styles.navbarInner}>
        <div className="navbar-brand" style={styles.brand}>
          <div className="navbar-brand-icon" style={styles.brandIcon}>
            C
          </div>
          <div style={styles.brandTextWrap}>
            <div className="navbar-logo" style={styles.brandLogo}>
              CyberSec Platform
            </div>
            <div className="navbar-tag" style={styles.brandTag}>
              Training | Labs | Progress
            </div>
          </div>
        </div>

        <div className="navbar-links" style={linksStyle}>
          {navigationLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar-link ${isActive(link.to) ? "active" : ""}`}
              style={{
                ...navLinkStyle,
                ...(isActive(link.to) ? styles.activeLink : {}),
              }}
            >
              {link.label}
            </Link>
          ))}

          <button
            onClick={handleLogout}
            className="navbar-logout"
            style={logoutButtonStyle}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    width: "100%",
    padding: "12px 0",
    background: "rgba(15, 23, 42, 0.95)",
    WebkitBackdropFilter: "blur(10px)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
  },
  navbarInner: {
    width: "100%",
    maxWidth: "1240px",
    margin: "0 auto",
    padding: "0 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "nowrap",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flex: "0 0 auto",
    minWidth: 0,
  },
  brandIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "11px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    color: "#ffffff",
    background: "linear-gradient(135deg, #7c3aed, #2563eb)",
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.25)",
    flex: "0 0 auto",
  },
  brandTextWrap: {
    minWidth: 0,
  },
  brandLogo: {
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "700",
    lineHeight: "1.1",
    whiteSpace: "nowrap",
  },
  brandTag: {
    fontSize: "11px",
    color: "rgba(255, 255, 255, 0.65)",
    marginTop: "2px",
    whiteSpace: "nowrap",
  },
  links: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "8px",
    flexWrap: "nowrap",
    flex: "1 1 auto",
    minWidth: 0,
    overflowX: "auto",
    overflowY: "hidden",
    scrollbarWidth: "thin",
    paddingBottom: "2px",
  },
  link: {
    textDecoration: "none",
    color: "#d1d5db",
    fontWeight: "600",
    fontSize: "14px",
    padding: "8px 11px",
    borderRadius: "10px",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    flex: "0 0 auto",
  },
  adminLink: {
    textDecoration: "none",
    color: "#d1d5db",
    fontWeight: "600",
    fontSize: "14px",
    padding: "7px 7px",
    borderRadius: "10px",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    flex: "0 0 auto",
  },
  activeLink: {
    color: "#ffffff",
    background:
      "linear-gradient(135deg, rgba(124, 58, 237, 0.22), rgba(37, 99, 235, 0.22))",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  logoutButton: {
    border: "none",
    padding: "8px 12px",
    borderRadius: "10px",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
    color: "#ffffff",
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    whiteSpace: "nowrap",
    flex: "0 0 auto",
  },
  adminLogoutButton: {
    border: "none",
    padding: "7px 8px",
    borderRadius: "10px",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
    color: "#ffffff",
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    whiteSpace: "nowrap",
    flex: "0 0 auto",
  },
};

export default Navbar;
