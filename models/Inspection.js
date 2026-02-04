const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Frontend ID (e.g. "inspection_123...")
    localId: {
        type: String,
        required: true,
        index: true,
        unique: true
    },

    status: {
        type: String,
        enum: ['in-progress', 'completed'],
        default: 'in-progress'
    },

    currentStep: {
        type: Number,
        default: 1
    },

    // Flexible Property Data (stores whatever frontend sends)
    propertyData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Rooms array
    rooms: [{
        id: String,
        name: String,
        type: String,
        photos: [String], // URLs or Base64
        audios: [String], // URLs or Base64 (frontend uses 'audios' not 'audioBlob')
        condition: String,
        description: String,
        observations: String
    }],

    pdfGenerated: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    },

    completedAt: Date
});

// Update the updatedAt timestamp before saving
inspectionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Index for faster queries
inspectionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Inspection', inspectionSchema);
