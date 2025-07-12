const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
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
  profile: {
    firstName: String,
    lastName: String,
    bio: String,
    avatar: String,
    location: String,
    website: String,
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'beginner'
    },
    preferredLanguages: [{
      type: String,
      enum: ['java', 'python', 'javascript', 'cpp', 'csharp', 'go', 'rust', 'swift', 'kotlin', 'php']
    }],
    githubUsername: String,
    linkedinUrl: String
  },
  stats: {
    totalQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
  },
  achievements: [{
    type: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    icon: String,
    earnedAt: { type: Date, default: Date.now }
  }],
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    language: { type: String, default: 'en' },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      achievements: { type: Boolean, default: true }
    }
  },
  isVerified: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  premiumExpiresAt: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'stats.totalScore': -1 });
userSchema.index({ 'stats.lastActive': -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      userId: this._id, 
      username: this.username,
      email: this.email,
      isPremium: this.isPremium 
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Update stats method
userSchema.methods.updateStats = function(score, isCorrect) {
  this.stats.totalQuestions += 1;
  if (isCorrect) {
    this.stats.correctAnswers += 1;
  }
  this.stats.totalScore += score;
  this.stats.averageScore = this.stats.totalScore / this.stats.totalQuestions;
  this.stats.lastActive = new Date();
  
  // Update streak
  const today = new Date().toDateString();
  const lastActiveDate = new Date(this.stats.lastActive).toDateString();
  if (today === lastActiveDate) {
    this.stats.streakDays += 1;
  }
};

// Add achievement method
userSchema.methods.addAchievement = function(type, title, description, icon) {
  const achievement = {
    type,
    title,
    description,
    icon,
    earnedAt: new Date()
  };
  
  // Check if achievement already exists
  const exists = this.achievements.some(a => a.type === type && a.title === title);
  if (!exists) {
    this.achievements.push(achievement);
  }
};

// Get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    username: this.username,
    profile: this.profile,
    stats: this.stats,
    achievements: this.achievements,
    isPremium: this.isPremium,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema); 