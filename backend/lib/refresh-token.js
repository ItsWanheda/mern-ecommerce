const ROTATE_SCRIPT = "if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3]); return 1 else return 0 end";

export const rotateRefreshToken = async ({
  redisClient,
  userId,
  presentedToken,
  nextRefreshToken,
  ttlSeconds = 7 * 24 * 60 * 60,
}) => {
  const result = await redisClient.eval(
    ROTATE_SCRIPT, 1, `refresh_token:${userId}`, presentedToken, nextRefreshToken, ttlSeconds
  );
  return Number(result) === 1;
};
