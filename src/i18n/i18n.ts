import en from "./en.json";
import tr from "./tr.json";

export type Language = "tr" | "en";
export type TranslationKey = keyof typeof tr;

const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  tr,
  en,
};

export function translate(language: Language, key: TranslationKey): string {
  return dictionaries[language][key] ?? dictionaries.tr[key] ?? key;
}

export const languages: Language[] = ["tr", "en"];
