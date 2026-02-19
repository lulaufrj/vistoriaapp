// ============================================
// AI Formatter Module - Professional Report Text
// ============================================

const AIFormatter = {
    // Auto-detect Backend URL based on environment
    BACKEND_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : window.location.origin,

    /**
     * Clean raw transcription by removing filler words and sounds
     */
    cleanRawText(text) {
        if (!text) return '';

        // Filler words to remove (case insensitive)
        const fillers = [
            /\b(é+|eeee+)\b/gi,         // Long "é" sounds
            /\b(então\s*)+/gi,          // "então", "então então"
            /\b(peraí|pera\s*aí)\b/gi,  // "peraí"
            /\b(tipo\s*assim)\b/gi,     // "tipo assim"
            /\b(sabe)\b/gi,             // "sabe"
            /\b(né)\b/gi,               // "né"
            /\b(aí)\b/gi,               // "aí"
            /\b(daí)\b/gi,              // "daí"
            /\b(hum|hmm+)\b/gi,         // "hum", "hmmm"
            /\b(bom)\b/gi,              // "bom" (context dependent, but often filler at start)
            /\b(na\s*verdade)\b/gi,     // "na verdade"
            /\b(ou\s*seja)\b/gi,        // "ou seja"
        ];

        let cleaned = text;

        // Apply filters
        fillers.forEach(regex => {
            cleaned = cleaned.replace(regex, ' ');
        });

        // Clean up double spaces and trimming
        return cleaned.replace(/\s+/g, ' ').trim();
    },

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
        let content = text.trim();

        if (!content) return '';

        // 1. Dictionary of terms to help structure the sentence
        const keywords = {
            'parede': 'As paredes apresentam',
            'piso': 'O piso encontra-se',
            'teto': 'O teto possui',
            'porta': 'A porta está',
            'janela': 'A janela encontra-se',
            'vidro': 'Os vidros estão',
            'pintura': 'A pintura apresenta-se',
            'iluminação': 'A iluminação conta com',
            'luminária': 'A luminária está',
            'tomada': 'As tomadas estão',
            'interruptor': 'Os interruptores estão',
            'rodapé': 'O rodapé encontra-se',
            'cortina': 'A cortina está',
            'persiana': 'A persiana encontra-se',
            'ar': 'O ar condicionado está',
            'ventilador': 'O ventilador encontra-se',
            'armário': 'O armário apresenta',
            'gaveta': 'As gavetas estão',
            'prateleira': 'As prateleiras estão',
            'espelho': 'O espelho encontra-se',
            'box': 'O box está',
            'pia': 'A pia encontra-se',
            'torneira': 'A torneira está',
            'vaso': 'O vaso sanitário está',
            'chuveiro': 'O chuveiro encontra-se',
            'cama': 'A cama está',
            'colchão': 'O colchão encontra-se',
            'mesa': 'A mesa está',
            'cadeira': 'As cadeiras estão',
            'sofá': 'O sofá encontra-se',
            'tapete': 'O tapete está',
            'rack': 'O rack encontra-se',
            'painel': 'O painel está',
            'tv': 'A televisão encontra-se',
            'geladeira': 'A geladeira está',
            'fogão': 'O fogão encontra-se',
            'microondas': 'O microondas está',
            'micro-ondas': 'O micro-ondas está',
            'máquina': 'A máquina de lavar está',
            'tanque': 'O tanque encontra-se'
        };

        // 2. Pre-processing: Common corrections
        content = content
            .replace(/\b(ta|tá)\b/gi, 'está')
            .replace(/\b(tem)\b/gi, 'possui')
            .replace(/\b(quebrado)\b/gi, 'avariado')
            .replace(/\b(ruim)\b/gi, 'em mau estado')
            .replace(/\b(bom)\b/gi, 'em bom estado')
            .replace(/\b(ok)\b/gi, 'em ordem')
            .replace(/\b(sujo)\b/gi, 'com sujidade')
            .replace(/\b(limpo)\b/gi, 'higienizado')
            .replace(/\s+/g, ' ');

        // 3. Construct the sentence
        // If the text looks like a list ("item estado item estado"), try to punctuate it
        let formedSentence = '';

        // Split by known keywords to inject punctuation if missing
        const words = content.split(' ');
        let currentSegment = [];

        words.forEach((word, index) => {
            const lowerWord = word.toLowerCase();
            // If word is a keyword and it's not the start of the text, maybe start a new clause
            if (keywords[lowerWord] && index > 0) {
                if (currentSegment.length > 0) {
                    formedSentence += currentSegment.join(' ') + ', ';
                    currentSegment = [];
                }
            }
            currentSegment.push(word);
        });
        formedSentence += currentSegment.join(' ');

        // 4. Final Polish
        // Start with capital letter
        formedSentence = formedSentence.charAt(0).toUpperCase() + formedSentence.slice(1);

        // Ensure it ends with a period
        if (!formedSentence.endsWith('.')) formedSentence += '.';

        // 5. Wrap in professional context
        // If the sentence is extremely short or just a list, prepend context
        if (formedSentence.length < 50 && !formedSentence.includes('O ambiente')) {
            return `No ambiente ${roomLabel}, observa-se: ${formedSentence}`;
        }

        return `Referente ao ambiente ${roomLabel}: ${formedSentence}`;
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
