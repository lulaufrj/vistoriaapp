// ============================================
// Rooms Management Module
// ============================================

const Rooms = {
    rooms: [],
    currentEditingRoomId: null,

    /**
     * Add new room
     */
    addRoom(roomData) {
        const room = {
            id: Utils.generateId(),
            ...roomData,
            createdAt: new Date().toISOString()
        };

        this.rooms.push(room);
        this.renderRoomsList();
        Utils.showNotification('Cômodo adicionado com sucesso!', 'success');

        return room;
    },

    /**
     * Update existing room
     */
    updateRoom(roomId, roomData) {
        const index = this.rooms.findIndex(r => r.id === roomId);
        if (index !== -1) {
            this.rooms[index] = {
                ...this.rooms[index],
                ...roomData,
                updatedAt: new Date().toISOString()
            };
            this.renderRoomsList();
            Utils.showNotification('Cômodo atualizado com sucesso!', 'success');
            return this.rooms[index];
        }
        return null;
    },

    /**
     * Delete room
     */
    deleteRoom(roomId) {
        if (confirm('Tem certeza que deseja excluir este cômodo?')) {
            this.rooms = this.rooms.filter(r => r.id !== roomId);
            this.renderRoomsList();
            Utils.showNotification('Cômodo removido', 'info');
        }
    },

    /**
     * Get room by ID
     */
    getRoom(roomId) {
        return this.rooms.find(r => r.id === roomId);
    },

    /**
     * Render rooms list
     */
    renderRoomsList() {
        const container = document.getElementById('roomsList');
        const emptyMessage = document.getElementById('emptyRoomsMessage');

        if (this.rooms.length === 0) {
            container.innerHTML = '';
            emptyMessage.classList.remove('hidden');
            return;
        }

        emptyMessage.classList.add('hidden');

        container.innerHTML = this.rooms.map(room => {
            const displayName = room.name || Utils.getRoomTypeLabel(room.type);
            const photoCount = room.photos ? room.photos.length : 0;
            const audioCount = room.audios ? room.audios.length : 0;

            return `
        <div class="room-item" data-room-id="${room.id}">
          <div class="room-item-info">
            <div class="room-icon">
              ${Utils.getRoomIcon(room.type)}
            </div>
            <div class="room-details">
              <h4>${displayName}</h4>
              <div class="room-meta">
                <span class="badge badge-${room.condition}">
                  ${Utils.getConditionLabel(room.condition)}
                </span>
                <span style="margin-left: 0.5rem; color: var(--gray-500);">
                  📷 ${photoCount} | 🎤 ${audioCount}
                </span>
              </div>
            </div>
          </div>
          <div class="room-actions">
            <button class="btn btn-sm btn-outline" onclick="Rooms.editRoom('${room.id}')">
              ✏️ Editar
            </button>
            <button class="btn btn-sm" style="background: var(--error); color: white;" onclick="Rooms.deleteRoom('${room.id}')">
              🗑️
            </button>
          </div>
        </div>
      `;
        }).join('');
    },

    /**
     * Open room modal for adding
     */
    openAddModal() {
        this.currentEditingRoomId = null;

        // Reset form
        document.getElementById('roomForm').reset();
        document.getElementById('roomModalTitle').textContent = 'Adicionar Cômodo';

        // Clear media
        Camera.clearPhotos();
        AudioRecorder.clearAudios();

        // Show modal
        document.getElementById('roomModal').classList.remove('hidden');
    },

    /**
     * Open room modal for editing
     */
    editRoom(roomId) {
        this.currentEditingRoomId = roomId;
        const room = this.getRoom(roomId);

        if (!room) return;

        // Fill form
        document.getElementById('roomType').value = room.type;
        document.getElementById('roomName').value = room.name || '';
        document.getElementById('roomCondition').value = room.condition;
        document.getElementById('roomDescription').value = room.description || '';

        // Set media
        Camera.setPhotos(room.photos || []);
        AudioRecorder.setAudios(room.audios || []);

        // Update modal title
        document.getElementById('roomModalTitle').textContent = 'Editar Cômodo';

        // Show modal
        document.getElementById('roomModal').classList.remove('hidden');
    },

    /**
     * Close room modal
     */
    closeModal(bypassValidation = false) {
        // Check for unsaved changes unless bypassing validation (e.g. after saving)
        if (!bypassValidation) {
            const hasUnsavedChanges =
                document.getElementById('roomName').value ||
                document.getElementById('roomDescription').value ||
                Camera.getPhotos().length > 0 ||
                AudioRecorder.getAudios().length > 0;

            if (hasUnsavedChanges) {
                // If user says OK (Save), we save. If Cancel (Don't Save), we close and discard.
                if (confirm('Existem dados não salvos neste cômodo. Deseja salvar antes de sair?')) {
                    this.saveRoom();
                    return;
                }
            }
        }

        document.getElementById('roomModal').classList.add('hidden');
        this.currentEditingRoomId = null;
    },

    /**
     * Save room from modal
     */
    saveRoom() {
        // Validate form
        const type = document.getElementById('roomType').value;
        const condition = document.getElementById('roomCondition').value;

        if (!type || !condition) {
            Utils.showNotification('Preencha os campos obrigatórios', 'error');
            return;
        }

        // Collect data
        const roomData = {
            type: type,
            name: document.getElementById('roomName').value,
            condition: condition,
            description: document.getElementById('roomDescription').value,
            photos: Camera.getPhotos(),
            audios: AudioRecorder.getAudios()
        };

        // Add or update
        if (this.currentEditingRoomId) {
            this.updateRoom(this.currentEditingRoomId, roomData);
        } else {
            this.addRoom(roomData);
        }

        // Close modal and bypass validation (since we just saved)
        this.closeModal(true);
    },

    /**
     * Get all rooms
     */
    getRooms() {
        return this.rooms;
    },

    /**
     * Set rooms (for loading draft)
     */
    setRooms(rooms) {
        this.rooms = rooms || [];
        this.renderRoomsList();
    },

    /**
     * Clear all rooms
     */
    clearRooms() {
        this.rooms = [];
        this.renderRoomsList();
    }
};

// Event Listeners
document.getElementById('addRoomBtn').addEventListener('click', () => {
    Rooms.openAddModal();
});

document.getElementById('closeRoomModal').addEventListener('click', () => {
    Rooms.closeModal();
});

document.getElementById('cancelRoomBtn').addEventListener('click', () => {
    Rooms.closeModal();
});

document.getElementById('saveRoomBtn').addEventListener('click', () => {
    Rooms.saveRoom();
});
