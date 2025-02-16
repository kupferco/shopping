const fs = require('fs');
const path = require('path');
const db = require('../../db');

class ImageUploadService {
    /**
     * Create store-specific uploads directory
     * @param {string} storeId - ID of the store
     * @returns {string} Path to store-specific uploads directory
     */
    static getStoreUploadsDirectory(storeId) {
        const uploadsDir = path.join(__dirname, '..', '..', 'uploads', storeId);
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        return uploadsDir;
    }

    /**
     * Generate a unique filename for the uploaded image
     * @returns {string} Unique filename
     */
    static generateUniqueFilename() {
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/:/g, '-')     // Replace colons with hyphens
            .replace(/\..+/, '');   // Remove milliseconds

        return `price_tag_${timestamp}.jpg`;
    }

    /**
     * Save image to store-specific directory
     * @param {Buffer} imageBuffer - Image data
     * @param {string} storeId - ID of the store
     * @param {string} filename - Filename to save
     * @returns {string} Full path of saved image
     */
    static saveImageToFile(imageBuffer, storeId, filename) {
        const storeUploadsDir = this.getStoreUploadsDirectory(storeId);
        const fullPath = path.join(storeUploadsDir, filename);
        fs.writeFileSync(fullPath, imageBuffer);
        return fullPath;
    }

    /**
     * Save image metadata to database
     * @param {string} storeId - ID of the store
     * @param {string} imageUrl - URL/path of the image
     * @returns {Promise<Object>} Database insert result
     */
    static async saveImageToDatabase(storeId, imageUrl) {
        try {
            const result = await db.query(
                `INSERT INTO price_tags 
                (store_id, image_url, price) 
                VALUES ($1, $2, $3)
                RETURNING *`,
                [storeId, imageUrl, 0]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Database image save error:', error);
            throw error;
        }
    }

    /**
     * Handle full image upload process
     * @param {string} base64Image - Base64 encoded image
     * @param {string} storeId - ID of the store
     * @returns {Promise<Object>} Upload result
     */
    static async uploadImage(base64Image, storeId) {
        // Validate input
        if (!base64Image) {
            throw new Error('No image provided');
        }
        if (!storeId) {
            throw new Error('No store ID provided');
        }

        try {
            // Convert base64 to buffer
            const imageBuffer = Buffer.from(base64Image, 'base64');

            // Generate unique filename
            const filename = this.generateUniqueFilename();

            // Save image to store-specific file
            const fullPath = this.saveImageToFile(imageBuffer, storeId, filename);

            // Save to database
            const dbResult = await this.saveImageToDatabase(
                storeId,
                `/uploads/${storeId}/${filename}`
            );

            return {
                success: true,
                message: 'Image uploaded successfully',
                imageUrl: `/uploads/${storeId}/${filename}`,
                databaseRecord: dbResult
            };
        } catch (error) {
            console.error('Image Upload Error:', error);
            throw error;
        }
    }
}

module.exports = ImageUploadService;