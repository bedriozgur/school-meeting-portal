import type { TeacherRepository } from "../interfaces";
import { mockTeachers } from "./mockData";

export const mockTeacherRepository: TeacherRepository = {
  async listTeachers() {
    return mockTeachers;
  },
  async getTeacherById(teacherId) {
    return mockTeachers.find((teacher) => teacher.id === teacherId) ?? null;
  },
  async createTeacher(input) {
    const teacher = {
      id: `teacher-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: input.name.trim(),
      subject: input.subject.trim(),
      isActive: input.isActive,
    };
    mockTeachers.push(teacher);

    return teacher;
  },
  async updateTeacher(teacherId, input) {
    const teacher = mockTeachers.find(
      (currentTeacher) => currentTeacher.id === teacherId,
    );

    if (!teacher) {
      throw new Error(`Teacher not found: ${teacherId}`);
    }

    Object.assign(teacher, {
      name: input.name.trim(),
      subject: input.subject.trim(),
      isActive: input.isActive,
    });

    return teacher;
  },
  async bulkUpsertTeachers(inputs) {
    const teachers = [];
    let created = 0;
    let updated = 0;

    for (const input of inputs) {
      const normalizedName = normalizeTeacherName(input.name);
      const existingTeacher = mockTeachers.find(
        (teacher) => normalizeTeacherName(teacher.name) === normalizedName,
      );

      if (existingTeacher) {
        teachers.push(await mockTeacherRepository.updateTeacher(existingTeacher.id, input));
        updated += 1;
      } else {
        teachers.push(await mockTeacherRepository.createTeacher(input));
        created += 1;
      }
    }

    return { created, updated, teachers };
  },
};

function normalizeTeacherName(name: string) {
  return name.trim().toLocaleLowerCase("tr");
}
