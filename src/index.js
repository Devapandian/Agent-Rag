const app = require('./app');

/**
 * Server Entry Point
 * Starts the Express application and handles automatic shutdown.
 */

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Rag Chat Service running on port: ${PORT}`);
});

/**
 * Automatic Shutdown (Graceful Closing)
 */
const shutdown = (signal) => {
  console.log(`\nReceived ${signal}. Closing server...`);
  server.close(() => {
    console.log('Server closed. Process exiting.');
    process.exit(0);
  });

  // Force exit after 10 seconds if not closed
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
