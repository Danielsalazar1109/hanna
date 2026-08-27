import Image from "next/image";

export type TitleBarProps = {
  title: string;
  subtitle: string;
  logoSrc: string;
  logoAlt?: string;
  logoSize?: number;
  className?: string;
};

export function TitleBar({
  title,
  subtitle,
  logoSrc,
  logoAlt = "",
  logoSize = 128,
  className = "",
}: TitleBarProps) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`.trim()}>
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src={logoSrc}
          alt={logoAlt}
          width={logoSize}
          height={logoSize}
          className="shrink-0"
        />
      </div>

      <div className="shrink-0 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        <div className="truncate text-lg font-semibold text-blue-600 dark:text-blue-400">
            {title}
          </div>
        {subtitle}
      </div>
    </div>
  );
}
