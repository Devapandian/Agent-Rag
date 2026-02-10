const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

/**
 * User Routes
 * Mapping URL paths to controller actions.
 */

router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);

module.exports = router;
