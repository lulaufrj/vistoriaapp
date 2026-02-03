// ============================================
// Storage API - MongoDB Backend Integration
// ============================================

const StorageAPI = {
    // Auto-detect API URL based on environment
    API_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:3001/api/inspections'
        : `${window.location.origin}/api/inspections`,

    /**
     * Get auth token
     */
    getToken() {
        return localStorage.getItem('vistoriaapp_token');
    },

    /**
     * Get headers with auth
     */
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getToken()}`
        };
    },

    /**
     * Fetch all inspections from MongoDB
     */
    async getAllInspections() {
        try {
            const response = await fetch(this.API_URL, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.success ? data.inspections : [];
        } catch (error) {
            console.error('Error fetching inspections:', error);
            return null; // Return null to indicate API failure
        }
    },

    /**
     * Get single inspection by ID
     */
    async getInspection(id) {
        try {
            const response = await fetch(`${this.API_URL}/${id}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.success ? data.inspection : null;
        } catch (error) {
            console.error('Error fetching inspection:', error);
            return null;
        }
    },

    /**
     * Create new inspection
     */
    async createInspection(inspection) {
        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(inspection)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.success ? data.inspection : null;
        } catch (error) {
            console.error('Error creating inspection:', error);
            return null;
        }
    },

    /**
     * Update inspection
     */
    async updateInspection(id, inspection) {
        try {
            const response = await fetch(`${this.API_URL}/${id}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(inspection)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.success ? data.inspection : null;
        } catch (error) {
            console.error('Error updating inspection:', error);
            return null;
        }
    },

    /**
     * Delete inspection
     */
    async deleteInspection(id) {
        try {
            const response = await fetch(`${this.API_URL}/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Error deleting inspection:', error);
            return false;
        }
    },

    /**
     * Migrate localStorage data to MongoDB
     */
    async migrateFromLocalStorage() {
        try {
            // Get all localStorage inspections
            const localKey = Storage.getStorageKey();
            const localData = localStorage.getItem(localKey);

            if (!localData) {
                return { success: true, count: 0, message: 'Nenhum dado para migrar' };
            }

            const inspections = JSON.parse(localData);

            if (!Array.isArray(inspections) || inspections.length === 0) {
                return { success: true, count: 0, message: 'Nenhum dado para migrar' };
            }

            // Convert array to object format expected by backend
            const inspectionsObj = {};
            inspections.forEach(insp => {
                inspectionsObj[insp.id] = insp;
            });

            const response = await fetch(`${this.API_URL}/migrate`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ inspections: inspectionsObj })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                // Backup localStorage data before clearing
                localStorage.setItem(`${localKey}_backup`, localData);
                localStorage.removeItem(localKey);

                return {
                    success: true,
                    count: data.count,
                    message: data.message
                };
            }

            return { success: false, message: 'Erro na migração' };
        } catch (error) {
            console.error('Migration error:', error);
            return { success: false, message: error.message };
        }
    }
};
