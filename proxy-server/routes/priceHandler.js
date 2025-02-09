const express = require('express');
const router = express.Router();
const db = require('../db');

// Add a new product
router.post('/products', async (req, res) => {
    try {
        const { name, brand, barcode, cat2_id, size, measurement_unit, yuka_score } = req.body;
        
        const result = await db.query(
            `INSERT INTO products 
            (name, brand, barcode, cat2_id, size, measurement_unit, yuka_score) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *`,
            [name, brand, barcode, cat2_id, size, measurement_unit, yuka_score]
        );
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).json({ error: 'Failed to add product' });
    }
});

// Get all products
router.get('/products', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM products ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

module.exports = router;