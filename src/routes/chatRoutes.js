const express = require('express');
const chatController = require('../controllers/chatController');

const router = express.Router();

router.post('/query', chatController.prompt);

module.exports = router;
