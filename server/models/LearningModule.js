const mongoose = require('mongoose');

const learningModuleSchema = new mongoose.Schema({
  // Basic Module Information
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    maxlength: 200
  },
  
  // Source Information
  sourceSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  originalMentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Content Classification
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
  
  // AI-Generated Content
  content: {
    // Video Content
    videoUrl: {
      type: String,
      required: true
    },
    videoDuration: {
      type: Number, // in seconds
      required: true
    },
    videoQuality: String,
    videoSize: Number, // in bytes
    
    // Audio Content
    audioUrl: String,
    audioSize: Number,
    
    // Transcript
    transcript: {
      fullText: {
        type: String,
        required: true
      },
      timestampedSegments: [{
        startTime: Number, // in seconds
        endTime: Number,
        text: String,
        speaker: String,
        confidence: Number
      }],
      language: {
        type: String,
        default: 'en'
      },
      accuracy: Number // confidence score
    },
    
    // AI-Generated Chapters
    chapters: [{
      title: {
        type: String,
        required: true
      },
      startTime: {
        type: Number, // in seconds
        required: true
      },
      endTime: {
        type: Number,
        required: true
      },
      description: String,
      keyPoints: [String],
      thumbnail: String, // URL to chapter thumbnail
      importance: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
      }
    }],
    
    // AI-Generated Summary
    summary: {
      executiveSummary: {
        type: String,
        required: true
      },
      keyTakeaways: [{
        type: String,
        required: true
      }],
      actionItems: [String],
      mainTopics: [String],
      difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard']
      },
      estimatedReadTime: Number // in minutes
    },
    
    // Keywords and Tags
    keywords: [{
      term: String,
      relevance: Number, // score 0-1
      frequency: Number
    }],
    autoTags: [String],
    manualTags: [String]
  },
  
  // Learning Pathway Integration
  learningPath: {
    prerequisites: [{
      moduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LearningModule'
      },
      title: String,
      isRequired: {
        type: Boolean,
        default: true
      }
    }],
    nextRecommended: [{
      moduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LearningModule'
      },
      title: String,
      reason: String
    }],
    relatedModules: [{
      moduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LearningModule'
      },
      title: String,
      relationship: {
        type: String,
        enum: ['supplement', 'extension', 'alternative', 'update']
      }
    }]
  },
  
  // Assessment Integration
  assessments: [{
    type: {
      type: String,
      enum: ['quiz', 'assignment', 'practical', 'project'],
      required: true
    },
    title: String,
    description: String,
    questions: [{
      question: String,
      type: {
        type: String,
        enum: ['multiple-choice', 'true-false', 'short-answer', 'essay']
      },
      options: [String], // for multiple choice
      correctAnswer: String,
      explanation: String,
      points: {
        type: Number,
        default: 1
      }
    }],
    passingScore: {
      type: Number,
      default: 70
    },
    timeLimit: Number, // in minutes
    maxAttempts: {
      type: Number,
      default: 3
    },
    isRequired: {
      type: Boolean,
      default: true
    }
  }],
  
  // Learning Objectives and Outcomes
  learningObjectives: [{
    objective: {
      type: String,
      required: true
    },
    bloomLevel: {
      type: String,
      enum: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
    },
    measurementCriteria: String
  }],
  
  expectedOutcomes: [String],
  
  // Resources and Materials
  supplementaryResources: [{
    title: String,
    url: String,
    type: {
      type: String,
      enum: ['document', 'presentation', 'video', 'article', 'tool', 'external-link']
    },
    description: String,
    isRequired: Boolean,
    estimatedTime: Number // in minutes
  }],
  
  // Module Metadata
  estimatedDuration: {
    type: Number, // in minutes
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true
  },
  
  // Engagement and Analytics
  analytics: {
    totalViews: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    averageWatchTime: {
      type: Number,
      default: 0
    },
    dropOffPoints: [{
      timestamp: Number, // in seconds
      percentage: Number // percentage of users who dropped off
    }],
    popularChapters: [{
      chapterIndex: Number,
      views: Number,
      engagement: Number
    }]
  },
  
  // User Interactions
  reviews: [{
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
    helpfulVotes: {
      type: Number,
      default: 0
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Accessibility Features
  accessibility: {
    hasClosedCaptions: {
      type: Boolean,
      default: true
    },
    hasAudioDescription: Boolean,
    hasSignLanguage: Boolean,
    transcriptLanguages: [String],
    isScreenReaderFriendly: Boolean
  },
  
  // Content Management
  status: {
    type: String,
    enum: ['draft', 'review', 'published', 'archived', 'deprecated'],
    default: 'draft'
  },
  publishedAt: Date,
  archivedAt: Date,
  
  version: {
    type: String,
    default: '1.0'
  },
  versionHistory: [{
    version: String,
    changes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Quality Assurance
  qualityCheck: {
    contentAccuracy: {
      score: Number, // 1-10
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reviewedAt: Date,
      notes: String
    },
    technicalQuality: {
      videoQuality: Number, // 1-10
      audioQuality: Number, // 1-10
      transcriptAccuracy: Number, // 1-10
      reviewedAt: Date
    },
    pedagogicalReview: {
      score: Number, // 1-10
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reviewedAt: Date,
      feedback: String
    }
  },
  
  // Search and Discovery
  searchTerms: [String],
  popularity: {
    type: Number,
    default: 0
  },
  trending: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // AI Enhancement Tracking
  aiProcessing: {
    enhancedAt: Date,
    enhancementVersion: String,
    improvementSuggestions: [String],
    nextReviewDate: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
learningModuleSchema.index({ domain: 1, skillLevel: 1 });
learningModuleSchema.index({ status: 1, publishedAt: 1 });
learningModuleSchema.index({ 'content.autoTags': 1 });
learningModuleSchema.index({ 'content.manualTags': 1 });
learningModuleSchema.index({ originalMentor: 1 });
learningModuleSchema.index({ sourceSession: 1 });
learningModuleSchema.index({ searchTerms: 'text', title: 'text', description: 'text' });

// Virtual for formatted duration
learningModuleSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.estimatedDuration / 60);
  const minutes = this.estimatedDuration % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
});

// Virtual for average chapter duration
learningModuleSchema.virtual('averageChapterDuration').get(function() {
  if (!this.content.chapters || this.content.chapters.length === 0) return 0;
  
  const totalChapterTime = this.content.chapters.reduce((sum, chapter) => {
    return sum + (chapter.endTime - chapter.startTime);
  }, 0);
  
  return Math.round(totalChapterTime / this.content.chapters.length);
});

// Virtual for engagement score
learningModuleSchema.virtual('engagementScore').get(function() {
  const views = this.analytics.totalViews || 0;
  const completion = this.analytics.completionRate || 0;
  const rating = this.analytics.averageRating || 0;
  
  // Weighted engagement score
  return Math.round((views * 0.3 + completion * 0.4 + rating * 20 * 0.3) / 3);
});

// Method to update analytics
learningModuleSchema.methods.updateAnalytics = function(analyticsData) {
  Object.assign(this.analytics, analyticsData);
  return this.save();
};

// Method to add review
learningModuleSchema.methods.addReview = function(userId, rating, comment) {
  this.reviews.push({
    userId,
    rating,
    comment,
    submittedAt: new Date()
  });
  
  // Update average rating
  const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.analytics.averageRating = Math.round((totalRating / this.reviews.length) * 10) / 10;
  this.analytics.totalRatings = this.reviews.length;
  
  return this.save();
};

// Method to publish module
learningModuleSchema.methods.publish = function() {
  this.status = 'published';
  this.publishedAt = new Date();
  return this.save();
};

// Method to create new version
learningModuleSchema.methods.createNewVersion = function(changes, updatedBy) {
  this.versionHistory.push({
    version: this.version,
    changes,
    updatedBy,
    updatedAt: new Date()
  });
  
  // Increment version
  const [major, minor] = this.version.split('.').map(Number);
  this.version = `${major}.${minor + 1}`;
  
  return this.save();
};

// Static method to find popular modules
learningModuleSchema.statics.findPopular = function(limit = 10) {
  return this.find({ status: 'published' })
    .sort({ 'analytics.totalViews': -1, 'analytics.averageRating': -1 })
    .limit(limit)
    .populate('originalMentor', 'firstName lastName profilePicture');
};

// Static method to find recommended modules
learningModuleSchema.statics.findRecommended = function(domain, skillLevel, limit = 5) {
  return this.find({
    status: 'published',
    domain,
    skillLevel: { $in: [skillLevel] }
  })
  .sort({ 'analytics.averageRating': -1, 'analytics.totalViews': -1 })
  .limit(limit)
  .populate('originalMentor', 'firstName lastName profilePicture');
};

// Static method to search modules
learningModuleSchema.statics.searchModules = function(query, filters = {}) {
  const searchQuery = {
    status: 'published',
    $text: { $search: query }
  };
  
  // Apply filters
  if (filters.domain) searchQuery.domain = filters.domain;
  if (filters.skillLevel) searchQuery.skillLevel = filters.skillLevel;
  if (filters.difficulty) searchQuery.difficulty = filters.difficulty;
  if (filters.duration) {
    const [min, max] = filters.duration.split('-').map(Number);
    searchQuery.estimatedDuration = { $gte: min, $lte: max };
  }
  
  return this.find(searchQuery)
    .sort({ score: { $meta: 'textScore' }, 'analytics.averageRating': -1 })
    .populate('originalMentor', 'firstName lastName profilePicture');
};

module.exports = mongoose.model('LearningModule', learningModuleSchema);