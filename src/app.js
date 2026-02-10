const express = require('express');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

/**
 * Express Middleware
 */
app.use((req, res, next) => {
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
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
