import type { SchoolUserRepository } from "../interfaces";
import { mockSchoolUsers } from "./mockData";

export const mockSchoolUserRepository: SchoolUserRepository = {
  async listSchoolUsers(schoolId) {
    return mockSchoolUsers.filter((schoolUser) => schoolUser.schoolId === schoolId);
  },
  async getUserSchoolRoles(uid) {
    return mockSchoolUsers.filter((schoolUser) => schoolUser.uid === uid);
  },
  async upsertSchoolUserRole(input) {
    const id = `${input.schoolId}_${input.uid}`;
    const existingSchoolUser = mockSchoolUsers.find((schoolUser) => schoolUser.id === id);

    if (existingSchoolUser) {
      Object.assign(existingSchoolUser, {
        schoolId: input.schoolId,
        uid: input.uid,
        email: normalizeEmail(input.email),
        role: input.role,
        isActive: input.isActive,
        updatedAt: new Date().toISOString(),
      });

      return existingSchoolUser;
    }

    const schoolUser = {
      id,
      schoolId: input.schoolId,
      uid: input.uid,
      email: normalizeEmail(input.email),
      role: input.role,
      isActive: input.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockSchoolUsers.push(schoolUser);

    return schoolUser;
  },
  async deactivateSchoolUserRole(id) {
    const schoolUser = mockSchoolUsers.find((entry) => entry.id === id);

    if (!schoolUser) {
      throw new Error(`School user not found: ${id}`);
    }

    schoolUser.isActive = false;
    schoolUser.updatedAt = new Date().toISOString();

    return schoolUser;
  },
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
