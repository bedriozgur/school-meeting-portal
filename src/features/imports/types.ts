import type { TranslationKey } from "../../i18n/i18n";

export type ImportStatus =
  | "idle"
  | "parsing"
  | "ready"
  | "importing"
  | "success"
  | "error";

export type ImportResult = {
  created: number;
  updated: number;
};

export type ImportRowBase = {
  rowNumber: number;
  errors: TranslationKey[];
  warnings: TranslationKey[];
};

export type ImportValidationGroups<Row extends ImportRowBase> = {
  validRows: Row[];
  invalidRows: Row[];
  warningRows: Row[];
};
