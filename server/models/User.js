const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Profile Information
  profilePicture: {
    type: String,
    default: null
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    required: true,
    enum: ['Finance', 'HR', 'Operations', 'Safety', 'Engineering', 'Marketing', 'IT', 'Legal', 'Research', 'Management']
  },
  designation: {
    type: String,
    required: true
  },
  
  // Role and Permissions
  role: {
    type: String,
    enum: ['student', 'mentor', 'admin', 'super_admin'],
    default: 'student'
  },
  permissions: [{
    type: String,
    enum: ['create_session', 'manage_users', 'view_analytics', 'moderate_content', 'manage_assessments']
  }],
  
  // Learning Profile
  skillLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    default: 'Beginner'
  },
  interests: [{
    type: String
  }],
  learningGoals: [{
    goal: String,
    targetDate: Date,
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  }],
  
  // Mentor Information (for mentors only)
  mentorProfile: {
    expertise: [{
      domain: String,
      yearsOfExperience: Number,
      certifications: [String]
    }],
    bio: String,
    availableHours: {
      type: Number,
      default: 0
    },
    rating: {
      average: {
        type: Number,
        default: 0
      },
      count: {
        type: Number,
        default: 0
      }
    }
  },
  
  // Learning Progress
  completedModules: [{
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningModule'
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    score: Number,
    timeSpent: Number // in minutes
  }],
  
  // Certifications and Badges
  certifications: [{
    name: String,
    issuedDate: Date,
    expiryDate: Date,
    certificateUrl: String,
    issuer: String
  }],
  badges: [{
    name: String,
    description: String,
    earnedDate: {
      type: Date,
      default: Date.now
    },
    badgeUrl: String
  }],
  
  // Activity Tracking
  lastActive: {
    type: Date,
    default: Date.now
  },
  totalLearningTime: {
    type: Number,
    default: 0 // in minutes
  },
  sessionsAttended: [{
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session'
    },
    attendedAt: {
      type: Date,
      default: Date.now
    },
    rating: Number,
    feedback: String
  }],
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    preferredLanguage: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    learningReminders: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
userSchema.index({ employeeId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ department: 1, role: 1 });
userSchema.index({ 'mentorProfile.expertise.domain': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for learning progress percentage
userSchema.virtual('learningProgress').get(function() {
  if (this.completedModules.length === 0) return 0;
  const totalScore = this.completedModules.reduce((sum, module) => sum + (module.score || 0), 0);
  return Math.round(totalScore / this.completedModules.length);
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update last active
userSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save();
};

// Method to add learning time
userSchema.methods.addLearningTime = function(minutes) {
  this.totalLearningTime += minutes;
  return this.save();
};

// Method to award badge
userSchema.methods.awardBadge = function(badgeData) {
  this.badges.push({
    name: badgeData.name,
    description: badgeData.description,
    badgeUrl: badgeData.badgeUrl,
    earnedDate: new Date()
  });
  return this.save();
};

// Method to complete module
userSchema.methods.completeModule = function(moduleId, score, timeSpent) {
  this.completedModules.push({
    moduleId,
    score,
    timeSpent,
    completedAt: new Date()
  });
  this.totalLearningTime += timeSpent;
  return this.save();
};

// Static method to find users by department
userSchema.statics.findByDepartment = function(department) {
  return this.find({ department, isActive: true });
};

// Static method to find mentors by expertise
userSchema.statics.findMentorsByExpertise = function(domain) {
  return this.find({
    role: 'mentor',
    isActive: true,
    'mentorProfile.expertise.domain': domain
  });
};

module.exports = mongoose.model('User', userSchema);