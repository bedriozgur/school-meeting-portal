import type { SchoolRepository } from "../interfaces";
import { mockSchools } from "./mockData";

export const mockSchoolRepository: SchoolRepository = {
  async listSchools() {
    return [...mockSchools];
  },
  async getSchoolById(schoolId) {
    return mockSchools.find((school) => school.id === schoolId) ?? null;
  },
};
