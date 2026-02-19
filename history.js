// ============================================
// Inspection History Module
// ============================================

const InspectionHistory = {
    /**
     * Open history modal
     */
    openModal() {
        const modal = document.getElementById('historyModal');
        modal.classList.remove('hidden');

        // Load and render inspections
        this.switchTab('in-progress');
        this.updateCounts();
    },

    /**
     * Close history modal
     */
    closeModal() {
        const modal = document.getElementById('historyModal');
        modal.classList.add('hidden');
    },

    /**
     * Switch between tabs
     */
    switchTab(tab) {
        // Update active tab
        document.querySelectorAll('.history-tab').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });

        // Render inspections for selected tab
        this.renderInspections(tab);
    },

    /**
     * Update inspection counts
     */
    updateCounts() {
        const inspections = Storage.getAllInspections();
        const inProgress = inspections.filter(i => i.status === 'in-progress').length;
        const completed = inspections.filter(i => i.status === 'completed').length;

        document.getElementById('inProgressCount').textContent = inProgress;
        document.getElementById('completedCount').textContent = completed;
    },

    /**
     * Render inspections list
     */
    renderInspections(filter) {
        const container = document.getElementById('historyContent');
        const allInspections = Storage.getAllInspections();
        console.log(`[History] Rendering filter: ${filter}`, allInspections);

        const inspections = allInspections
            .filter(i => i.status === filter)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        console.log(`[History] Filtered ${filter}:`, inspections.length, inspections);

        if (inspections.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <p style="font-size: 3rem; margin-bottom: 1rem;">📋</p>
          <h3>Nenhuma vistoria ${filter === 'in-progress' ? 'em andamento' : 'finalizada'}</h3>
          <p style="color: var(--gray-500);">
            ${filter === 'in-progress'
                    ? 'Clique em "Nova Vistoria" para começar'
                    : 'Finalize uma vistoria para vê-la aqui'}
          </p>
        </div>
      `;
            return;
        }

        container.innerHTML = inspections.map(inspection =>
            this.renderInspectionCard(inspection)
        ).join('');
    },

    /**
     * Render single inspection card
     */
    renderInspectionCard(inspection) {
        // ... (existing helper variables)
        const { id, status, propertyData, rooms, currentStep, updatedAt, completedAt } = inspection;

        const propertyType = propertyData?.type ? Utils.capitalize(propertyData.type) : 'Imóvel';
        const address = propertyData?.address
            ? `${propertyData.address}${propertyData.addressNumber ? ', ' + propertyData.addressNumber : ''}`
            : 'Endereço não informado';
        const code = propertyData?.code || 'Sem código';
        const roomCount = rooms?.length || 0;

        const progress = (currentStep / 4) * 100;
        const progressBar = status === 'in-progress'
            ? `<div class="progress-bar">
           <div class="progress-fill" style="width: ${progress}%"></div>
         </div>
         <p class="inspection-meta">📊 ${currentStep}/4 etapas (${Math.round(progress)}%)</p>`
            : '';

        const dateLabel = status === 'in-progress'
            ? `📅 Última edição: ${this.formatRelativeTime(updatedAt)}`
            : `✅ Finalizada em: ${Utils.formatDate(completedAt)}`;

        const actions = status === 'in-progress'
            ? `<button class="btn btn-primary" onclick="InspectionHistory.loadInspection('${id}')">
           Continuar
         </button>
         <button class="btn btn-secondary" onclick="InspectionHistory.confirmDelete('${id}')">
           Deletar
         </button>`
            : `<button class="btn btn-primary" onclick="InspectionHistory.loadInspection('${id}')">
           ✏️ Editar / Abrir
         </button>
         <button class="btn btn-outline" onclick="InspectionHistory.regeneratePDF('${id}')">
           📥 PDF
         </button>
         <button class="btn btn-secondary" onclick="InspectionHistory.confirmDelete('${id}')">
           Deletar
         </button>`;

        const statusBadge = status === 'completed' ? '<span class="status-badge-completed">✅</span>' : '';

        return `
      <div class="inspection-card">
        <div class="inspection-header">
          <div>
            <h3>🏠 ${Utils.capitalize(propertyType)} ${statusBadge}</h3>
            <p class="inspection-address">${address}</p>
            <p class="inspection-code">Código: ${code}</p>
          </div>
        </div>
        
        ${progressBar}
        
        <div class="inspection-info">
          <p class="inspection-meta">${dateLabel}</p>
          <p class="inspection-meta">📝 ${roomCount} cômodo${roomCount !== 1 ? 's' : ''} documentado${roomCount !== 1 ? 's' : ''}</p>
        </div>
        
        <div class="inspection-actions">
          ${actions}
        </div>
      </div>
    `;
    },

    /**
     * Format relative time
     */
    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'agora mesmo';
        if (diffMins < 60) return `há ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
        if (diffHours < 24) return `há ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
        if (diffDays < 7) return `há ${diffDays} dia${diffDays !== 1 ? 's' : ''}`;

        return Utils.formatDate(dateString);
    },

    /**
     * Load inspection
     */
    loadInspection(id) {
        const inspection = Storage.getInspection(id);

        if (!inspection) {
            Utils.showNotification('Vistoria não encontrada', 'error');
            return;
        }

        // Set as current inspection
        Storage.setCurrentInspectionId(id);

        // Load data into app
        window.AppState.propertyData = inspection.propertyData;
        window.AppState.rooms = inspection.rooms;

        // Fill property form
        Object.keys(inspection.propertyData).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = inspection.propertyData[key];
                } else {
                    element.value = inspection.propertyData[key] || '';
                }
            }
        });

        // Load rooms
        Rooms.setRooms(inspection.rooms);

        // Check if finished and redirect to appropriate step for editing
        let targetStep = inspection.currentStep;
        if (inspection.status === 'completed' || targetStep === 4) {
            targetStep = 3; // Redirect to Report step

            // Log reopening if not already logged recently (optional, but good for traceability)
            // We only log if status was completed
            if (inspection.status === 'completed') {
                const historyEntry = {
                    action: 'reopened',
                    timestamp: new Date().toISOString()
                };

                // We need to update storage directly as AppState doesn't hold history
                const currentHistory = inspection.editHistory || [];
                currentHistory.push(historyEntry);

                // Update storage without changing status yet? 
                // User said "reopened for edition". Usually implies status change or just tracking.
                // Let's keep status as completed until they actually change something? 
                // Or better: changing status to 'in-progress' forces them to 'finalize' again, 
                // which creates a nice cycle: Created -> Finalized -> Reopened -> Finalized.
                // This seems to be what is requested: "rastreabilidade".

                Storage.updateInspection(id, {
                    editHistory: currentHistory,
                    status: 'in-progress' // Revert status to allow editing flow
                });

                Utils.showNotification('Vistoria reaberta para edição. O status retornou para "Em Andamento".', 'info');
            } else {
                Utils.showNotification('Vistoria carregada para edição', 'info');
            }
        }

        // Go to appropriate step
        Wizard.goToStep(targetStep);
        if (targetStep === 3) {
            // Ensure review is shown
            const app = document.getElementById('step3'); // Should use App or Wizard if exposed, but calling directly works
            // Better: trigger next step validation-like behavior or specific rendering
            // Wizard.showReview() is internal to App?
            // In app.js: showReview is called after nextStep
            // We need to trigger renderReview
            if (window.Report && Report.generateReview) {
                Report.generateReview(window.AppState.propertyData, window.AppState.rooms);
            }
        }

        // Close modal
        this.closeModal();

        Utils.showNotification(
            `Vistoria carregada: ${inspection.propertyData.code || 'Sem código'}`,
            'success'
        );
    },

    /**
     * Confirm delete
     */
    confirmDelete(id) {
        const inspection = Storage.getInspection(id);
        const code = inspection?.propertyData?.code || 'esta vistoria';

        if (confirm(`Deseja realmente deletar a vistoria "${code}"?\n\nEsta ação não pode ser desfeita.`)) {
            this.deleteInspection(id);
        }
    },

    /**
     * Delete inspection
     */
    deleteInspection(id) {
        Storage.deleteInspection(id);

        // Refresh current tab
        const activeTab = document.querySelector('.history-tab.active');
        if (activeTab) {
            this.switchTab(activeTab.dataset.tab);
        }

        this.updateCounts();
        Utils.showNotification('Vistoria deletada', 'info');
    },

    /**
     * Regenerate PDF for completed inspection
     */
    async regeneratePDF(id) {
        const inspection = Storage.getInspection(id);

        if (!inspection) {
            Utils.showNotification('Vistoria não encontrada', 'error');
            return;
        }

        Utils.showNotification('Gerando PDF...', 'info');

        try {
            await PDFGenerator.generatePDF(inspection.propertyData, inspection.rooms);
            Utils.showNotification('PDF gerado com sucesso!', 'success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            Utils.showNotification('Erro ao gerar PDF', 'error');
        }
    }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // History button
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            InspectionHistory.openModal();
        });
    }

    // Close modal
    const closeHistoryModal = document.getElementById('closeHistoryModal');
    if (closeHistoryModal) {
        closeHistoryModal.addEventListener('click', () => {
            InspectionHistory.closeModal();
        });
    }

    // Tab switching
    document.querySelectorAll('.history-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            InspectionHistory.switchTab(tab.dataset.tab);
        });
    });
});
