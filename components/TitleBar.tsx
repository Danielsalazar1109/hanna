
interface TitleBarProps {
    title: string;
    subtitle: string;
    logoSrc: string;
    logoAlt?: string;
}

import Image from "next/image";


export function TitleBar({
  title,
  subtitle,
  logoSrc,
  logoAlt = "",
}: TitleBarProps) {
  return (
    <div className="flex items-center gap-4 py-3">
      
      {/* Icon */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50">
        <Image
          src={logoSrc}
          alt={logoAlt}
          width={50}
          height={50}
        />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="text-md font-bold text-blue-600 text-left">
          {title}
        </div>

        <div className="mt-1 text-sm leading-4 text-zinc-600 text-left">
          {subtitle}
        </div>
      </div>

    </div>
  );
}