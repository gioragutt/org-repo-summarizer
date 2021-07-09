const Redis = require('ioredis');

const redis = new Redis(Number(process.env.REDIS_PORT), process.env.REDIS_HOST);

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
  return value;
}

module.exports = {redis, getCachedOrCalculate};
