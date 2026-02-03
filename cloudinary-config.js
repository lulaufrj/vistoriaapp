const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image to Cloudinary
 * @param {string} base64Data - Base64 encoded image
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<object>} Upload result with URL
 */
async function uploadImage(base64Data, folder = 'inspections') {
    try {
        const result = await cloudinary.uploader.upload(base64Data, {
            folder: folder,
            resource_type: 'image',
            transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ]
        });

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id
        };
    } catch (error) {
        console.error('Cloudinary image upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Upload audio to Cloudinary
 * @param {string} base64Data - Base64 encoded audio
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<object>} Upload result with URL
 */
async function uploadAudio(base64Data, folder = 'inspections/audio') {
    try {
        const result = await cloudinary.uploader.upload(base64Data, {
            folder: folder,
            resource_type: 'video' // Cloudinary treats audio as video
        });

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id
        };
    } catch (error) {
        console.error('Cloudinary audio upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of the file
 * @param {string} resourceType - Type of resource (image, video)
 * @returns {Promise<object>} Deletion result
 */
async function deleteFile(publicId, resourceType = 'image') {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        });

        return {
            success: result.result === 'ok',
            result: result.result
        };
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    cloudinary,
    uploadImage,
    uploadAudio,
    deleteFile
};
