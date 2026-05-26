import { translate } from "../i18n/i18n";
import { useSessionStore } from "../store/sessionStore";

export function useT() {
  const language = useSessionStore((state) => state.language);

  return {
    language,
    t: (key: Parameters<typeof translate>[1]) => translate(language, key),
  };
}
