const app = require('./app');

/**
 * Server Entry Point
 * Starts the Express application on a specified port.
 */

const PORT = process.env.PORT || 3000;

  await app.listen(PORT, () => {
    logger.log(`Chat service running on port ${PORT}`);
    logger.log("Chat microservice listening on port 3107");
  })
