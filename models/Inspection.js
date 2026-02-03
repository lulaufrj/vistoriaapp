const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
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

    // Property Data
    propertyData: {
        endereco: String,
        numero: String,
        complemento: String,
        bairro: String,
        cidade: String,
        estado: String,
        cep: String,
        tipoImovel: String,
        finalidade: String,
        proprietario: String,
        solicitante: String
    },

    // Rooms array
    rooms: [{
        id: String,
        name: String,
        type: String,
        photos: [String], // Base64 encoded images
        audioTranscription: String,
        audioBlob: String, // Base64 encoded audio
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
