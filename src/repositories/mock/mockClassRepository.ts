import type { ClassRepository } from "../interfaces";
import { mockClasses } from "./mockData";
import { DEFAULT_SCHOOL_ID } from "../../config/school";

export const mockClassRepository: ClassRepository = {
  async listClasses() {
    return mockClasses;
  },
  async countClasses() {
    return mockClasses.length;
  },
  async getClassById(classId) {
    return mockClasses.find((schoolClass) => schoolClass.id === classId) ?? null;
  },
  async createClass(input) {
    const schoolClass = {
      id: `class-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      schoolId: DEFAULT_SCHOOL_ID,
      name: input.name.trim(),
      grade: input.grade.trim(),
      classTeacherId: input.classTeacherId ?? "",
      isActive: input.isActive,
    };
    mockClasses.push(schoolClass);

    return schoolClass;
  },
  async updateClass(classId, input) {
    const schoolClass = mockClasses.find(
      (currentClass) => currentClass.id === classId,
    );

    if (!schoolClass) {
      throw new Error(`Class not found: ${classId}`);
    }

    Object.assign(schoolClass, {
      name: input.name.trim(),
      grade: input.grade.trim(),
      classTeacherId: input.classTeacherId ?? "",
      isActive: input.isActive,
    });

    return schoolClass;
  },
  async bulkUpsertClasses(inputs) {
    const classes = [];
    let created = 0;
    let updated = 0;

    for (const input of inputs) {
      const normalizedName = normalizeClassName(input.name);
      const existingClass = mockClasses.find(
        (schoolClass) => normalizeClassName(schoolClass.name) === normalizedName,
      );

      if (existingClass) {
        classes.push(await mockClassRepository.updateClass(existingClass.id, input));
        updated += 1;
      } else {
        classes.push(await mockClassRepository.createClass(input));
        created += 1;
      }
    }

    return { created, updated, classes };
  },
};

function normalizeClassName(name: string) {
  return name.trim().toLocaleLowerCase("tr");
}
