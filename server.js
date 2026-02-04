// ============================================
// VistoriaApp - Secure Backend Server
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const fs = require('fs');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for photo/audio uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));

// ============================================
const mongoose = require('mongoose');
const User = require('./models/User');
const Inspection = require('./models/Inspection');
const { uploadImage, uploadAudio, deleteFile } = require('./cloudinary-config');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('✅ Connected to MongoDB Atlas'))
        .catch(err => console.error('❌ MongoDB Connection Error:', err));
} else {
    console.warn('⚠️ MONGODB_URI not found. Auth features might fail.');
}

// ============================================
// Auth Routes (MongoDB)
// ============================================

// Register Endpoint
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check availability
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Email já cadastrado' });
        }

        // Create User
        // Note: In production, password should be hashed with bcrypt
        const user = await User.create({ name, email, password });

        res.json({ success: true, user: { id: user._id, name: user.name, email: user.email } });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, error: 'Erro no servidor' });
    }
});

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email, password });

        if (user) {
            // Generate mock token (or JWT in future)
            const mockToken = `token_${user._id}_${Date.now()}`;
            res.json({
                success: true,
                user: { id: user._id, name: user.name, email: user.email },
                token: mockToken
            });
            console.log(`🔓 User logged in: ${email}`);
        } else {
            res.status(401).json({ success: false, error: 'Credenciais inválidas' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Erro no servidor' });
    }
});

// Forgot Password Endpoint (Simulated)
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            // Security: Don't reveal user doesn't exist
            return res.json({ success: true, message: 'Se o email existir, um link de recuperação foi enviado.' });
        }

        // Generate Token
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expires = Date.now() + 3600000; // 1 hour

        // Save to user
        user.resetToken = token;
        user.resetExpires = expires;
        await user.save();

        // Simulate Email Sending
        console.log('\n==================================================');
        console.log('📧 [SIMULAÇÃO DE EMAIL] Recuperação de Senha');
        console.log(`Para: ${email}`);
        console.log('Link: O usuário deve inserir este código na tela de reset:');
        console.log(`🔑 CÓDIGO: ${token}`);
        console.log('==================================================\n');

        res.json({ success: true, message: 'Link de recuperação enviado (Verifique o Console)' });
    } catch (error) {
        console.error('Forgot Password error:', error);
        res.status(500).json({ success: false, error: 'Erro no servidor' });
    }
});

// Reset Password Endpoint
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const user = await User.findOne({
            resetToken: token,
            resetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, error: 'Código inválido ou expirado' });
        }

        // Update password and clear token
        user.password = newPassword;
        user.resetToken = undefined;
        user.resetExpires = undefined;

        await user.save();

        res.json({ success: true, message: 'Senha atualizada com sucesso' });
    } catch (error) {
        console.error('Reset Password error:', error);
        res.status(500).json({ success: false, error: 'Erro no servidor' });
    }
});


// ============================================
// Inspection Routes (MongoDB)
// ============================================

// Helper: Extract userId from token (mock implementation)
function getUserIdFromToken(req) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;

    // Extract userId from mock token format: token_userId_timestamp
    const parts = token.split('_');
    return parts[1] || null;
}

// GET all inspections for logged-in user
app.get('/api/inspections', async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Não autorizado' });
        }

        const inspections = await Inspection.find({ userId })
            .sort({ createdAt: -1 })
            .select('-__v');

        res.json({ success: true, inspections });
    } catch (error) {
        console.error('Get inspections error:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar vistorias' });
    }
});

// GET single inspection by ID
app.get('/api/inspections/:id', async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Não autorizado' });
        }

        // Try finding by internal ID or localId
        const query = userId ? { userId } : {};
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            query._id = req.params.id;
        } else {
            query.localId = req.params.id;
        }

        const inspection = await Inspection.findOne(query);

        if (!inspection) {
            return res.status(404).json({ success: false, error: 'Vistoria não encontrada' });
        }

        res.json({ success: true, inspection });
    } catch (error) {
        console.error('Get inspection error:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar vistoria' });
    }
});

// POST create new inspection
app.post('/api/inspections', async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Não autorizado' });
        }

        const inspectionData = {
            ...req.body,
            userId
        };

        const inspection = await Inspection.create(inspectionData);

        res.json({ success: true, inspection });
        console.log(`✅ Inspection created: ${inspection._id}`);
    } catch (error) {
        console.error('Create inspection error:', error);
        res.status(500).json({ success: false, error: 'Erro ao criar vistoria' });
    }
});

// PUT update inspection
app.put('/api/inspections/:id', async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Não autorizado' });
        }

        // Update by localId (mapped from frontend id)
        const query = { userId };
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            query._id = req.params.id;
        } else {
            query.localId = req.params.id;
        }

        const inspection = await Inspection.findOneAndUpdate(
            query,
            { ...req.body, updatedAt: Date.now() },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        if (!inspection) {
            return res.status(404).json({ success: false, error: 'Vistoria não encontrada' });
        }

        res.json({ success: true, inspection });
        console.log(`✅ Inspection updated: ${inspection._id}`);
    } catch (error) {
        console.error('Update inspection error:', error);
        res.status(500).json({ success: false, error: 'Erro ao atualizar vistoria' });
    }
});

// DELETE inspection
app.delete('/api/inspections/:id', async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Não autorizado' });
        }

        const inspection = await Inspection.findOneAndDelete({
            _id: req.params.id,
            userId
        });

        if (!inspection) {
            return res.status(404).json({ success: false, error: 'Vistoria não encontrada' });
        }

        res.json({ success: true, message: 'Vistoria deletada com sucesso' });
        console.log(`🗑️ Inspection deleted: ${req.params.id}`);
    } catch (error) {
        console.error('Delete inspection error:', error);
        res.status(500).json({ success: false, error: 'Erro ao deletar vistoria' });
    }
});

// POST migrate inspections from localStorage
app.post('/api/inspections/migrate', async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Não autorizado' });
        }

        const { inspections } = req.body;

        if (!inspections || typeof inspections !== 'object') {
            return res.status(400).json({ success: false, error: 'Dados inválidos' });
        }

        const migratedInspections = [];

        for (const [key, inspectionData] of Object.entries(inspections)) {
            try {
                const inspection = await Inspection.create({
                    ...inspectionData,
                    userId
                });
                migratedInspections.push(inspection);
            } catch (err) {
                console.error(`Error migrating inspection ${key}:`, err);
            }
        }

        res.json({
            success: true,
            message: `${migratedInspections.length} vistorias migradas com sucesso`,
            count: migratedInspections.length
        });

        console.log(`📦 Migrated ${migratedInspections.length} inspections for user ${userId}`);
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ success: false, error: 'Erro na migração' });
    }
});

// ============================================
// Cloudinary Upload Routes
// ============================================

// Upload photo to Cloudinary
app.post('/api/upload/photo', async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Não autorizado' });
        }

        const { photo } = req.body;

        if (!photo) {
            return res.status(400).json({ success: false, error: 'Foto não fornecida' });
        }

        const result = await uploadImage(photo, `inspections/${userId}`);

        if (result.success) {
            res.json({
                success: true,
                url: result.url,
                publicId: result.publicId
            });
            console.log(`📸 Photo uploaded: ${result.publicId}`);
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Photo upload error:', error);
        res.status(500).json({ success: false, error: 'Erro ao fazer upload da foto' });
    }
});

// Upload audio to Cloudinary
app.post('/api/upload/audio', async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Não autorizado' });
        }

        const { audio } = req.body;

        if (!audio) {
            return res.status(400).json({ success: false, error: 'Áudio não fornecido' });
        }

        const result = await uploadAudio(audio, `inspections/${userId}/audio`);

        if (result.success) {
            res.json({
                success: true,
                url: result.url,
                publicId: result.publicId
            });
            console.log(`🎤 Audio uploaded: ${result.publicId}`);
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Audio upload error:', error);
        res.status(500).json({ success: false, error: 'Erro ao fazer upload do áudio' });
    }
});

// Delete file from Cloudinary
app.delete('/api/upload/:publicId', async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Não autorizado' });
        }

        const { publicId } = req.params;
        const { resourceType } = req.query; // 'image' or 'video'

        const result = await deleteFile(publicId, resourceType || 'image');

        if (result.success) {
            res.json({ success: true, message: 'Arquivo deletado com sucesso' });
            console.log(`🗑️ File deleted: ${publicId}`);
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ success: false, error: 'Erro ao deletar arquivo' });
    }
});

// ============================================
// API Routes
// ============================================

/**
 * Format text to professional inspection report
 */
app.post('/api/format-text', async (req, res) => {
    try {
        const { text, roomType, roomName } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Check if API key is configured
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            // Return rule-based formatting if no API key
            const formatted = ruleBasedFormatting(text, roomType, roomName);
            return res.json({
                formatted,
                method: 'rule-based',
                message: 'Using rule-based formatting (no API key configured)'
            });
        }

        // Call Gemini API
        const formatted = await formatWithGemini(text, roomType, roomName, apiKey);

        res.json({
            formatted,
            method: 'ai',
            message: 'Formatted with Gemini AI'
        });

    } catch (error) {
        console.error('Error formatting text:', error);

        // Fallback to rule-based formatting on error
        const { text, roomType, roomName } = req.body;
        const formatted = ruleBasedFormatting(text, roomType, roomName);

        res.json({
            formatted,
            method: 'rule-based-fallback',
            message: 'AI formatting failed, using rule-based fallback',
            error: error.message
        });
    }
});

/**
 * Format audio transcription to professional inspection report
 */
app.post('/api/format-audio', async (req, res) => {
    try {
        const { transcription } = req.body;

        if (!transcription) {
            return res.status(400).json({ error: 'Transcription is required' });
        }

        // Check if API key is configured
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            // Return basic formatting if no API key
            const formatted = basicAudioFormatting(transcription);
            return res.json({
                formatted,
                method: 'rule-based',
                message: 'Using basic formatting (no API key configured)'
            });
        }

        // Call Gemini API with audio-specific prompt
        const formatted = await formatAudioWithGemini(transcription, apiKey);

        res.json({
            formatted,
            method: 'ai',
            message: 'Formatted with Gemini AI'
        });

    } catch (error) {
        console.error('Error formatting audio:', error);

        // Fallback to basic formatting on error
        const { transcription } = req.body;
        const formatted = basicAudioFormatting(transcription);

        res.json({
            formatted,
            method: 'rule-based-fallback',
            message: 'AI formatting failed, using basic fallback',
            error: error.message
        });
    }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        hasApiKey: !!process.env.GEMINI_API_KEY,
        timestamp: new Date().toISOString()
    });
});

// ============================================
// Gemini API Integration
// ============================================

async function formatWithGemini(text, roomType, roomName, apiKey) {
    const prompt = buildPrompt(text, roomType, roomName);

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        }
    );

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim();
    }

    throw new Error('Invalid API response format');
}

function buildPrompt(text, roomType, roomName) {
    const roomLabel = roomName || getRoomTypeLabel(roomType);

    return `Você é um especialista em laudos técnicos de vistoria imobiliária. Sua tarefa é transformar a descrição informal abaixo em um texto formal e técnico adequado para um laudo de vistoria profissional.

CÔMODO: ${roomLabel}

DESCRIÇÃO INFORMAL:
"${text}"

INSTRUÇÕES:
1. Use linguagem técnica e formal, adequada para documentos jurídicos
2. Organize as informações de forma estruturada e clara
3. Use termos técnicos quando apropriado (ex: "confeccionado em", "instalado de forma adequada", "apresenta condições gerais de uso")
4. Seja objetivo e descritivo
5. Mencione quantidades de forma extensa quando relevante (ex: "12 (doze) tomadas")
6. Classifique problemas de forma técnica (ex: "avaria pontual", "dano localizado", "comprometimento estrutural")
7. Mantenha tom neutro e imparcial
8. Organize em parágrafos curtos e coesos
9. Finalize com uma avaliação geral do estado
10. NÃO inclua saudações, títulos ou assinaturas - apenas o corpo do texto descritivo

FORMATO DE SAÍDA:
Retorne APENAS o texto formatado do laudo, sem nenhum texto adicional, explicação ou marcação.`;
}

async function formatAudioWithGemini(transcription, apiKey) {
    const prompt = buildAudioPrompt(transcription);

    console.log('📤 Sending to Gemini API...');
    console.log('Prompt length:', prompt.length);

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_NONE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_NONE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_NONE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_NONE"
                    }
                ]
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error:', response.status, errorText);
        throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📥 Gemini response:', JSON.stringify(data, null, 2));

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        console.log('✅ Formatted successfully');
        return data.candidates[0].content.parts[0].text.trim();
    }

    // Log the full response to understand why it's empty
    console.error('❌ Empty response from Gemini:', JSON.stringify(data, null, 2));
    throw new Error('Invalid API response format');
}

function buildAudioPrompt(transcription) {
    return `Você é um redator técnico de laudos de vistoria imobiliária.

Transforme esta transcrição de áudio informal em texto profissional para laudo técnico:

"${transcription}"

REGRAS:
1. Remova: "é", "né", "aí", "então", "eu acho que"
2. Remova contagens verbais: "um dois três quatro" -> use só "quatro"
3. Remova autocorreções: "quatro não cinco" -> use só "cinco"
4. Remova repetições: "cinco cinco" -> use só "cinco"
5. Substitua "tem" por "possui", "dispõe de", "conta com"
6. Use gramática correta e pontuação adequada
7. Organize em frases completas e claras
8. Use terceira pessoa impessoal

EXEMPLOS:

Entrada: "é o quarto tem uma cama eu acho que é queen"
Saída: "O quarto possui uma cama queen size."

Entrada: "tem um dois três quatro gavetas em cada porta"
Saída: "Cada porta possui quatro gavetas internas."

Entrada: "a porta simples ela tem quatro não cinco prateleiras"
Saída: "A porta simples dispõe de cinco prateleiras."

Retorne APENAS o texto formatado, sem explicações.`;
}

// ============================================
// Rule-based Formatting (Fallback)
// ============================================

function ruleBasedFormatting(text, roomType, roomName) {
    const roomLabel = roomName || getRoomTypeLabel(roomType);

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
}

function getRoomTypeLabel(type) {
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
}

function basicAudioFormatting(text) {
    let formatted = text.trim();

    // Step 1: Remove filler words FIRST (before other replacements)
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
        /\be\s+e\s+/gi, // duplicate "e"
    ];

    fillersToRemove.forEach(pattern => {
        formatted = formatted.replace(pattern, '');
    });

    // Step 2: Remove verbal counting (keep last number only)
    formatted = formatted.replace(/\b(uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez)\s+(duas|dois|três|quatro|cinco|seis|sete|oito|nove|dez)\b/gi, '$2');

    // Step 3: Remove autocorrections
    formatted = formatted.replace(/\b(um|uma|dois|duas|três|quatro|cinco)\s+não\s+(tem|possui)?\s*(um|uma|dois|duas|três|quatro|cinco)\b/gi, '$3');

    // Step 4: Remove repetitions
    formatted = formatted.replace(/\b(\w+)\s+\1\b/gi, '$1'); // any word repeated

    // Step 5: Fix "também" appearing multiple times
    formatted = formatted.replace(/\btambém\s+também/gi, 'também');
    formatted = formatted.replace(/\btambm/gi, 'também'); // fix broken "também"

    // Step 6: Clean up "eu tenho" at the beginning
    formatted = formatted.replace(/^eu tenho\s+/i, '');
    formatted = formatted.replace(/^tenho\s+/i, '');

    // Step 7: Replace informal terms with formal ones
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

    // Step 8: Try to structure better
    // Replace "e" at the beginning of sentences with proper structure
    formatted = formatted.replace(/\s+e\s+possui/gi, '. Possui');
    formatted = formatted.replace(/\s+e\s+uma/gi, ', uma');
    formatted = formatted.replace(/\s+e\s+um/gi, ', um');
    formatted = formatted.replace(/\s+e\s+duas/gi, ', duas');
    formatted = formatted.replace(/\s+e\s+dois/gi, ', dois');

    // Step 9: Clean up extra spaces and punctuation
    formatted = formatted.replace(/\s+/g, ' ').trim();
    formatted = formatted.replace(/\s+,/g, ',');
    formatted = formatted.replace(/,\s*,/g, ',');
    formatted = formatted.replace(/\.\s*\./g, '.');

    // Step 10: Capitalize first letter
    if (formatted.length > 0) {
        formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }

    // Step 11: Add period if missing
    if (!formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?')) {
        formatted += '.';
    }

    // Step 12: Add professional introduction
    if (!formatted.toLowerCase().startsWith('o ambiente') && !formatted.toLowerCase().startsWith('o quarto')) {
        formatted = 'O ambiente ' + formatted.charAt(0).toLowerCase() + formatted.slice(1);
    }

    return formatted;
}

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
    console.log(`\n🚀 VistoriaApp Backend Server`);
    console.log(`📍 Running on: http://localhost:${PORT}`);
    console.log(`🔑 API Key configured: ${process.env.GEMINI_API_KEY ? 'Yes ✅' : 'No ❌'}`);
    console.log(`\n📝 Endpoints:`);
    console.log(`   POST /api/format-text  - Format text to professional report`);
    console.log(`   POST /api/format-audio - Format audio transcription to professional report`);
    console.log(`   GET  /api/health       - Health check\n`);
});
