// ============================================
// Camera Module
// ============================================

const Camera = {
    stream: null,
    currentPhotos: [],

    /**
     * Initialize camera
     */
    async init() {
        const video = document.getElementById('cameraVideo');

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            video.srcObject = this.stream;
            return true;
        } catch (error) {
            console.error('Error accessing camera:', error);
            Utils.showNotification('Erro ao acessar câmera. Verifique as permissões.', 'error');
            return false;
        }
    },

    /**
     * Stop camera
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    },

    /**
     * Capture photo from video stream
     */
    capturePhoto() {
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('cameraCanvas');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const file = new File([blob], `photo-${Date.now()}.jpg`, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                });
                resolve(file);
            }, 'image/jpeg', 0.9);
        });
    },

    /**
     * Open camera modal
     */
    async openModal() {
        const modal = document.getElementById('cameraModal');
        modal.classList.remove('hidden');

        const success = await this.init();
        if (!success) {
            this.closeModal();
        }
    },

    /**
     * Close camera modal
     */
    closeModal() {
        const modal = document.getElementById('cameraModal');
        modal.classList.add('hidden');
        this.stop();
    },

    /**
     * Add photo to current room
     */
    async addPhoto(file) {
        try {
            // Compress image
            const compressed = await Utils.compressImage(file);

            // Convert to base64 for storage
            const base64 = await Utils.fileToBase64(compressed);

            const photo = {
                id: Utils.generateId(),
                data: base64,
                filename: file.name,
                timestamp: new Date().toISOString()
            };

            this.currentPhotos.push(photo);
            this.renderPhotos();

            Utils.showNotification('Foto adicionada com sucesso!', 'success');
            return photo;
        } catch (error) {
            console.error('Error adding photo:', error);
            Utils.showNotification('Erro ao adicionar foto', 'error');
            return null;
        }
    },

    /**
     * Remove photo
     */
    removePhoto(photoId) {
        this.currentPhotos = this.currentPhotos.filter(p => p.id !== photoId);
        this.renderPhotos();
        Utils.showNotification('Foto removida', 'info');
    },

    /**
     * Render photos in gallery
     */
    renderPhotos() {
        const gallery = document.getElementById('roomPhotos');

        if (this.currentPhotos.length === 0) {
            gallery.innerHTML = '<p style="color: var(--gray-500); text-align: center; padding: 1rem;">Nenhuma foto adicionada</p>';
            return;
        }

        gallery.innerHTML = this.currentPhotos.map(photo => `
      <div class="photo-item">
        <img src="${photo.data}" alt="${photo.filename}">
        <button class="photo-item-remove" onclick="Camera.removePhoto('${photo.id}')">
          ✕
        </button>
      </div>
    `).join('');
    },

    /**
     * Clear current photos
     */
    clearPhotos() {
        this.currentPhotos = [];
        this.renderPhotos();
    },

    /**
     * Set photos (for editing)
     */
    setPhotos(photos) {
        this.currentPhotos = photos || [];
        this.renderPhotos();
    },

    /**
     * Get current photos
     */
    getPhotos() {
        return this.currentPhotos;
    }
};

// Event Listeners
document.getElementById('takePictureBtn').addEventListener('click', () => {
    Camera.openModal();
});

document.getElementById('uploadPictureBtn').addEventListener('click', () => {
    document.getElementById('photoUpload').click();
});

document.getElementById('photoUpload').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
        await Camera.addPhoto(file);
    }
    e.target.value = ''; // Reset input
});

document.getElementById('closeCameraModal').addEventListener('click', () => {
    Camera.closeModal();
});

document.getElementById('cancelCameraBtn').addEventListener('click', () => {
    Camera.closeModal();
});

document.getElementById('capturePhotoBtn').addEventListener('click', async () => {
    const photo = await Camera.capturePhoto();
    await Camera.addPhoto(photo);
    Camera.closeModal();
});
