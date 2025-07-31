const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  // Basic Session Information
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Session Details
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  domain: {
    type: String,
    required: true,
    enum: ['Finance', 'HR', 'Operations', 'Safety', 'Engineering', 'Marketing', 'IT', 'Legal', 'Research', 'Management']
  },
  skillLevel: {
    type: String,
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
  },
  relevance: [{
    type: String,
    enum: ['Compliance', 'Role-Specific', 'Leadership', 'Technical', 'Soft-Skills', 'Safety', 'Innovation']
  }],
  
  // Scheduling
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true,
    default: 60
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  
  // Session Format
  format: {
    type: String,
    enum: ['online', 'in-person', 'hybrid'],
    required: true
  },
  platform: {
    type: String, // Zoom, Teams, etc.
    required: function() {
      return this.format === 'online' || this.format === 'hybrid';
    }
  },
  meetingLink: {
    type: String,
    required: function() {
      return this.format === 'online' || this.format === 'hybrid';
    }
  },
  location: {
    type: String,
    required: function() {
      return this.format === 'in-person' || this.format === 'hybrid';
    }
  },
  
  // Session Status
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'postponed'],
    default: 'scheduled'
  },
  
  // Recording Information
  recording: {
    isRecorded: {
      type: Boolean,
      default: true
    },
    videoUrl: String,
    audioUrl: String,
    size: Number, // in bytes
    duration: Number, // actual recorded duration in minutes
    format: String,
    quality: String
  },
  
  // AI Processing Status
  processingStatus: {
    transcription: {
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'failed'],
        default: 'pending'
      },
      progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      completedAt: Date,
      errorMessage: String
    },
    chapters: {
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'failed'],
        default: 'pending'
      },
      progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      completedAt: Date,
      errorMessage: String
    },
    summary: {
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'failed'],
        default: 'pending'
      },
      progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      completedAt: Date,
      errorMessage: String
    },
    tagging: {
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'failed'],
        default: 'pending'
      },
      progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      completedAt: Date,
      errorMessage: String
    }
  },
  
  // Participants
  registeredParticipants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['registered', 'attended', 'no-show', 'cancelled'],
      default: 'registered'
    }
  }],
  
  maxParticipants: {
    type: Number,
    default: 50
  },
  
  // Session Content
  agenda: [{
    topic: String,
    duration: Number, // in minutes
    description: String
  }],
  
  prerequisites: [String],
  learningObjectives: [String],
  
  // Resources
  resources: [{
    title: String,
    url: String,
    type: {
      type: String,
      enum: ['document', 'presentation', 'video', 'link', 'tool']
    },
    description: String
  }],
  
  // Feedback and Ratings
  feedback: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: String,
    aspects: {
      content: {
        type: Number,
        min: 1,
        max: 5
      },
      delivery: {
        type: Number,
        min: 1,
        max: 5
      },
      interaction: {
        type: Number,
        min: 1,
        max: 5
      },
      relevance: {
        type: Number,
        min: 1,
        max: 5
      }
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Session Analytics
  analytics: {
    totalAttendees: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    engagementScore: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      default: 0
    }
  },
  
  // Live Session Data
  liveData: {
    actualStartTime: Date,
    actualEndTime: Date,
    chatLog: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      message: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      type: {
        type: String,
        enum: ['message', 'question', 'poll', 'announcement'],
        default: 'message'
      }
    }],
    polls: [{
      question: String,
      options: [String],
      responses: [{
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        answer: String,
        submittedAt: {
          type: Date,
          default: Date.now
        }
      }],
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    breakoutRooms: [{
      name: String,
      participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      duration: Number
    }]
  },
  
  // Conversion to Learning Module
  learningModule: {
    isConverted: {
      type: Boolean,
      default: false
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningModule'
    },
    convertedAt: Date,
    conversionNotes: String
  },
  
  // Metadata
  tags: [String],
  isPublic: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  
  // Notifications
  notifications: {
    reminderSent: {
      type: Boolean,
      default: false
    },
    followUpSent: {
      type: Boolean,
      default: false
    },
    feedbackRequestSent: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
sessionSchema.index({ mentor: 1, scheduledDate: 1 });
sessionSchema.index({ domain: 1, skillLevel: 1 });
sessionSchema.index({ status: 1, scheduledDate: 1 });
sessionSchema.index({ 'registeredParticipants.userId': 1 });
sessionSchema.index({ tags: 1 });

// Virtual for formatted duration
sessionSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
});

// Virtual for session rating
sessionSchema.virtual('averageSessionRating').get(function() {
  if (this.feedback.length === 0) return 0;
  const totalRating = this.feedback.reduce((sum, fb) => sum + fb.rating, 0);
  return Math.round((totalRating / this.feedback.length) * 10) / 10;
});

// Virtual for attendance rate
sessionSchema.virtual('attendanceRate').get(function() {
  if (this.registeredParticipants.length === 0) return 0;
  const attended = this.registeredParticipants.filter(p => p.status === 'attended').length;
  return Math.round((attended / this.registeredParticipants.length) * 100);
});

// Virtual for processing completion
sessionSchema.virtual('processingComplete').get(function() {
  const statuses = this.processingStatus;
  return statuses.transcription.status === 'completed' &&
         statuses.chapters.status === 'completed' &&
         statuses.summary.status === 'completed' &&
         statuses.tagging.status === 'completed';
});

// Method to register participant
sessionSchema.methods.registerParticipant = function(userId) {
  const existingParticipant = this.registeredParticipants.find(
    p => p.userId.toString() === userId.toString()
  );
  
  if (existingParticipant) {
    throw new Error('User already registered for this session');
  }
  
  if (this.registeredParticipants.length >= this.maxParticipants) {
    throw new Error('Session is full');
  }
  
  this.registeredParticipants.push({
    userId,
    registeredAt: new Date(),
    status: 'registered'
  });
  
  return this.save();
};

// Method to mark attendance
sessionSchema.methods.markAttendance = function(userId, status = 'attended') {
  const participant = this.registeredParticipants.find(
    p => p.userId.toString() === userId.toString()
  );
  
  if (!participant) {
    throw new Error('User not registered for this session');
  }
  
  participant.status = status;
  this.analytics.totalAttendees = this.registeredParticipants.filter(
    p => p.status === 'attended'
  ).length;
  
  return this.save();
};

// Method to add feedback
sessionSchema.methods.addFeedback = function(userId, feedbackData) {
  this.feedback.push({
    userId,
    ...feedbackData,
    submittedAt: new Date()
  });
  
  // Update average rating
  const totalRating = this.feedback.reduce((sum, fb) => sum + fb.rating, 0);
  this.analytics.averageRating = Math.round((totalRating / this.feedback.length) * 10) / 10;
  
  return this.save();
};

// Method to start session
sessionSchema.methods.startSession = function() {
  this.status = 'in-progress';
  this.liveData.actualStartTime = new Date();
  return this.save();
};

// Method to end session
sessionSchema.methods.endSession = function() {
  this.status = 'completed';
  this.liveData.actualEndTime = new Date();
  
  // Calculate actual duration
  if (this.liveData.actualStartTime && this.liveData.actualEndTime) {
    const actualDuration = Math.round(
      (this.liveData.actualEndTime - this.liveData.actualStartTime) / (1000 * 60)
    );
    this.recording.duration = actualDuration;
  }
  
  return this.save();
};

// Static method to find upcoming sessions
sessionSchema.statics.findUpcoming = function(limit = 10) {
  return this.find({
    scheduledDate: { $gte: new Date() },
    status: { $in: ['scheduled'] }
  })
  .sort({ scheduledDate: 1 })
  .limit(limit)
  .populate('mentor', 'firstName lastName profilePicture mentorProfile');
};

// Static method to find sessions by mentor
sessionSchema.statics.findByMentor = function(mentorId) {
  return this.find({ mentor: mentorId })
    .sort({ scheduledDate: -1 })
    .populate('mentor', 'firstName lastName profilePicture');
};

module.exports = mongoose.model('Session', sessionSchema);