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
        try {
            console.log('Wizard.nextStep called', window.AppState.currentStep);
            const currentStep = window.AppState.currentStep;

            if (currentStep === 1) {
                // Validate property form
                if (!this.validatePropertyForm()) {
                    console.warn('Authentication failed: Missing required fields');
                    // Ensure notification is shown
                    if (window.Utils && Utils.showNotification) {
                        Utils.showNotification('Preencha os campos obrigatórios (marcados em vermelho)', 'error');
                    } else {
                        alert('Preencha os campos obrigatórios!');
                    }

                    // Scroll to first invalid field
                    const invalid = document.querySelector('.form-input[style*="border-color"]');
                    if (invalid) invalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }

                console.log('Form valid, saving data...');
                this.savePropertyData();
                console.log('Data saved, moving to step 2');
                this.goToStep(2); // Go to rooms step
            } else if (currentStep === 2) {
                // Go directly to Report (Step 3)
                this.goToStep(3);
                this.generateReport();
            }
        } catch (error) {
            console.error('Error in nextStep:', error);
            alert('Erro ao avançar: ' + error.message);
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
     * Populate property form from saved data
     */
    populateForm(data) {
        if (!data) return;

        // Map data to fields
        const setIfExists = (id, value) => {
            const el = document.getElementById(id);
            if (el && value !== undefined && value !== null) {
                if (el.type === 'checkbox') {
                    el.checked = value;
                } else {
                    el.value = value;
                }
            }
        };

        setIfExists('inspectionType', data.inspectionType);
        setIfExists('propertyCode', data.code);
        setIfExists('propertyType', data.type);
        setIfExists('address', data.address);
        setIfExists('addressNumber', data.addressNumber);
        setIfExists('addressComplement', data.addressComplement);
        setIfExists('neighborhood', data.neighborhood);
        setIfExists('city', data.city);
        setIfExists('zipCode', data.zipCode);

        setIfExists('bedrooms', data.bedrooms);
        setIfExists('suites', data.suites);
        setIfExists('livingRooms', data.livingRooms);
        setIfExists('bathrooms', data.bathrooms);
        setIfExists('toilets', data.toilets);
        setIfExists('kitchens', data.kitchens);
        setIfExists('balconies', data.balconies);
        setIfExists('parkingSpaces', data.parkingSpaces);
        setIfExists('totalArea', data.totalArea);

        setIfExists('hasPool', data.hasPool);
        setIfExists('hasJacuzzi', data.hasJacuzzi);
        setIfExists('hasSauna', data.hasSauna);
        setIfExists('hasGarden', data.hasGarden);
        setIfExists('hasBackyard', data.hasBackyard);
        setIfExists('hasBarbecue', data.hasBarbecue);

        setIfExists('generalNotes', data.generalNotes);
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
     * Generate final report
     */
    generateReport() {
        Report.showReportPreview(window.AppState.propertyData, Rooms.getRooms());
    },

    /**
     * Delete current inspection (New Feature)
     */
    deleteCurrentInspection() {
        const currentId = Storage.getCurrentInspectionId();
        if (!currentId) {
            Utils.showNotification('Nenhuma vistoria ativa para deletar', 'warning');
            return;
        }

        if (confirm('⚠️ ATENÇÃO: Deseja realmente excluir TODA a vistoria atual?\n\nIsso apagará:\n- Todos os dados do imóvel\n- Todos os cômodos e fotos\n\nEsta ação NÃO pode ser desfeita.')) {
            // Delete from storage (and clear AppState internally via Storage.deleteInspection update)
            Storage.deleteInspection(currentId);

            // Explicitly reset UI
            document.getElementById('propertyForm').reset();
            Rooms.clearRooms();

            // Reset AppState just in case
            window.AppState = {
                currentStep: 1,
                propertyData: {},
                rooms: []
            };

            // Go to start
            this.goToStep(1);

            Utils.showNotification('Vistoria excluída com sucesso!', 'success');
        }
    }
};

// ============================================
// Event Listeners
// ============================================

// ============================================
// Event Listeners
// ============================================

// Navigation buttons
const nextToRoomsBtn = document.getElementById('nextToRoomsBtn');
if (nextToRoomsBtn) {
    nextToRoomsBtn.addEventListener('click', (e) => {
        try {
            e.preventDefault(); // Prevent default form submission if any
            console.log('Next to Rooms clicked');

            if (typeof Wizard !== 'undefined' && Wizard.nextStep) {
                Wizard.nextStep();
            } else {
                console.error('Wizard is not defined!');
                alert('Erro crítico: O módulo "Wizard" não foi carregado corretamente. Recarregue a página.');
            }
        } catch (err) {
            console.error('Error in click handler:', err);
            alert('Erro ao clicar: ' + err.message);
        }
    });
} else {
    console.error('CRITICAL: Button "nextToRoomsBtn" not found in DOM!');
}

document.getElementById('backToPropertyBtn').addEventListener('click', () => {
    Wizard.previousStep();
});

// "Next" button on Rooms step now generates report
document.getElementById('generateReportBtn').addEventListener('click', () => {
    Wizard.nextStep();
});

// "Back" button on Report step (new ID)
const backToRoomsFromReportBtn = document.getElementById('backToRoomsFromReportBtn');
if (backToRoomsFromReportBtn) {
    backToRoomsFromReportBtn.addEventListener('click', () => {
        Wizard.previousStep();
    });
}

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

// Finalize Inspection
document.getElementById('finalizeInspectionBtn').addEventListener('click', () => {
    if (confirm('Confirma a finalização desta vistoria?\n\nEla será movida para a aba "Finalizadas" e não poderá mais ser editada.')) {
        const currentId = Storage.getCurrentInspectionId();

        if (currentId) {
            // Mark as completed in storage
            Storage.markAsCompleted(currentId);

            // Clear current session ID so it doesn't stay open
            localStorage.removeItem(Storage.CURRENT_ID_KEY);

            Utils.showNotification('Vistoria finalizada com sucesso!', 'success');

            // Reset UI for next inspection
            window.AppState = {
                currentStep: 1,
                propertyData: {},
                rooms: []
            };
            document.getElementById('propertyForm').reset();
            Rooms.clearRooms();
            Wizard.goToStep(1);

            // Open History Modal to show it's done (Optional, but good feedback)
            // document.getElementById('historyBtn').click();
            // Actually, let's just show the notification and go to start.
        } else {
            Utils.showNotification('Erro: Nenhuma vistoria ativa encontrada.', 'error');
        }
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

    // FORCE FRESH START (User Request)
    // Clear the current inspection ID so the form always starts empty
    // The previous inspection remains in history (localStorage) but is not loaded.
    console.log('🔄 Starting fresh session (clearing current ID)');
    if (localStorage.getItem(Storage.CURRENT_ID_KEY)) {
        localStorage.removeItem(Storage.CURRENT_ID_KEY);
    }

    // Reset AppState to be sure
    window.AppState = {
        currentStep: 1,
        propertyData: {},
        rooms: []
    };

    // Reset forms explicitly
    if (document.getElementById('propertyForm')) {
        document.getElementById('propertyForm').reset();
    }

    // Ensure we are on Step 1
    Wizard.goToStep(1);

    // Note: We do NOT load any inspection. 
    // A new one will be created automatically when the user starts typing/saving via auto-save logic.

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

// Final Safety Check
window.addEventListener('load', () => {
    // Check if Wizard is accessible
    if (typeof Wizard === 'undefined') {
        console.error('CRITICAL: Wizard module failed to load.');
        alert('Erro Crítico: O sistema não foi carregado completamente. Verifique o console para mais detalhes.');
    } else {
        console.log('✅ App loaded successfully');
    }
});
