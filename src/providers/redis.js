const Redis = require('ioredis');

const redisPort = Number(process.env.REDIS_PORT);
const redisHost = process.env.REDIS_HOST;
const redis = new Redis(redisPort, redisHost);

/**
 * @template T
 * @param {string} key
 * @param {() => Promise<T>} calculate
 * @return {Promise<T>}
 */
async function getCachedOrCalculate(key, calculate) {
  const cached = await redis.get(key);
  if (cached) {
    console.log('Key already cached', key);
    return JSON.parse(cached);
  }

  console.log('Key not cached, calculating', key);
  const value = await calculate();
  await redis.set(key, JSON.stringify(value), 'EX', 86400);
  console.log('Key now cached', key);
  return value;
}

module.exports = {redis, getCachedOrCalculate};
