const requireAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Access denied. No user found"
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        error: "Access denied. Admins only"
      });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({
      error: "Authorization failed"
    });
  }
};

module.exports = requireAdmin;