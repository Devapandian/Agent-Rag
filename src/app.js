const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// Enable CORS for all origins
app.use(cors());

/**
 * Express Middleware
 */
app.use((req, res, next) => {
    next();
});

app.use(express.json({ type: ['application/json', 'text/plain'] }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    next();
});

/**
 * Health Check Route
 */
app.get('/health', (req, res) => {
    res.json({ status: 'UP', message: 'Server is running smoothly' });
});


/**
 * Mount Chat Routes
 */
app.use('/chats', chatRoutes);

module.exports = app;
