import type { TranslationKey } from "../../i18n/i18n";
import { downloadCsvTemplate } from "./csvTemplate";

export type ImportTemplateId =
  | "teachers"
  | "classes"
  | "students"
  | "assignments";

export type ImportTemplateConfig = {
  id: ImportTemplateId;
  expectedColumnsKey: TranslationKey;
  exampleRow: Record<string, string>;
  filename: string;
  labelKey: TranslationKey;
  headers: string[];
  section: {
    confirmKey: TranslationKey;
    descriptionKey: TranslationKey;
    errorKey: TranslationKey;
    importingKey: TranslationKey;
    previewTitleKey: TranslationKey;
    successKey: TranslationKey;
    titleKey: TranslationKey;
    uploadTitleKey: TranslationKey;
    validRowsTitleKey: TranslationKey;
    eyebrowKey?: TranslationKey;
  };
};

export const importTemplateConfigs: Record<ImportTemplateId, ImportTemplateConfig> = {
  teachers: {
    id: "teachers",
    expectedColumnsKey: "admin.importExpectedColumns",
    exampleRow: {
      fullName: "Ayşe Demir",
      defaultSubject: "Türkçe",
      isActive: "true",
    },
    filename: "teacher-import-template.csv",
    headers: ["fullName", "defaultSubject", "isActive"],
    labelKey: "admin.importTeacherTemplateDownload",
    section: {
      confirmKey: "admin.importConfirm",
      descriptionKey: "admin.importTeachersDescription",
      errorKey: "admin.importError",
      importingKey: "admin.importImporting",
      previewTitleKey: "admin.importPreviewTitle",
      successKey: "admin.importSuccess",
      titleKey: "admin.importTeachersTitle",
      uploadTitleKey: "admin.importUploadTitle",
      validRowsTitleKey: "admin.importValidRowsTitle",
    },
  },
  classes: {
    id: "classes",
    expectedColumnsKey: "admin.importClassExpectedColumns",
    exampleRow: {
      className: "7-B",
      grade: "7",
      classTeacher: "Ayşe Demir",
      isActive: "true",
    },
    filename: "class-import-template.csv",
    headers: ["className", "grade", "classTeacher", "isActive"],
    labelKey: "admin.importClassTemplateDownload",
    section: {
      confirmKey: "admin.importClassConfirm",
      descriptionKey: "admin.importClassesDescription",
      errorKey: "admin.importClassError",
      eyebrowKey: "admin.importClassesEyebrow",
      importingKey: "admin.importClassImporting",
      previewTitleKey: "admin.importClassPreviewTitle",
      successKey: "admin.importClassSuccess",
      titleKey: "admin.importClassesTitle",
      uploadTitleKey: "admin.importClassUploadTitle",
      validRowsTitleKey: "admin.importClassValidRowsTitle",
    },
  },
  students: {
    id: "students",
    expectedColumnsKey: "admin.importStudentExpectedColumns",
    exampleRow: {
      schoolNumber: "2458",
      fullName: "Ada Yıldırım",
      className: "7-B",
      isActive: "true",
    },
    filename: "student-import-template.csv",
    headers: ["schoolNumber", "fullName", "className", "isActive"],
    labelKey: "admin.importStudentTemplateDownload",
    section: {
      confirmKey: "admin.importStudentConfirm",
      descriptionKey: "admin.importStudentsDescription",
      errorKey: "admin.importStudentError",
      eyebrowKey: "admin.importStudentsEyebrow",
      importingKey: "admin.importStudentImporting",
      previewTitleKey: "admin.importStudentPreviewTitle",
      successKey: "admin.importStudentSuccess",
      titleKey: "admin.importStudentsTitle",
      uploadTitleKey: "admin.importStudentUploadTitle",
      validRowsTitleKey: "admin.importStudentValidRowsTitle",
    },
  },
  assignments: {
    id: "assignments",
    expectedColumnsKey: "admin.importAssignmentExpectedColumns",
    exampleRow: {
      eventCode: "BAHAR2026",
      className: "7-B",
      teacherName: "Ayşe Demir",
      subject: "Türkçe",
      building: "A",
      floor: "1",
      classroom: "A-104",
      isAvailable: "true",
    },
    filename: "assignment-import-template.csv",
    headers: [
      "eventCode",
      "className",
      "teacherName",
      "subject",
      "building",
      "floor",
      "classroom",
      "isAvailable",
    ],
    labelKey: "admin.importAssignmentTemplateDownload",
    section: {
      confirmKey: "admin.importAssignmentConfirm",
      descriptionKey: "admin.importAssignmentsDescription",
      errorKey: "admin.importAssignmentError",
      eyebrowKey: "admin.importAssignmentsEyebrow",
      importingKey: "admin.importAssignmentImporting",
      previewTitleKey: "admin.importAssignmentPreviewTitle",
      successKey: "admin.importAssignmentSuccess",
      titleKey: "admin.importAssignmentsTitle",
      uploadTitleKey: "admin.importAssignmentUploadTitle",
      validRowsTitleKey: "admin.importAssignmentValidRowsTitle",
    },
  },
};

export function buildTemplateDownloadAction(templateId: ImportTemplateId) {
  const template = importTemplateConfigs[templateId];

  return {
    labelKey: template.labelKey,
    onDownload: () =>
      downloadCsvTemplate({
        filename: template.filename,
        headers: template.headers,
        exampleRow: template.exampleRow,
      }),
  };
}
