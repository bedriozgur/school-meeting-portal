import { VersionBadge } from "./VersionBadge";

type PageVersionFooterProps = {
  className?: string;
};

export function PageVersionFooter({ className = "" }: PageVersionFooterProps) {
  return (
    <footer className={`pb-1 text-center print:hidden ${className}`}>
      <VersionBadge compact />
    </footer>
  );
}
