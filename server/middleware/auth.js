const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token - user not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Account is deactivated'
      });
    }

    // Update last active
    user.updateLastActive();

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Error verifying token'
    });
  }
};

// Role-based access control
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Permission-based access control
const authorizePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: `Required permissions: ${requiredPermissions.join(', ')}`
      });
    }

    next();
  };
};

// Department-based access control
const authorizeDepartment = (...allowedDepartments) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }

    if (!allowedDepartments.includes(req.user.department) && 
        !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: `Access restricted to departments: ${allowedDepartments.join(', ')}`
      });
    }

    next();
  };
};

// Mentor-specific access control
const authorizeMentor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'mentor' && !['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({
      error: 'Access forbidden',
      message: 'Mentor access required'
    });
  }

  next();
};

// Resource ownership verification
const authorizeOwnership = (resourceField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }

    // Admin and super_admin can access any resource
    if (['admin', 'super_admin'].includes(req.user.role)) {
      return next();
    }

    // Extract resource ID from request
    const resourceId = req.params.id || req.body[resourceField] || req.query[resourceField];
    
    if (!resourceId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Resource ID required'
      });
    }

    // Check if user owns the resource
    if (resourceId !== req.user._id.toString()) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You can only access your own resources'
      });
    }

    next();
  };
};

// Session participant verification
const authorizeSessionParticipant = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }

    // Admin and super_admin can access any session
    if (['admin', 'super_admin'].includes(req.user.role)) {
      return next();
    }

    const sessionId = req.params.sessionId || req.params.id;
    if (!sessionId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Session ID required'
      });
    }

    const Session = require('../models/Session');
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Session not found'
      });
    }

    // Check if user is the mentor or a registered participant
    const isMentor = session.mentor.toString() === req.user._id.toString();
    const isParticipant = session.registeredParticipants.some(
      participant => participant.userId.toString() === req.user._id.toString()
    );

    if (!isMentor && !isParticipant) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You must be registered for this session to access it'
      });
    }

    req.session = session;
    next();
  } catch (error) {
    console.error('Session authorization error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Error verifying session access'
    });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
        user.updateLastActive();
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizePermissions,
  authorizeDepartment,
  authorizeMentor,
  authorizeOwnership,
  authorizeSessionParticipant,
  optionalAuth
};