// ============================================
// Migration Helper - localStorage to MongoDB
// ============================================

const MigrationHelper = {
    MIGRATION_KEY: 'vistoriaapp_migration_done',

    /**
     * Check if migration is needed
     */
    needsMigration() {
        // Already migrated?
        if (localStorage.getItem(this.MIGRATION_KEY)) {
            return false;
        }

        // Has localStorage data?
        const localKey = Storage.getStorageKey();
        const localData = localStorage.getItem(localKey);

        if (!localData) {
            return false;
        }

        try {
            const inspections = JSON.parse(localData);
            return Array.isArray(inspections) && inspections.length > 0;
        } catch (e) {
            return false;
        }
    },

    /**
     * Show migration banner
     */
    showMigrationBanner() {
        if (!this.needsMigration()) {
            return;
        }

        const banner = document.createElement('div');
        banner.id = 'migrationBanner';
        banner.className = 'migration-banner';
        banner.innerHTML = `
            <div class="migration-banner-content">
                <div class="migration-icon">☁️</div>
                <div class="migration-text">
                    <strong>Migração para a Nuvem Disponível!</strong>
                    <p>Você tem vistorias salvas localmente. Migre para o MongoDB e acesse de qualquer lugar!</p>
                </div>
                <div class="migration-actions">
                    <button class="btn btn-primary" id="startMigrationBtn">
                        Migrar Agora
                    </button>
                    <button class="btn btn-secondary" id="dismissMigrationBtn">
                        Agora Não
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        // Event listeners
        document.getElementById('startMigrationBtn').addEventListener('click', () => {
            this.startMigration();
        });

        document.getElementById('dismissMigrationBtn').addEventListener('click', () => {
            banner.remove();
        });
    },

    /**
     * Start migration process
     */
    async startMigration() {
        const banner = document.getElementById('migrationBanner');

        if (banner) {
            banner.innerHTML = `
                <div class="migration-banner-content">
                    <div class="migration-icon">⏳</div>
                    <div class="migration-text">
                        <strong>Migrando dados...</strong>
                        <p>Aguarde enquanto transferimos suas vistorias para a nuvem.</p>
                    </div>
                </div>
            `;
        }

        try {
            const result = await StorageAPI.migrateFromLocalStorage();

            if (result.success) {
                // Mark as migrated
                localStorage.setItem(this.MIGRATION_KEY, 'true');

                if (banner) {
                    banner.innerHTML = `
                        <div class="migration-banner-content success">
                            <div class="migration-icon">✅</div>
                            <div class="migration-text">
                                <strong>Migração Concluída!</strong>
                                <p>${result.message}</p>
                            </div>
                            <button class="btn btn-primary" onclick="document.getElementById('migrationBanner').remove()">
                                OK
                            </button>
                        </div>
                    `;
                }

                // Reload inspections from MongoDB
                if (window.History && window.History.loadHistory) {
                    setTimeout(() => {
                        window.History.loadHistory();
                    }, 2000);
                }
            } else {
                throw new Error(result.message || 'Erro desconhecido');
            }
        } catch (error) {
            console.error('Migration failed:', error);

            if (banner) {
                banner.innerHTML = `
                    <div class="migration-banner-content error">
                        <div class="migration-icon">❌</div>
                        <div class="migration-text">
                            <strong>Erro na Migração</strong>
                            <p>${error.message}</p>
                        </div>
                        <div class="migration-actions">
                            <button class="btn btn-primary" onclick="MigrationHelper.startMigration()">
                                Tentar Novamente
                            </button>
                            <button class="btn btn-secondary" onclick="document.getElementById('migrationBanner').remove()">
                                Fechar
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    },

    /**
     * Initialize migration check
     */
    init() {
        // Wait for auth to complete
        setTimeout(() => {
            const token = localStorage.getItem('vistoriaapp_token');
            if (token) {
                this.showMigrationBanner();
            }
        }, 1000);
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MigrationHelper.init());
} else {
    MigrationHelper.init();
}
