const { errorCodes } = require("fastify");

const fastify = require("fastify")({ logger: true });

fastify.listen({ port: 3000 }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
