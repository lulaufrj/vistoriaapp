// ============================================
// Audio Recording and Transcription Module
// ============================================

const AudioRecorder = {
    mediaRecorder: null,
    audioChunks: [],
    currentAudios: [],
    recordingStartTime: null,
    timerInterval: null,
    recognition: null,
    currentTranscription: '',
    isStopping: false, // Flag to prevent auto-restart

    /**
     * Initialize speech recognition
     */
    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'pt-BR';
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 1;

            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        try {
                            // Clean the final transcript before adding
                            let cleanedChunk = transcript;
                            if (window.AIFormatter && window.AIFormatter.cleanRawText) {
                                // We keep the space at the end if it existed
                                const hasTrailingSpace = transcript.endsWith(' ');
                                cleanedChunk = window.AIFormatter.cleanRawText(transcript);
                                if (hasTrailingSpace && cleanedChunk) cleanedChunk += ' ';
                            }
                            finalTranscript += cleanedChunk;
                        } catch (e) {
                            console.warn('Error cleaning text:', e);
                            finalTranscript += transcript + ' ';
                        }
                    } else {
                        interimTranscript += transcript;
                    }
                }

                this.currentTranscription += finalTranscript;
                const transcriptionText = document.getElementById('transcriptionText');
                if (transcriptionText) {
                    transcriptionText.value = this.currentTranscription + interimTranscript;
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);

                // Handle specific errors
                if (event.error === 'no-speech') {
                    // Silently handle no-speech errors and restart ONLY if not stopping
                    if (this.mediaRecorder && this.mediaRecorder.state === 'recording' && !this.isStopping) {
                        console.log('No speech detected, restarting recognition...');
                        setTimeout(() => {
                            if (this.mediaRecorder && this.mediaRecorder.state === 'recording' && !this.isStopping) {
                                try {
                                    this.recognition.start();
                                } catch (e) {
                                    console.log('Recognition already started');
                                }
                            }
                        }, 100);
                    }
                    return;
                }

                if (event.error === 'aborted') {
                    // Restart if aborted during recording, but NOT if stopping
                    if (this.mediaRecorder && this.mediaRecorder.state === 'recording' && !this.isStopping) {
                        setTimeout(() => {
                            if (!this.isStopping) {
                                try {
                                    this.recognition.start();
                                } catch (e) {
                                    console.log('Recognition already started');
                                }
                            }
                        }, 100);
                    }
                    return;
                }

                Utils.showNotification('Erro na transcrição de áudio', 'error');
            };

            this.recognition.onend = () => {
                console.log('Speech recognition ended. Final transcription:', this.currentTranscription);

                // Update the transcription text one final time
                const transcriptionText = document.getElementById('transcriptionText');
                if (transcriptionText) {
                    transcriptionText.value = this.currentTranscription;
                }

                // Auto-restart if still recording (for long recordings) AND NOT STOPPING
                if (this.mediaRecorder && this.mediaRecorder.state === 'recording' && !this.isStopping) {
                    console.log('Recording still active, restarting recognition for continuous transcription...');
                    setTimeout(() => {
                        if (!this.isStopping) {
                            try {
                                this.recognition.start();
                            } catch (error) {
                                console.log('Could not restart recognition:', error.message);
                            }
                        }
                    }, 100);
                }
            };

            return true;
        } else {
            console.warn('Speech recognition not supported');
            return false;
        }
    },

    /**
     * Start recording
     */
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });

            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.currentTranscription = '';
            this.isStopping = false; // Reset stop flag

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, {
                    type: 'audio/webm'
                });
                const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, {
                    type: 'audio/webm',
                    lastModified: Date.now()
                });

                // Save audio with transcription
                await this.saveAudio(audioFile, this.currentTranscription);

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start();
            this.recordingStartTime = Date.now();
            this.startTimer();

            // Start speech recognition
            if (this.recognition) {
                try {
                    this.recognition.start();
                } catch (e) {
                    console.error('Error starting recognition:', e);
                }
            }

            // Update UI
            document.getElementById('recordingStatus').classList.remove('hidden');
            document.getElementById('startRecordingBtn').classList.add('hidden');
            document.getElementById('stopRecordingBtn').classList.remove('hidden');
            document.getElementById('audioVisualizer').textContent = '🎤 Gravando...';

            Utils.showNotification('Gravação iniciada', 'success');
        } catch (error) {
            console.error('Error starting recording:', error);
            Utils.showNotification('Erro ao iniciar gravação. Verifique as permissões.', 'error');
        }
    },

    /**
     * Stop recording
     */
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            // Signal that we are stopping to prevent auto-restart
            this.isStopping = true;

            // Stop speech recognition first and wait for final results
            if (this.recognition) {
                try {
                    this.recognition.stop();

                    // Wait a bit for final transcription results
                    setTimeout(() => {
                        // Now stop the media recorder
                        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                            this.mediaRecorder.stop();
                        }
                    }, 500); // 500ms delay to capture final transcription
                } catch (error) {
                    console.error('Error stopping recognition:', error);
                    // Stop media recorder anyway
                    this.mediaRecorder.stop();
                }
            } else {
                // No recognition, stop immediately
                this.mediaRecorder.stop();
            }

            this.stopTimer();

            // Update UI
            document.getElementById('recordingStatus').classList.add('hidden');
            document.getElementById('startRecordingBtn').classList.remove('hidden');
            document.getElementById('stopRecordingBtn').classList.add('hidden');
            document.getElementById('audioVisualizer').textContent = '✓ Gravação concluída';
            document.getElementById('transcriptionArea').classList.remove('hidden');

            Utils.showNotification('Gravação finalizada', 'success');
        }
    },

    /**
     * Start recording timer
     */
    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById('recordingTime').textContent =
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
    },

    /**
     * Stop recording timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    /**
     * Save audio with transcription
     */
    async saveAudio(file, transcription) {
        try {
            // Show loading notification
            Utils.showNotification('Fazendo upload do áudio...', 'info');

            const base64 = await Utils.fileToBase64(file);

            // Upload to Cloudinary
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:3001'
                : window.location.origin;

            const token = localStorage.getItem('vistoriaapp_token');

            const response = await fetch(`${API_URL}/api/upload/audio`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ audio: base64 })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Erro no upload');
            }

            const audio = {
                id: Utils.generateId(),
                url: result.url, // Cloudinary URL instead of Base64
                publicId: result.publicId, // For deletion
                filename: file.name,
                transcription: transcription.trim(),
                timestamp: new Date().toISOString()
            };

            this.currentAudios.push(audio);
            this.renderAudios();

            return audio;
        } catch (error) {
            console.error('Error saving audio:', error);
            Utils.showNotification('Erro ao salvar áudio: ' + error.message, 'error');
            return null;
        }
    },

    /**
     * Remove audio
     */
    removeAudio(audioId) {
        this.currentAudios = this.currentAudios.filter(a => a.id !== audioId);
        this.renderAudios();
        Utils.showNotification('Áudio removido', 'info');
    },

    /**
     * Format saved audio retroactively
     */
    async formatSavedAudio(audioId) {
        const audio = this.currentAudios.find(a => a.id === audioId);
        if (!audio || !audio.transcription) return;

        const btn = document.getElementById(`btn-fmt-${audioId}`);
        const originalText = btn ? btn.innerHTML : '✨ Formatar';

        if (btn) {
            btn.innerHTML = '⏳ ...';
            btn.disabled = true;
        }

        try {
            Utils.showNotification('Formatando áudio...', 'info');
            let formatted;
            try {
                formatted = await AIFormatter.formatAudioTranscription(audio.transcription);
            } catch (e) {
                console.warn('AI failed, using fallback:', e);
                formatted = AIFormatter.basicAudioFormatting(audio.transcription);
            }
            if (!formatted) formatted = AIFormatter.basicAudioFormatting(audio.transcription);

            // SAVE to Object only, DO NOT append to main description
            audio.formattedTranscription = formatted;

            // Re-render
            this.renderAudios();

            Utils.showNotification('✅ Laudo gerado para o áudio!', 'success');

        } catch (error) {
            console.error('Error in retroactive formatting:', error);
            Utils.showNotification('Erro ao formatar audio', 'error');
        } finally {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    },

    /**
     * Render audios
     */
    renderAudios() {
        const container = document.getElementById('roomAudios');
        const descInput = document.getElementById('roomDescription');
        const currentDesc = descInput ? descInput.value : '';

        if (this.currentAudios.length === 0) {
            container.innerHTML = '<p style="color: var(--gray-500); text-align: center; padding: 1rem;">Nenhum áudio adicionado</p>';
            return;
        }

        container.innerHTML = this.currentAudios.map(audio => {
            const isRawInDesc = audio.transcription && currentDesc.includes(audio.transcription);
            const isFmtInDesc = audio.formattedTranscription && currentDesc.includes(audio.formattedTranscription);

            return `
      <div style="background: var(--gray-50); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 0.5rem; border: 1px solid var(--gray-200);">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <strong>🎤 Áudio ${new Date(audio.timestamp).toLocaleTimeString('pt-BR')}</strong>
            ${audio.filename ? `<span style="font-size: 0.75rem; color: var(--gray-500);">(${audio.filename})</span>` : ''}
          </div>
          <div style="display: flex; gap: 0.5rem;">
             ${!audio.formattedTranscription ? `
            <button id="btn-fmt-${audio.id}" class="btn btn-sm btn-outline" style="font-size: 0.75rem;" onclick="AudioRecorder.formatSavedAudio('${audio.id}')">
              ✨ Formatar
            </button>` : ''}
            <button class="btn btn-sm" style="background: var(--error); color: white;" onclick="AudioRecorder.removeAudio('${audio.id}')">
              ✖️
            </button>
          </div>
        </div>

        <!-- Raw Transcription -->
        <div style="margin-bottom: 0.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: end; margin-bottom: 0.25rem;">
                <label style="font-size: 0.75rem; font-weight: bold; color: var(--gray-600);">📝 Transcrição Bruta:</label>
                <div style="display: flex; gap: 5px;">
                     <button class="btn btn-xs ${isRawInDesc ? 'btn-error' : 'btn-primary'}" 
                        style="font-size: 0.7rem; padding: 2px 6px;"
                        onclick="AudioRecorder.toggleTextInDescription('${Utils.escapeHtml(audio.transcription)}')"
                        title="${isRawInDesc ? 'Remover da descrição' : 'Adicionar à descrição'}">
                        ${isRawInDesc ? '➖ Remover' : '➕ Adicionar'}
                    </button>
                    <button class="btn btn-xs btn-outline" 
                        style="font-size: 0.7rem; padding: 2px 6px;"
                        onclick="AudioRecorder.editRawTranscription('${audio.id}')"
                        title="Editar texto">
                        ✏️
                    </button>
                </div>
            </div>
            <div id="raw-text-${audio.id}" style="background: white; padding: 0.5rem; border-radius: var(--radius-sm); font-size: 0.85rem; color: var(--gray-700); border: 1px solid var(--gray-200); font-style: italic;">
                ${audio.transcription || 'Sem transcrição'}
            </div>
        </div>

        <!-- Formatted Report Text -->
        ${audio.formattedTranscription ? `
        <div style="margin-top: 0.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: end; margin-bottom: 0.25rem;">
                <label style="font-size: 0.75rem; font-weight: bold; color: var(--success-700);">✅ Texto para Laudo:</label>
                <button class="btn btn-xs ${isFmtInDesc ? 'btn-error' : 'btn-success'}" 
                    style="font-size: 0.7rem; padding: 2px 6px;"
                    onclick="AudioRecorder.toggleTextInDescription('${Utils.escapeHtml(audio.formattedTranscription)}')"
                    title="${isFmtInDesc ? 'Remover da descrição' : 'Adicionar à descrição'}">
                    ${isFmtInDesc ? '➖ Remover' : '➕ Adicionar'}
                </button>
            </div>
            <div style="background: var(--success-50); padding: 0.5rem; border-radius: var(--radius-sm); font-size: 0.9rem; color: var(--gray-900); border: 1px solid var(--success-200);">
                ${audio.formattedTranscription}
            </div>
        </div>
        ` : ''}

      </div>
    `;
        }).join('');
    },

    /**
     * Add or Remove text from description
     */
    toggleTextInDescription(text) {
        if (!text) return;

        // Decode HTML entities if needed (since we escaped them in the onclick)
        const decodedText = new DOMParser().parseFromString(text, 'text/html').body.textContent;
        const descInput = document.getElementById('roomDescription');

        if (!descInput) {
            Utils.showNotification('Campo de descrição não encontrado', 'error');
            return;
        }

        let currentDesc = descInput.value;

        if (currentDesc.includes(decodedText)) {
            // Remove
            descInput.value = currentDesc.replace(decodedText, '').replace(/\n\n\n/g, '\n\n').trim();
            Utils.showNotification('Texto removido da descrição', 'info');
        } else {
            // Add
            descInput.value = currentDesc ? currentDesc + '\n\n' + decodedText : decodedText;
            Utils.showNotification('Texto adicionado à descrição', 'success');
        }

        // Trigger events
        descInput.dispatchEvent(new Event('change'));
        descInput.dispatchEvent(new Event('input'));

        // Re-render buttons state
        this.renderAudios();
    },

    /**
     * Allow editing raw transcription
     */
    editRawTranscription(audioId) {
        const audio = this.currentAudios.find(a => a.id === audioId);
        if (!audio) return;

        const newText = prompt("Editar Transcrição:", audio.transcription);
        if (newText !== null && newText !== audio.transcription) {
            audio.transcription = newText.trim();
            this.renderAudios();
            // Note: If this text was already formatted, the old formatted version remains based on old text. 
            // The user might want to re-format.
        }
    },

    /**
     * Open audio modal
     * @param {Function} onSaveCallback - Function to call with final text
     */
    openModal(onSaveCallback = null) {
        this.onSave = onSaveCallback;
        const modal = document.getElementById('audioModal');
        modal.classList.remove('hidden');

        // Reset UI
        document.getElementById('recordingStatus').classList.add('hidden');
        document.getElementById('startRecordingBtn').classList.remove('hidden');
        document.getElementById('stopRecordingBtn').classList.add('hidden');
        document.getElementById('transcriptionArea').classList.add('hidden');
        document.getElementById('audioVisualizer').textContent = '🎤 Pronto para gravar';
        document.getElementById('transcriptionText').value = '';

        // Reset formatted transcription section
        document.getElementById('formattedTranscriptionSection').classList.add('hidden');
        document.getElementById('formattedText').value = '';

        // Initialize speech recognition if not already done
        if (!this.recognition) {
            this.initSpeechRecognition();
        }
    },

    /**
     * Close audio modal
     */
    closeModal() {
        // Stop recording if active
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.stopRecording();
        }

        const modal = document.getElementById('audioModal');
        modal.classList.add('hidden');
    },

    /**
     * Clear current audios
     */
    clearAudios() {
        this.currentAudios = [];
        this.renderAudios();
    },

    /**
     * Set audios (for editing)
     */
    setAudios(audios) {
        this.currentAudios = audios || [];
        this.renderAudios();
    },

    /**
     * Get current audios
     */
    getAudios() {
        return this.currentAudios;
    }
};

// Event Listeners
const recordBtn = document.getElementById('recordAudioBtn');
if (recordBtn) {
    recordBtn.addEventListener('click', () => {
        // Start a new recording session
        AudioRecorder.activeAudioId = null; // New recording
        AudioRecorder.openModal((text, isFormatted) => {
            // This is called when closing/saving form modal
            // For a new recording, we might have saved it already in stopRecording
            console.log('Modal closed', text, isFormatted);
            AudioRecorder.renderAudios();
        });
    });
}

document.getElementById('uploadAudioBtn').addEventListener('click', () => {
    document.getElementById('audioUpload').click();
});

document.getElementById('audioUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        // Show loading state
        Utils.showNotification('⬆️ Enviando áudio...', 'info');

        try {
            const base64 = await Utils.fileToBase64(file);

            // 1. Transcribe (Server-Side)
            Utils.showNotification('🎧 Transcrevendo áudio com IA...', 'info');

            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:3001'
                : window.location.origin;

            const response = await fetch(`${API_URL}/api/transcribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64 })
            });

            const data = await response.json();

            if (!data.success) throw new Error(data.error || 'Falha na transcrição');

            const transcription = data.transcription;

            // 2. Save Audio with Transcription
            await AudioRecorder.saveAudio(file, transcription);

            // 3. Open Modal to allow formatting (Optional but good UX)
            AudioRecorder.openModal((text) => {
                const descInput = document.getElementById('roomDescription');
                if (descInput) {
                    descInput.value = descInput.value ? descInput.value + '\n\n' + text : text;
                    descInput.dispatchEvent(new Event('change'));
                }
            });

            // Populate modal with transcribed text
            document.getElementById('transcriptionText').value = transcription;
            Utils.showNotification('✅ Áudio transcrito com sucesso!', 'success');

        } catch (err) {
            console.error('Upload Error:', err);
            await AudioRecorder.saveAudio(file, ''); // Save without transcription as fallback
            Utils.showNotification('⚠️ Erro na transcrição. Áudio salvo sem texto.', 'warning');
        }
    }
    e.target.value = '';
});

document.getElementById('closeAudioModal').addEventListener('click', () => {
    AudioRecorder.closeModal();
});

document.getElementById('cancelAudioBtn').addEventListener('click', () => {
    AudioRecorder.closeModal();
});

document.getElementById('startRecordingBtn').addEventListener('click', () => {
    AudioRecorder.startRecording();
});

document.getElementById('stopRecordingBtn').addEventListener('click', () => {
    AudioRecorder.stopRecording();
});

// Format Transcription Button - Stage 1 to Stage 2
document.getElementById('formatTranscriptionBtn').addEventListener('click', async () => {
    const transcriptionText = document.getElementById('transcriptionText').value.trim();

    if (!transcriptionText) {
        Utils.showNotification('Nenhuma transcrição para formatar', 'error');
        return;
    }

    // Show formatting indicator
    const btn = document.getElementById('formatTranscriptionBtn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Formatando com IA...';
    btn.disabled = true;

    try {
        // Format using audio-specific method
        const formattedText = await AIFormatter.formatAudioTranscription(transcriptionText);

        // Show formatted text
        document.getElementById('formattedText').value = formattedText;
        document.getElementById('formattedTranscriptionSection').classList.remove('hidden');

        Utils.showNotification('✅ Texto formatado com sucesso!', 'success');
    } catch (error) {
        console.error('Error formatting audio:', error);
        Utils.showNotification('Erro ao formatar. Tente novamente.', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

// Use Raw Text Button
document.getElementById('useRawTextBtn').addEventListener('click', () => {
    const transcriptionText = document.getElementById('transcriptionText').value.trim();

    if (transcriptionText) {
        AudioRecorder.currentTranscription = transcriptionText;

        // Execute callback if exists
        if (AudioRecorder.onSave) {
            AudioRecorder.onSave(transcriptionText);
        } else {
            Utils.showNotification('📝 Texto capturado (sem destino)', 'info');
        }
    }

    AudioRecorder.closeModal();
});

// Use Formatted Text Button
document.getElementById('useFormattedTextBtn').addEventListener('click', () => {
    const formattedText = document.getElementById('formattedText').value.trim();

    if (formattedText) {
        AudioRecorder.currentTranscription = formattedText;

        // Execute callback if exists
        if (AudioRecorder.onSave) {
            AudioRecorder.onSave(formattedText);
        } else {
            Utils.showNotification('✅ Texto formatado capturado (sem destino)', 'success');
        }
    }

    AudioRecorder.closeModal();
});
