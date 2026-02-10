const express = require('express');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

/**
 * Express Middleware
 */
app.use(express.json());

/**
 * Health Check Route
 */
app.get('/health', (req, res) => {
    res.json({ status: 'UP', message: 'Server is running smoothly' });
});

/**
 * Mount User Routes
 */
app.use('/users', userRoutes);

/**
 * Mount Chat Routes
 */
app.use('/chats', chatRoutes);

module.exports = app;
