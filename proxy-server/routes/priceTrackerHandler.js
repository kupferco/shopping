// const express = require('express');
// const router = express.Router();
// const db = require('../db');

// // Product Routes
// router.post('/price-tracker/products', async (req, res) => {
//     try {
//         const { name, brand, barcode, cat2_id, size, measurement_unit, yuka_score } = req.body;
        
//         const result = await db.query(
//             `INSERT INTO products 
//             (name, brand, barcode, cat2_id, size, measurement_unit, yuka_score) 
//             VALUES ($1, $2, $3, $4, $5, $6, $7) 
//             RETURNING *`,
//             [name, brand, barcode, cat2_id, size, measurement_unit, yuka_score]
//         );
        
//         res.json(result.rows[0]);
//     } catch (err) {
//         console.error('Error adding product:', err);
//         res.status(500).json({ error: 'Failed to add product' });
//     }
// });

// // Price Tag Routes
// router.post('/price-tracker/price-tags', async (req, res) => {
//     try {
//         const { product_id, store_id, price, original_price, promotion_details, image_url } = req.body;
        
//         const result = await db.query(
//             `INSERT INTO price_tags 
//             (product_id, store_id, price, original_price, promotion_details, image_url) 
//             VALUES ($1, $2, $3, $4, $5, $6) 
//             RETURNING *`,
//             [product_id, store_id, price, original_price, promotion_details, image_url]
//         );
        
//         res.json(result.rows[0]);
//     } catch (err) {
//         console.error('Error adding price tag:', err);
//         res.status(500).json({ error: 'Failed to add price tag' });
//     }
// });

// // Get product with latest prices
// router.get('/price-tracker/products/:productId', async (req, res) => {
//     try {
//         const result = await db.query(
//             `SELECT p.*, 
//                     pt.price as current_price,
//                     pt.store_id,
//                     s.name as store_name,
//                     pt.capture_date
//              FROM products p
//              LEFT JOIN LATERAL (
//                 SELECT * FROM price_tags
//                 WHERE product_id = p.product_id
//                 ORDER BY capture_date DESC
//                 LIMIT 1
//              ) pt ON true
//              LEFT JOIN stores s ON pt.store_id = s.store_id
//              WHERE p.product_id = $1`,
//             [req.params.productId]
//         );
        
//         if (result.rows.length === 0) {
//             return res.status(404).json({ error: 'Product not found' });
//         }
        
//         res.json(result.rows[0]);
//     } catch (err) {
//         console.error('Error fetching product:', err);
//         res.status(500).json({ error: 'Failed to fetch product' });
//     }
// });

// // Compare prices across stores
// router.get('/price-tracker/products/:productId/compare', async (req, res) => {
//     try {
//         const result = await db.query(
//             `SELECT s.name as store_name,
//                     pt.price,
//                     pt.original_price,
//                     pt.promotion_details,
//                     pt.capture_date
//              FROM price_tags pt
//              JOIN stores s ON pt.store_id = s.store_id
//              WHERE pt.product_id = $1
//              AND pt.capture_date >= NOW() - INTERVAL '30 days'
//              ORDER BY pt.capture_date DESC`,
//             [req.params.productId]
//         );
        
//         res.json(result.rows);
//     } catch (err) {
//         console.error('Error comparing prices:', err);
//         res.status(500).json({ error: 'Failed to compare prices' });
//     }
// });

// module.exports = router;
