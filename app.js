// ============================================
// Main Application
// ============================================

// Global application state
window.AppState = {
    currentStep: 1,
    propertyData: {},
    rooms: []
};

// ============================================
// Wizard Navigation
// ============================================

const Wizard = {
    /**
     * Go to specific step
     */
    goToStep(stepNumber) {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(step => {
            step.classList.add('hidden');
        });

        // Show target step
        document.getElementById(`step${stepNumber}`).classList.remove('hidden');

        // Update wizard navigation
        document.querySelectorAll('.wizard-step').forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');

            if (stepNum === stepNumber) {
                step.classList.add('active');
            } else if (stepNum < stepNumber) {
                step.classList.add('completed');
            }
        });

        // Update current step
        window.AppState.currentStep = stepNumber;

        // Auto-save current inspection
        Storage.saveCurrentInspection();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Validate and go to next step
     */
    nextStep() {
        const currentStep = window.AppState.currentStep;

        if (currentStep === 1) {
            // Validate property form
            if (!this.validatePropertyForm()) {
                Utils.showNotification('Preencha todos os campos obrigatórios', 'error');
                return;
            }
            this.savePropertyData();
            this.goToStep(2); // Go to rooms step
        } else if (currentStep === 2) {
            // Validate rooms before going to review
            if (Rooms.getRooms().length === 0) {
                Utils.showNotification('Adicione pelo menos um cômodo antes de continuar', 'warning');
                return; // Don't allow proceeding without rooms
            }
            this.goToStep(3); // Go to review
            this.showReview();
        } else if (currentStep === 3) {
            this.goToStep(4); // Go to report
            this.generateReport();
        }
    },

    /**
     * Go to previous step
     */
    previousStep() {
        const currentStep = window.AppState.currentStep;
        if (currentStep > 1) {
            this.goToStep(currentStep - 1);
        }
    },

    /**
     * Validate property form
     */
    validatePropertyForm() {
        const requiredFields = [
            'inspectionType',
            'propertyCode',
            'propertyType',
            'address',
            'addressNumber',
            'neighborhood',
            'city',
            'zipCode'
        ];

        let isValid = true;

        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field.value.trim()) {
                field.style.borderColor = 'var(--error)';
                isValid = false;
            } else {
                field.style.borderColor = '';
            }
        });

        return isValid;
    },

    /**
     * Save property data from form
     */
    savePropertyData() {
        window.AppState.propertyData = {
            inspectionType: document.getElementById('inspectionType').value,
            code: document.getElementById('propertyCode').value,
            type: document.getElementById('propertyType').value,
            address: document.getElementById('address').value,
            addressNumber: document.getElementById('addressNumber').value,
            addressComplement: document.getElementById('addressComplement').value,
            neighborhood: document.getElementById('neighborhood').value,
            city: document.getElementById('city').value,
            zipCode: document.getElementById('zipCode').value,
            bedrooms: parseInt(document.getElementById('bedrooms').value) || 0,
            suites: parseInt(document.getElementById('suites').value) || 0,
            livingRooms: parseInt(document.getElementById('livingRooms').value) || 0,
            bathrooms: parseInt(document.getElementById('bathrooms').value) || 0,
            toilets: parseInt(document.getElementById('toilets').value) || 0,
            kitchens: parseInt(document.getElementById('kitchens').value) || 0,
            balconies: parseInt(document.getElementById('balconies').value) || 0,
            parkingSpaces: parseInt(document.getElementById('parkingSpaces').value) || 0,
            totalArea: parseFloat(document.getElementById('totalArea').value) || null,
            hasPool: document.getElementById('hasPool').checked,
            hasJacuzzi: document.getElementById('hasJacuzzi').checked,
            hasSauna: document.getElementById('hasSauna').checked,
            hasGarden: document.getElementById('hasGarden').checked,
            hasBackyard: document.getElementById('hasBackyard').checked,
            hasBarbecue: document.getElementById('hasBarbecue').checked,
            generalNotes: document.getElementById('generalNotes').value
        };

        Storage.saveCurrentInspection();
    },

    /**
     * Show review page
     */
    showReview() {
        Report.generateReview(window.AppState.propertyData, Rooms.getRooms());
    },

    /**
     * Generate final report
     */
    generateReport() {
        Report.showReportPreview(window.AppState.propertyData, Rooms.getRooms());
    }
};

// ============================================
// Event Listeners
// ============================================

// Navigation buttons
document.getElementById('nextToRoomsBtn').addEventListener('click', () => {
    Wizard.nextStep();
});

document.getElementById('backToPropertyBtn').addEventListener('click', () => {
    Wizard.previousStep();
});

document.getElementById('nextToReviewBtn').addEventListener('click', () => {
    Wizard.nextStep();
});

document.getElementById('backToRoomsBtn').addEventListener('click', () => {
    Wizard.previousStep();
});

document.getElementById('generateReportBtn').addEventListener('click', () => {
    Wizard.nextStep();
});

document.getElementById('backToReviewBtn').addEventListener('click', () => {
    Wizard.previousStep();
});

// PDF Download
document.getElementById('downloadPdfBtn').addEventListener('click', async () => {
    await PDFGenerator.generatePDF(window.AppState.propertyData, Rooms.getRooms());
});

// New Inspection
document.getElementById('newInspectionBtn').addEventListener('click', () => {
    if (confirm('Deseja iniciar uma nova vistoria? A vistoria atual será salva automaticamente no histórico.')) {
        // Save current inspection before creating new one
        Storage.saveCurrentInspection();

        // Create new inspection
        const newId = Storage.createNewInspection();

        // Clear all data
        window.AppState = {
            currentStep: 1,
            propertyData: {},
            rooms: []
        };

        // Reset forms
        document.getElementById('propertyForm').reset();
        Rooms.clearRooms();

        // Go to step 1
        Wizard.goToStep(1);

        Utils.showNotification('Nova vistoria iniciada', 'success');
    }
});

// Save Draft Button
document.getElementById('saveDraftBtn').addEventListener('click', () => {
    // Save property data
    Wizard.savePropertyData();

    // Show success notification with timestamp
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    Utils.showNotification(`✅ Progresso salvo às ${timeStr}`, 'success');
});

// History button is now handled in history.js

// Auto-save on form changes
document.getElementById('propertyForm').addEventListener('change',
    Utils.debounce(() => {
        Wizard.savePropertyData();
    }, 1000)
);

// Wizard step click navigation
document.querySelectorAll('.wizard-step').forEach(step => {
    step.addEventListener('click', () => {
        const stepNumber = parseInt(step.dataset.step);
        const currentStep = window.AppState.currentStep;

        // Only allow going back or to completed steps
        if (stepNumber < currentStep) {
            Wizard.goToStep(stepNumber);
        } else if (stepNumber === currentStep + 1) {
            Wizard.nextStep();
        }
    });
});

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('VistoriaApp initialized');

    // Initialize Authentication
    if (window.Auth) {
        Auth.init();
    } else {
        console.error('Auth module not loaded!');
    }

    // Initialize auto-save
    Storage.initAutoSave();

    // Check for current inspection or create new one
    let currentId = Storage.getCurrentInspectionId();

    if (!currentId) {
        // No current inspection - Do NOT create one automatically.
        // Wait for user interaction or create a temporary draft in memory.
        console.log('No active inspection. Waiting for user action.');
        // Optionally reset UI to "Welcome" state or empty form
    } else {
        // Load current inspection
        const inspection = Storage.getInspection(currentId);
        if (inspection) {
            console.log('Loading current inspection:', currentId);

            // Load data into app state
            window.AppState.propertyData = inspection.propertyData;
            window.AppState.rooms = inspection.rooms;
            window.AppState.currentStep = inspection.currentStep;

            // Load rooms
            if (inspection.rooms && inspection.rooms.length > 0) {
                Rooms.setRooms(inspection.rooms);
            }
        } else {
            // Inspection not found, create new one
            currentId = Storage.createNewInspection();
            console.log('Inspection not found, created new:', currentId);
        }
    }

    // Set default values
    document.getElementById('kitchens').value = 1;

    Utils.showNotification('VistoriaApp carregado com sucesso!', 'success');
});

// Prevent accidental page close
window.addEventListener('beforeunload', (e) => {
    if (Rooms.getRooms().length > 0 || Object.keys(window.AppState.propertyData).length > 0) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Expose for debugging
window.VistoriaApp = {
    Wizard,
    Rooms,
    Camera,
    AudioRecorder,
    Report,
    PDFGenerator,
    Storage,
    Utils,
    AppState: window.AppState
};

console.log('VistoriaApp modules loaded. Access via window.VistoriaApp');
