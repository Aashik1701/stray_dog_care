const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { semanticSearch, nlSearch } = require('../controllers/searchController');

// Semantic search over reports via vector search (auth required)
router.get('/semantic', auth, semanticSearch);

// Natural-language query → Mongo filter (auth required)
router.get('/nl', auth, nlSearch);

module.exports = router;
