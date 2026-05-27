import type { SchoolClass, Teacher } from "../domain/models";
import { ImportSection } from "../features/imports/ImportSection";
import { PreviewCell } from "../features/imports/ImportPreviewTable";
import {
  buildTemplateDownloadAction,
  importTemplateConfigs,
} from "../features/imports/importTemplates";
import { parseIsActive } from "../features/imports/importUtils";
import type { ImportRowBase } from "../features/imports/types";
import { useParsedImportFile } from "../features/imports/useParsedImportFile";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";
import { repositories } from "../repositories";

type ParsedTeacherRow = ImportRowBase & {
  defaultSubject: string;
  fullName: string;
  isActive: boolean;
};

type ParsedClassRow = ImportRowBase & {
  className: string;
  classTeacher: string;
  classTeacherId: string | null;
  grade: string;
  isActive: boolean;
};

type ParsedStudentRow = ImportRowBase & {
  classId: string;
  className: string;
  fullName: string;
  isActive: boolean;
  schoolNumber: string;
};

type ParsedAssignmentRow = ImportRowBase & {
  className: string;
  classId: string;
  resolvedSubject: string;
  subject: string;
  subjectOverride: string | null;
  teacherId: string;
  teacherName: string;
  isActive: boolean;
};

export function AdminImportPage() {
  const { t } = useT();
  const teacherTemplateAction = buildTemplateDownloadAction("teachers");
  const classTemplateAction = buildTemplateDownloadAction("classes");
  const studentTemplateAction = buildTemplateDownloadAction("students");
  const assignmentTemplateAction = buildTemplateDownloadAction("assignments");
  const teacherTemplate = importTemplateConfigs.teachers;
  const classTemplate = importTemplateConfigs.classes;
  const studentTemplate = importTemplateConfigs.students;
  const assignmentTemplate = importTemplateConfigs.assignments;
  const teacherImport = useParsedImportFile<ParsedTeacherRow>({
    validateRows: validateTeacherRows,
    importRows: async (rows) => {
      const result = await repositories.teacherRepository.bulkUpsertTeachers(
        rows.map((row) => ({
          isActive: row.isActive,
          name: row.fullName,
          subject: row.defaultSubject,
        })),
      );

      return {
        created: result.created,
        updated: result.updated,
      };
    },
  });
  const classImport = useParsedImportFile<ParsedClassRow>({
    validateRows: async (rows) =>
      validateClassRows(
        rows,
        await repositories.teacherRepository.listTeachers(),
      ),
    importRows: async (rows) => {
      const result = await repositories.classRepository.bulkUpsertClasses(
        rows.map((row) => ({
          classTeacherId: row.classTeacherId,
          grade: row.grade,
          isActive: row.isActive,
          name: row.className,
        })),
      );

      return {
        created: result.created,
        updated: result.updated,
      };
    },
  });
  const studentImport = useParsedImportFile<ParsedStudentRow>({
    validateRows: async (rows) =>
      validateStudentRows(rows, await repositories.classRepository.listClasses()),
    importRows: async (rows) => {
      const result = await repositories.studentRepository.bulkUpsertStudents(
        rows.map((row) => ({
          classId: row.classId,
          isActive: row.isActive,
          name: row.fullName,
          schoolNumber: row.schoolNumber,
        })),
      );

      return {
        created: result.created,
        updated: result.updated,
      };
    },
  });
  const assignmentImport = useParsedImportFile<ParsedAssignmentRow>({
    validateRows: async (rows) =>
      validateAssignmentRows(
        rows,
        await repositories.classRepository.listClasses(),
        await repositories.teacherRepository.listTeachers(),
      ),
    importRows: async (rows) => {
      const result =
        await repositories.teachingAssignmentRepository.bulkUpsertTeachingAssignments(
          rows.map((row) => ({
            classId: row.classId,
            teacherId: row.teacherId,
            isActive: row.isActive,
            ...(row.subjectOverride
              ? { subjectOverride: row.subjectOverride }
              : {}),
          })),
        );

      return {
        created: result.created,
        updated: result.updated,
      };
    },
  });

  return (
    <div className="space-y-5">
      <ImportSection
        confirmKey={teacherTemplate.section.confirmKey}
        descriptionKey={teacherTemplate.section.descriptionKey}
        errorKey={teacherTemplate.section.errorKey}
        expectedColumnsKey={teacherTemplate.expectedColumnsKey}
        importingKey={teacherTemplate.section.importingKey}
        templateActions={[teacherTemplateAction]}
        previewTitleKey={teacherTemplate.section.previewTitleKey}
        renderPreviewRow={(row) => (
          <div className="grid gap-3 md:grid-cols-4">
            <PreviewCell
              label={t("admin.importRow")}
              value={String(row.rowNumber)}
            />
            <PreviewCell label={t("admin.teacherFullName")} value={row.fullName} />
            <PreviewCell
              label={t("admin.teacherDefaultSubject")}
              value={row.defaultSubject || t("admin.masterDataMissingValue")}
            />
            <PreviewCell
              label={t("admin.statusActive")}
              value={
                row.isActive ? t("admin.statusActive") : t("admin.statusInactive")
              }
            />
          </div>
        )}
        successKey={teacherTemplate.section.successKey}
        titleKey={teacherTemplate.section.titleKey}
        uploadTitleKey={teacherTemplate.section.uploadTitleKey}
        validRowsTitleKey={teacherTemplate.section.validRowsTitleKey}
        {...teacherImport}
      />

      <ImportSection
        confirmKey={classTemplate.section.confirmKey}
        descriptionKey={classTemplate.section.descriptionKey}
        errorKey={classTemplate.section.errorKey}
        expectedColumnsKey={classTemplate.expectedColumnsKey}
        eyebrowKey={classTemplate.section.eyebrowKey}
        importingKey={classTemplate.section.importingKey}
        templateActions={[classTemplateAction]}
        previewTitleKey={classTemplate.section.previewTitleKey}
        renderPreviewRow={(row) => (
          <div className="grid gap-3 md:grid-cols-5">
            <PreviewCell
              label={t("admin.importRow")}
              value={String(row.rowNumber)}
            />
            <PreviewCell label={t("admin.className")} value={row.className} />
            <PreviewCell label={t("dashboard.grade")} value={row.grade} />
            <PreviewCell
              label={t("admin.classTeacher")}
              value={row.classTeacher || t("admin.masterDataMissingValue")}
            />
            <PreviewCell
              label={t("admin.statusActive")}
              value={
                row.isActive ? t("admin.statusActive") : t("admin.statusInactive")
              }
            />
          </div>
        )}
        successKey={classTemplate.section.successKey}
        titleKey={classTemplate.section.titleKey}
        uploadTitleKey={classTemplate.section.uploadTitleKey}
        validRowsTitleKey={classTemplate.section.validRowsTitleKey}
        {...classImport}
      />

      <ImportSection
        confirmKey={studentTemplate.section.confirmKey}
        descriptionKey={studentTemplate.section.descriptionKey}
        errorKey={studentTemplate.section.errorKey}
        expectedColumnsKey={studentTemplate.expectedColumnsKey}
        eyebrowKey={studentTemplate.section.eyebrowKey}
        importingKey={studentTemplate.section.importingKey}
        templateActions={[studentTemplateAction]}
        previewTitleKey={studentTemplate.section.previewTitleKey}
        renderPreviewRow={(row) => (
          <div className="grid gap-3 md:grid-cols-5">
            <PreviewCell
              label={t("admin.importRow")}
              value={String(row.rowNumber)}
            />
            <PreviewCell
              label={t("admin.studentSchoolNumber")}
              value={row.schoolNumber}
            />
            <PreviewCell label={t("admin.studentFullName")} value={row.fullName} />
            <PreviewCell label={t("dashboard.className")} value={row.className} />
            <PreviewCell
              label={t("admin.statusActive")}
              value={
                row.isActive ? t("admin.statusActive") : t("admin.statusInactive")
              }
            />
          </div>
        )}
        successKey={studentTemplate.section.successKey}
        titleKey={studentTemplate.section.titleKey}
        uploadTitleKey={studentTemplate.section.uploadTitleKey}
        validRowsTitleKey={studentTemplate.section.validRowsTitleKey}
        {...studentImport}
      />

      <ImportSection
        confirmKey={assignmentTemplate.section.confirmKey}
        descriptionKey={assignmentTemplate.section.descriptionKey}
        errorKey={assignmentTemplate.section.errorKey}
        expectedColumnsKey={assignmentTemplate.expectedColumnsKey}
        eyebrowKey={assignmentTemplate.section.eyebrowKey}
        importingKey={assignmentTemplate.section.importingKey}
        templateActions={[assignmentTemplateAction]}
        previewTitleKey={assignmentTemplate.section.previewTitleKey}
        renderPreviewRow={(row) => (
          <div className="grid gap-3 md:grid-cols-5">
            <PreviewCell
              label={t("admin.importRow")}
              value={String(row.rowNumber)}
            />
            <PreviewCell label={t("admin.className")} value={row.className} />
            <PreviewCell
              label={t("admin.importAssignmentTeacherName")}
              value={row.teacherName}
            />
            <PreviewCell
              label={t("admin.assignmentSubject")}
              value={row.resolvedSubject || t("admin.masterDataMissingValue")}
            />
            <PreviewCell
              label={t("admin.statusActive")}
              value={
                row.isActive ? t("admin.statusActive") : t("admin.statusInactive")
              }
            />
          </div>
        )}
        successKey={assignmentTemplate.section.successKey}
        titleKey={assignmentTemplate.section.titleKey}
        uploadTitleKey={assignmentTemplate.section.uploadTitleKey}
        validRowsTitleKey={assignmentTemplate.section.validRowsTitleKey}
        {...assignmentImport}
      />
    </div>
  );
}

function validateTeacherRows(rawRows: Record<string, unknown>[]) {
  const seenNames = new Set<string>();

  return rawRows.map((row, index) => {
    const fullName = String(row.fullName ?? "").trim();
    const normalizedName = fullName.toLocaleLowerCase("tr");
    const errors: TranslationKey[] = [];
    const warnings: TranslationKey[] = [];

    if (!fullName) {
      errors.push("admin.importErrorFullNameRequired");
    }

    if (normalizedName && seenNames.has(normalizedName)) {
      warnings.push("admin.importWarningDuplicateFullName");
    }

    if (normalizedName) {
      seenNames.add(normalizedName);
    }

    return {
      defaultSubject: String(row.defaultSubject ?? "").trim(),
      errors,
      fullName,
      isActive: parseIsActive(row.isActive),
      rowNumber: index + 2,
      warnings,
    };
  });
}

function validateClassRows(
  rawRows: Record<string, unknown>[],
  teachers: Teacher[],
) {
  const seenNames = new Set<string>();
  const teacherIdByName = new Map(
    teachers.map((teacher) => [
      teacher.name.trim().toLocaleLowerCase("tr"),
      teacher.id,
    ]),
  );

  return rawRows.map((row, index) => {
    const className = String(row.className ?? "").trim();
    const grade = String(row.grade ?? "").trim();
    const classTeacher = String(row.classTeacher ?? "").trim();
    const normalizedName = className.toLocaleLowerCase("tr");
    const errors: TranslationKey[] = [];
    const warnings: TranslationKey[] = [];
    const classTeacherId = classTeacher
      ? teacherIdByName.get(classTeacher.toLocaleLowerCase("tr")) ?? null
      : null;

    if (!className) {
      errors.push("admin.importClassErrorNameRequired");
    }

    if (!grade) {
      errors.push("admin.importClassErrorGradeRequired");
    }

    if (normalizedName && seenNames.has(normalizedName)) {
      warnings.push("admin.importClassWarningDuplicateName");
    }

    if (classTeacher && !classTeacherId) {
      warnings.push("admin.importClassWarningTeacherNotFound");
    }

    if (normalizedName) {
      seenNames.add(normalizedName);
    }

    return {
      className,
      classTeacher,
      classTeacherId,
      errors,
      grade,
      isActive: parseIsActive(row.isActive),
      rowNumber: index + 2,
      warnings,
    };
  });
}

function validateStudentRows(
  rawRows: Record<string, unknown>[],
  classes: SchoolClass[],
) {
  const seenSchoolNumbers = new Set<string>();
  const classIdByName = new Map(
    classes.map((schoolClass) => [
      schoolClass.name.trim().toLocaleLowerCase("tr"),
      schoolClass.id,
    ]),
  );

  return rawRows.map((row, index) => {
    const schoolNumber = String(row.schoolNumber ?? "").trim();
    const fullName = String(row.fullName ?? "").trim();
    const className = String(row.className ?? "").trim();
    const errors: TranslationKey[] = [];
    const warnings: TranslationKey[] = [];
    const classId = className
      ? classIdByName.get(className.toLocaleLowerCase("tr")) ?? ""
      : "";

    if (!schoolNumber) {
      errors.push("admin.importStudentErrorSchoolNumberRequired");
    }

    if (!fullName) {
      errors.push("admin.importStudentErrorFullNameRequired");
    }

    if (!className) {
      errors.push("admin.importStudentErrorClassNameRequired");
    }

    if (className && !classId) {
      errors.push("admin.importStudentErrorClassNotFound");
    }

    if (schoolNumber && seenSchoolNumbers.has(schoolNumber)) {
      warnings.push("admin.importStudentWarningDuplicateSchoolNumber");
    }

    if (schoolNumber) {
      seenSchoolNumbers.add(schoolNumber);
    }

    return {
      classId,
      className,
      errors,
      fullName,
      isActive: parseIsActive(row.isActive),
      rowNumber: index + 2,
      schoolNumber,
      warnings,
    };
  });
}

function validateAssignmentRows(
  rawRows: Record<string, unknown>[],
  classes: SchoolClass[],
  teachers: Teacher[],
) {
  const seenKeys = new Set<string>();
  const classByName = new Map(
    classes.map((schoolClass) => [
      schoolClass.name.trim().toLocaleLowerCase("tr"),
      schoolClass,
    ]),
  );
  const teacherByName = new Map(
    teachers.map((teacher) => [
      teacher.name.trim().toLocaleLowerCase("tr"),
      teacher,
    ]),
  );

  return rawRows.map((row, index) => {
    const className = String(row.className ?? "").trim();
    const teacherName = String(row.teacherName ?? "").trim();
    const subject = String(row.subject ?? "").trim();
    const errors: TranslationKey[] = [];
    const warnings: TranslationKey[] = [];
    const schoolClass = className
      ? classByName.get(className.toLocaleLowerCase("tr")) ?? null
      : null;
    const teacher = teacherName
      ? teacherByName.get(teacherName.toLocaleLowerCase("tr")) ?? null
      : null;
    const isActive = parseIsActive(row.isActive);
    const resolvedSubject = subject || teacher?.subject?.trim() || "";
    const subjectOverride = subject || null;

    if (!className) {
      errors.push("admin.importAssignmentErrorClassNameRequired");
    }

    if (!teacherName) {
      errors.push("admin.importAssignmentErrorTeacherNameRequired");
    }

    if (!subject && teacher && !teacher.subject.trim()) {
      errors.push("admin.importAssignmentErrorSubjectMissing");
    }

    if (className && !schoolClass) {
      errors.push("admin.importAssignmentErrorClassNotFound");
    }

    if (teacherName && !teacher) {
      errors.push("admin.importAssignmentErrorTeacherNotFound");
    }

    const assignmentKey = [
      schoolClass?.id ?? className.toLocaleLowerCase("tr"),
      teacher?.id ?? teacherName.toLocaleLowerCase("tr"),
      resolvedSubject.toLocaleLowerCase("tr"),
    ].join("|");

    if (assignmentKey && seenKeys.has(assignmentKey)) {
      warnings.push("admin.importAssignmentWarningDuplicateRow");
    }

    if (assignmentKey) {
      seenKeys.add(assignmentKey);
    }

    return {
      assignmentKey,
      classId: schoolClass?.id ?? "",
      className,
      errors,
      isActive,
      resolvedSubject,
      rowNumber: index + 2,
      subject,
      subjectOverride,
      teacherId: teacher?.id ?? "",
      teacherName,
      warnings,
    };
  });
}
