// ============================================
// AI Formatter Module - Professional Report Text
// ============================================

const AIFormatter = {
    // Auto-detect Backend URL based on environment
    BACKEND_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : window.location.origin,

    /**
     * Format informal text to professional inspection report language
     */
    async formatToProfessionalReport(informalText, roomType, roomName) {
        try {
            const response = await fetch(`${this.BACKEND_URL}/api/format-text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: informalText,
                    roomType: roomType,
                    roomName: roomName
                })
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            const data = await response.json();

            // Show notification about which method was used
            if (data.method === 'ai') {
                console.log('✅ Formatted with AI (Gemini)');
            } else if (data.method === 'rule-based') {
                console.log('ℹ️ Formatted with rules (no API key configured)');
            } else if (data.method === 'rule-based-fallback') {
                console.log('⚠️ AI failed, using rule-based fallback');
            }

            return data.formatted;
        } catch (error) {
            console.error('Error calling backend:', error);

            // Ultimate fallback: client-side rule-based formatting
            console.log('⚠️ Backend unavailable, using client-side fallback');
            return this.clientSideFallback(informalText, roomType, roomName);
        }
    },

    /**
     * Format audio transcription specifically for inspection reports
     * Optimized for standalone transcriptions without room context
     */
    async formatAudioTranscription(rawTranscription) {
        try {
            const response = await fetch(`${this.BACKEND_URL}/api/format-audio`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transcription: rawTranscription
                })
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            const data = await response.json();

            // Show notification about which method was used
            if (data.method === 'ai') {
                console.log('✅ Audio formatted with AI (Gemini)');
            } else {
                console.log('ℹ️ Audio formatted with rules (fallback)');
            }

            return data.formatted;
        } catch (error) {
            console.error('Error formatting audio:', error);

            // Fallback: basic formatting
            console.log('⚠️ Using basic audio formatting fallback');
            return this.basicAudioFormatting(rawTranscription);
        }
    },

    /**
     * Basic audio formatting fallback
     */
    basicAudioFormatting(text) {
        let formatted = text.trim();

        // Step 1: Remove filler words FIRST
        const fillersToRemove = [
            /\bé\s+/gi,
            /\bné\s+/gi,
            /\baí\s+/gi,
            /\bentão\s+/gi,
            /\btipo\s+/gi,
            /\bassim\s+/gi,
            /\beu acho que\s+/gi,
            /\beu acho\s+/gi,
            /\bah\s+/gi,
            /\be\s+e\s+/gi,
        ];

        fillersToRemove.forEach(pattern => {
            formatted = formatted.replace(pattern, '');
        });

        // Step 2: Remove verbal counting
        formatted = formatted.replace(/\b(uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez)\s+(duas|dois|três|quatro|cinco|seis|sete|oito|nove|dez)\b/gi, '$2');

        // Step 3: Remove autocorrections
        formatted = formatted.replace(/\b(um|uma|dois|duas|três|quatro|cinco)\s+não\s+(tem|possui)?\s*(um|uma|dois|duas|três|quatro|cinco)\b/gi, '$3');

        // Step 4: Remove repetitions
        formatted = formatted.replace(/\b(\w+)\s+\1\b/gi, '$1');

        // Step 5: Fix "também"
        formatted = formatted.replace(/\btambém\s+também/gi, 'também');
        formatted = formatted.replace(/\btambm/gi, 'também');

        // Step 6: Clean up "eu tenho"
        formatted = formatted.replace(/^eu tenho\s+/i, '');
        formatted = formatted.replace(/^tenho\s+/i, '');

        // Step 7: Replace informal terms
        const replacements = {
            ' tem ': ' possui ',
            ' tem uma ': ' possui uma ',
            ' tem um ': ' possui um ',
            ' tem duas ': ' possui duas ',
            ' tem dois ': ' possui dois ',
            ' tá ': ' está ',
            ' ta ': ' está ',
            ' pra ': ' para ',
            ' ela tem ': ' que possui ',
            ' ele tem ': ' que possui ',
            ' ela fica ': ' localizada ',
            ' ele fica ': ' localizado ',
        };

        Object.entries(replacements).forEach(([informal, formal]) => {
            const regex = new RegExp(informal, 'gi');
            formatted = formatted.replace(regex, formal);
        });

        // Step 8: Structure better
        formatted = formatted.replace(/\s+e\s+possui/gi, '. Possui');
        formatted = formatted.replace(/\s+e\s+uma/gi, ', uma');
        formatted = formatted.replace(/\s+e\s+um/gi, ', um');
        formatted = formatted.replace(/\s+e\s+duas/gi, ', duas');
        formatted = formatted.replace(/\s+e\s+dois/gi, ', dois');

        // Step 9: Clean up
        formatted = formatted.replace(/\s+/g, ' ').trim();
        formatted = formatted.replace(/\s+,/g, ',');
        formatted = formatted.replace(/,\s*,/g, ',');
        formatted = formatted.replace(/\.\s*\./g, '.');

        // Step 10: Capitalize
        if (formatted.length > 0) {
            formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }

        // Step 11: Add period
        if (!formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?')) {
            formatted += '.';
        }

        // Step 12: Add professional introduction
        if (!formatted.toLowerCase().startsWith('o ambiente') && !formatted.toLowerCase().startsWith('o quarto')) {
            formatted = 'O ambiente ' + formatted.charAt(0).toLowerCase() + formatted.slice(1);
        }

        return formatted;
    },

    /**
     * Client-side fallback formatting (when backend is unavailable)
     */
    clientSideFallback(text, roomType, roomName) {
        const roomLabel = roomName || this.getRoomTypeLabel(roomType);

        let formatted = text.trim();

        // Replace informal terms with formal ones
        const replacements = {
            'tá': 'está',
            'ta': 'está',
            'tem': 'há',
            'tem um': 'observa-se',
            'tem uma': 'observa-se',
            'quebrado': 'avariado',
            'quebradinho': 'com pequeno dano',
            'funcionando': 'em funcionamento',
            'funcionando direitinho': 'em pleno funcionamento',
            'não sei': 'não confirmado',
            'acho que': 'aparentemente',
            'eu acho': 'aparentemente',
            'pode fazer': '',
            'por favor': '',
            'pra mim': '',
            'laudo imobiliário': '',
            'vistoria': ''
        };

        Object.entries(replacements).forEach(([informal, formal]) => {
            const regex = new RegExp(informal, 'gi');
            formatted = formatted.replace(regex, formal);
        });

        // Add formal introduction
        let result = `No ambiente vistoriado (${roomLabel}), `;

        formatted = formatted
            .replace(/\s+/g, ' ')
            .replace(/,\s*,/g, ',')
            .replace(/\.\s*\./g, '.')
            .trim();

        if (formatted.length > 0) {
            formatted = formatted.charAt(0).toLowerCase() + formatted.slice(1);
        }

        result += formatted;

        if (!result.endsWith('.')) {
            result += '.';
        }

        result += '\n\nDe modo geral, o ambiente encontra-se em condições adequadas de uso, ressalvadas as observações mencionadas.';

        return result;
    },

    /**
     * Get room type label
     */
    getRoomTypeLabel(type) {
        const labels = {
            'quarto': 'Quarto',
            'suite': 'Suíte',
            'sala': 'Sala',
            'cozinha': 'Cozinha',
            'banheiro': 'Banheiro',
            'lavabo': 'Lavabo',
            'varanda': 'Varanda',
            'garagem': 'Garagem',
            'area-servico': 'Área de Serviço',
            'escritorio': 'Escritório',
            'despensa': 'Despensa',
            'outro': 'Ambiente'
        };

        return labels[type] || 'Ambiente';
    },

    /**
     * Check backend health
     */
    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.BACKEND_URL}/api/health`);
            if (response.ok) {
                const data = await response.json();
                return data;
            }
            return null;
        } catch (error) {
            return null;
        }
    },

    /**
     * Format multiple transcriptions
     */
    async formatMultipleTranscriptions(transcriptions, roomType, roomName) {
        const formatted = [];

        for (const transcription of transcriptions) {
            if (transcription && transcription.trim()) {
                const formattedText = await this.formatToProfessionalReport(
                    transcription,
                    roomType,
                    roomName
                );
                formatted.push(formattedText);
            }
        }

        return formatted.join('\n\n');
    }
};
