const app = require('./app');

/**
 * Server Entry Point
 * Starts the Express application and handles automatic shutdown.
 */

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(` Rag Chat Service running on port: ${PORT}`);
});


const shutdown = (signal) => {
  console.log(`\nReceived ${signal}. Closing server...`);
  server.close(() => {
    console.log('');
    process.exit(0);
  });

  // Force exit after 10 seconds if not closed
  setTimeout(() => {
    console.error('');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
