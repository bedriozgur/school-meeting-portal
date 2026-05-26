import { useT } from "../hooks/useT";

type AdminPlaceholderPageProps = {
  titleKey:
    | "admin.nav.students"
    | "admin.nav.teachers"
    | "admin.nav.classes"
    | "admin.nav.import"
    | "admin.nav.qr"
    | "admin.nav.staff";
};

export function AdminPlaceholderPage({ titleKey }: AdminPlaceholderPageProps) {
  const { t } = useT();

  return (
    <div className="surface space-y-4 p-6 sm:p-8">
      <p className="label">{t("admin.placeholderEyebrow")}</p>
      <h1 className="heading font-display text-4xl font-black">
        {t(titleKey)}
      </h1>
      <p className="copy text-base font-semibold leading-7">
        {t("admin.placeholderDescription")}
      </p>
    </div>
  );
}
