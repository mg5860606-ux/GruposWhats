const express = require('express');
const router = express.Router();

// Rota placeholder para analytics
router.get('/', (req, res) => {
  res.json({ message: 'Analytics API' });
});

module.exports = router;
