// ============================================
// Storage Management - Multi-Inspection System
// ============================================

const Storage = {
    BASE_KEY: 'vistoriaapp_inspections',
    CURRENT_ID_KEY: 'vistoriaapp_current_id',
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds

    /**
     * Get storage key for current user
     */
    getStorageKey() {
        const userJson = localStorage.getItem('vistoriaapp_user');
        if (userJson) {
            try {
                const user = JSON.parse(userJson);
                if (user && user.id) {
                    return `${this.BASE_KEY}_${user.id}`;
                }
            } catch (e) {
                console.error('Error parsing user for storage key', e);
            }
        }
        return this.BASE_KEY; // Fallback for legacy/logged-out
    },

    /**
     * Initialize auto-save
     */
    initAutoSave() {
        // Try migration on init
        this.migrateLegacyDataToUser();

        setInterval(() => {
            this.saveCurrentInspection();
        }, this.AUTO_SAVE_INTERVAL);
    },

    /**
     * Migrate legacy data to logged user
     */
    migrateLegacyDataToUser() {
        const key = this.getStorageKey();

        // Only modify if we are using a user-specific key
        if (key === this.BASE_KEY) return;

        // Check if user has data already
        if (localStorage.getItem(key)) return; // User already has data, don't overwrite

        // Check if there is legacy data
        const legacyData = localStorage.getItem(this.BASE_KEY);
        if (legacyData) {
            console.log('📦 Migrating legacy data to user storage...');
            localStorage.setItem(key, legacyData);

            // Optional: Clear legacy data to ensure true isolation? 
            // For now, let's keep it as backup or clear it?
            // To ensure security as requested, we SHOULD remove it from global access.
            localStorage.removeItem(this.BASE_KEY);
            Utils.showNotification('Seus dados antigos foram migrados com segurança.', 'success');
        }
    },

    /**
     * Generate unique ID
     */
    generateId() {
        return `inspection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Get current inspection ID
     */
    getCurrentInspectionId() {
        return localStorage.getItem(this.CURRENT_ID_KEY);
    },

    /**
     * Set current inspection ID
     */
    setCurrentInspectionId(id) {
        localStorage.setItem(this.CURRENT_ID_KEY, id);
    },

    /**
     * Create new inspection
     */
    createNewInspection() {
        const id = this.generateId();
        const inspection = {
            id,
            status: 'in-progress',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null,
            currentStep: 1,
            propertyData: {},
            rooms: [],
            pdfGenerated: false
        };

        // Do NOT save to storage immediately to prevent ghost records
        // this.saveInspection(inspection);

        this.setCurrentInspectionId(id);
        return inspection; // Return full object, not just ID
    },

    /**
     * Auto-save current inspection
     */
    saveCurrentInspection() {
        try {
            let currentId = this.getCurrentInspectionId();
            let inspection;

            // Validation: Is there any data worth saving?
            // Check properties in AppState (this is where live data lives)
            const hasPropertyData = window.AppState.propertyData && Object.keys(window.AppState.propertyData).some(k => window.AppState.propertyData[k]);
            const hasRooms = window.AppState.rooms && window.AppState.rooms.length > 0;
            const hasData = hasPropertyData || hasRooms;

            if (!currentId) {
                if (!hasData) return; // No ID + No Data = Do nothing

                // No ID but Has Data -> Create new inspection (in memory first)
                // Note: user must handle creation, but if we are here, we might need to lazy-create
                const newInsp = this.createNewInspection(); // This now returns object
                currentId = newInsp.id;
                inspection = newInsp;
            } else {
                inspection = this.getInspection(currentId);
            }

            if (!inspection) {
                // If ID exists but not in list (maybe deleted?), try to create new if has data
                if (hasData) {
                    const newInsp = this.createNewInspection();
                    currentId = newInsp.id;
                    inspection = newInsp;
                } else {
                    return;
                }
            }

            // Update with current app state
            inspection.updatedAt = new Date().toISOString();
            inspection.currentStep = window.AppState.currentStep || 1;
            inspection.propertyData = window.AppState.propertyData || {};

            // Critical Fix: Read rooms from Rooms module to ensure we have the latest state
            // AppState.rooms might be stale if Rooms module updated its internal array reference
            inspection.rooms = (typeof Rooms !== 'undefined' && Rooms.getRooms)
                ? Rooms.getRooms()
                : (window.AppState.rooms || []);

            // Final check: Don't save if it's still effectively empty (unless it was already saved/valid)
            // But if we are here, we either had data OR it was an existing inspection being updated.
            // If it's existing, we update. If it's new, we only save if hasData.

            this.saveInspection(inspection);
            console.log('Inspection saved successfully:', currentId);
        } catch (error) {
            console.error('Error saving inspection:', error);
        }
    },

    /**
     * Save inspection to storage
     */
    saveInspection(inspection) {
        try {
            const inspections = this.getAllInspections();
            const index = inspections.findIndex(i => i.id === inspection.id);

            if (index >= 0) {
                inspections[index] = inspection;
            } else {
                inspections.push(inspection);
            }

            localStorage.setItem(this.getStorageKey(), JSON.stringify(inspections));

            // Sync with backend (async)
            this.syncWithBackend(inspection);
        } catch (error) {
            console.error('Error saving inspection:', error);
        }
    },

    /**
     * Sync inspection with backend
     */
    async syncWithBackend(inspection) {
        // Ensure StorageAPI is available and user is authenticated
        if (typeof StorageAPI === 'undefined' || !StorageAPI.getToken()) {
            return;
        }

        try {
            // Check if it already exists in backend (simple check by ID usually or just try update)
            // We'll try to update first. If 404, we create.
            // However, inspection.id is generated locally. 
            // MongoDB usually generates its own _id, but we might want to use our ID or map them.
            // Let's assume the backend accepts our custom 'id' field as a unique identifier or we store it.

            // Note: In a real scenario, we should handle the _id.
            // For now, let's assume the API handles upsert or finding by 'id' field.

            // Strategy: Try update. If it fails (or returns null), try create.
            // But to be more efficient, we could check a local flag.

            // Let's use getInspection from API to check existence efficiently? No, generic update is better.
            // Let's try update.
            const updated = await StorageAPI.updateInspection(inspection.id, inspection);

            if (!updated) {
                // If update failed (likely didn't exist), try create
                console.log('Inspection not found in backend, creating...', inspection.id);
                await StorageAPI.createInspection(inspection);
            } else {
                console.log('Inspection synced with backend:', inspection.id);
            }
        } catch (error) {
            console.error('Error syncing with backend:', error);
        }
    },

    /**
     * Get all inspections
     */
    getAllInspections() {
        try {
            const data = localStorage.getItem(this.getStorageKey());
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading inspections:', error);
            return [];
        }
    },

    /**
     * Get single inspection by ID
     */
    getInspection(id) {
        const inspections = this.getAllInspections();
        return inspections.find(i => i.id === id) || null;
    },

    /**
     * Update inspection
     */
    updateInspection(id, updates) {
        const inspection = this.getInspection(id);

        if (!inspection) {
            console.error('Inspection not found:', id);
            return null;
        }

        const updated = {
            ...inspection,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.saveInspection(updated);
        return updated;
    },

    /**
     * Mark inspection as completed
     */
    markAsCompleted(id) {
        return this.updateInspection(id, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            pdfGenerated: true
        });
    },

    /**
     * Delete inspection
     */
    deleteInspection(id) {
        try {
            const inspections = this.getAllInspections();
            const filtered = inspections.filter(i => i.id !== id);
            localStorage.setItem(this.getStorageKey(), JSON.stringify(filtered));

            // If deleting current inspection, clear current ID
            if (this.getCurrentInspectionId() === id) {
                localStorage.removeItem(this.CURRENT_ID_KEY);
            }

            console.log('Inspection deleted locally:', id);

            // Sync delete with backend
            if (typeof StorageAPI !== 'undefined' && StorageAPI.getToken()) {
                StorageAPI.deleteInspection(id).then(success => {
                    if (success) console.log('Inspection deleted from backend:', id);
                    else console.warn('Failed to delete inspection from backend:', id);
                });
            }
        } catch (error) {
            console.error('Error deleting inspection:', error);
        }
    },

    /**
     * Clear all inspections (use with caution!)
     */
    clearAllInspections() {
        try {
            localStorage.removeItem(this.getStorageKey());
            localStorage.removeItem(this.CURRENT_ID_KEY);
            console.log('All inspections cleared');
        } catch (error) {
            console.error('Error clearing inspections:', error);
        }
    },

    /**
     * Export inspection as JSON
     */
    exportInspection(id) {
        const inspection = this.getInspection(id);

        if (!inspection) {
            console.error('Inspection not found:', id);
            return;
        }

        const json = JSON.stringify(inspection, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const filename = `vistoria-${inspection.propertyData.code || id}-${Utils.formatDateForFilename()}.json`;
        Utils.downloadFile(blob, filename);
    },

    /**
     * Import inspection from JSON
     */
    async importInspection(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const inspection = JSON.parse(e.target.result);

                    // Generate new ID to avoid conflicts
                    inspection.id = this.generateId();
                    inspection.updatedAt = new Date().toISOString();

                    this.saveInspection(inspection);
                    resolve(inspection);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    /**
     * Get inspections by status
     */
    getInspectionsByStatus(status) {
        return this.getAllInspections().filter(i => i.status === status);
    },

    /**
     * Get inspection count
     */
    getInspectionCount() {
        return this.getAllInspections().length;
    },

    /**
     * Migrate old draft to new system (compatibility)
     */
    migrateOldDraft() {
        try {
            const oldKey = 'vistoriaapp_data';
            const oldData = localStorage.getItem(oldKey);

            if (!oldData) return;

            const draft = JSON.parse(oldData);

            // Create inspection from old draft
            const inspection = {
                id: this.generateId(),
                status: 'in-progress',
                createdAt: draft.lastSaved || new Date().toISOString(),
                updatedAt: draft.lastSaved || new Date().toISOString(),
                completedAt: null,
                currentStep: draft.currentStep || 1,
                propertyData: draft.propertyData || {},
                rooms: draft.rooms || [],
                pdfGenerated: false
            };

            this.saveInspection(inspection);
            this.setCurrentInspectionId(inspection.id);

            // Remove old draft
            localStorage.removeItem(oldKey);

            console.log('Old draft migrated to new system');
        } catch (error) {
            console.error('Error migrating old draft:', error);
        }
    }
};

// Migrate old data on load
Storage.migrateOldDraft();
