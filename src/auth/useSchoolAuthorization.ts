import { useEffect, useMemo, useState } from "react";
import { DEFAULT_SCHOOL_ID } from "../config/school";
import type { SchoolUser, SchoolUserRole } from "../domain/models";
import { repositories } from "../repositories";
import { useAuth } from "./useAuth";

type SchoolAccessStatus = "loading" | "ready";

type SchoolAuthorizationState = {
  status: SchoolAccessStatus;
  roles: SchoolUser[];
};

export type SchoolAuthorizationResult = SchoolAuthorizationState & {
  isLoading: boolean;
  canAccessSchool: boolean;
  canManageSchool: boolean;
  canAccessSupport: boolean;
  hasSchoolAdminAccess: boolean;
  hasStaffAccess: boolean;
};

export function useSchoolAuthorization(schoolId = DEFAULT_SCHOOL_ID) {
  const {
    user,
    isSuperAdmin,
    isLegacyAdmin,
    isAllowlistedAdmin,
    authLoading,
  } = useAuth();
  const [state, setState] = useState<SchoolAuthorizationState>({
    status: "loading",
    roles: [],
  });

  useEffect(() => {
    let isCurrent = true;

    if (authLoading) {
      setState({ status: "loading", roles: [] });
      return undefined;
    }

    if (!user) {
      setState({ status: "ready", roles: [] });
      return undefined;
    }

    if (isSuperAdmin || isLegacyAdmin || isAllowlistedAdmin) {
      setState({ status: "ready", roles: [] });
      return undefined;
    }

    setState({ status: "loading", roles: [] });
    repositories.schoolUserRepository
      .getUserSchoolRoles(user.uid)
      .then((roles) => {
        if (!isCurrent) {
          return;
        }

        setState({ status: "ready", roles });
      })
      .catch(() => {
        if (!isCurrent) {
          return;
        }

        setState({ status: "ready", roles: [] });
      });

    return () => {
      isCurrent = false;
    };
  }, [authLoading, isAllowlistedAdmin, isLegacyAdmin, isSuperAdmin, schoolId, user]);

  return useMemo<SchoolAuthorizationResult>(() => {
    const activeRoles = state.roles.filter((role) => role.isActive);
    const rolesForSchool = activeRoles.filter((role) => role.schoolId === schoolId);
    const hasSchoolAdminAccess = rolesForSchool.some(
      (role) => role.role === "schoolAdmin",
    );
    const hasStaffAccess = rolesForSchool.some((role) => role.role === "staff");
    const canAccessSchool =
      isSuperAdmin ||
      isLegacyAdmin ||
      isAllowlistedAdmin ||
      hasSchoolAdminAccess ||
      hasStaffAccess;
    const canManageSchool =
      isSuperAdmin || isLegacyAdmin || isAllowlistedAdmin || hasSchoolAdminAccess;
    const canAccessSupport =
      isSuperAdmin ||
      isLegacyAdmin ||
      isAllowlistedAdmin ||
      hasSchoolAdminAccess ||
      hasStaffAccess;

    return {
      status: state.status,
      roles: activeRoles,
      isLoading: authLoading || state.status === "loading",
      canAccessSchool,
      canManageSchool,
      canAccessSupport,
      hasSchoolAdminAccess,
      hasStaffAccess,
    };
  }, [
    authLoading,
    isAllowlistedAdmin,
    isLegacyAdmin,
    isSuperAdmin,
    schoolId,
    state.roles,
    state.status,
  ]);
}

export function hasSchoolRole(
  roles: SchoolUser[],
  schoolId: string,
  allowedRoles: SchoolUserRole[],
) {
  return roles.some(
    (role) =>
      role.isActive &&
      role.schoolId === schoolId &&
      allowedRoles.includes(role.role),
  );
}

export function canAccessDefaultSchoolAdmin(roles: SchoolUser[]) {
  return hasSchoolRole(roles, DEFAULT_SCHOOL_ID, ["schoolAdmin"]);
}
