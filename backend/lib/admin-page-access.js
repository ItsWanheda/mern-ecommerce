export const getAdminPageAccessStatus = ({
  user,
  sessionActive = true,
  refreshTokenMatches = true,
} = {}) => {
  if (!user || user.isActive === false || sessionActive !== true || refreshTokenMatches !== true) return 401;
  return user.role === "admin" ? 200 : 403;
};
