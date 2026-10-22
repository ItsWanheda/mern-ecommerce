export const hasAdministratorManagementAccess = (role, isActive, permissions) =>
  role === "admin" &&
  isActive !== false &&
  (!Array.isArray(permissions) || permissions.includes("*") || permissions.includes("roles.manage"));

export const canPreserveAdministratorManagement = ({
  nextRole,
  nextActive,
  nextPermissions,
  otherActiveAdmins = [],
}) => hasAdministratorManagementAccess(nextRole, nextActive, nextPermissions) ||
  otherActiveAdmins.some((administrator) =>
    hasAdministratorManagementAccess("admin", true, administrator.permissions)
  );
