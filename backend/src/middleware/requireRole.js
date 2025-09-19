// Role-based authorization middleware
// Usage: app.patch('/route', auth, requireRole('admin','volunteer'), handler)
module.exports = function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!roles.length) return next();
    if (roles.includes(req.user.role) || req.user.role === 'system_admin') return next();
    return res.status(403).json({ success: false, message: 'Forbidden: insufficient role' });
  };
};
