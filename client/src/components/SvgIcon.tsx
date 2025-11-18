import { useState, useEffect } from "react";

interface SvgIconProps {
  src: string;
  color?: string;
  className?: string;
  alt?: string;
  forceFill?: boolean;
}

export const SvgIcon = ({
  src,
  color,
  className = "",
  alt,
  forceFill = false,
}: SvgIconProps) => {
  const [rawSvg, setRawSvg] = useState<string>("");
  const [svgContent, setSvgContent] = useState<string>("");

  useEffect(() => {
    fetch(src)
      .then((res) => res.text())
      .then(setRawSvg)
      .catch((err) => console.error(`Failed to load SVG: ${src}`, err));
  }, [src]);

  useEffect(() => {
    if (!rawSvg) return;

    const coloredSvg = forceFill
      ? rawSvg
          .replace(/fill="[^"]*"/g, 'fill="currentColor"')
          .replace(/stroke="[^"]*"/g, 'stroke="currentColor"')
          .replace(/fill='[^']*'/g, "fill='currentColor'")
          .replace(/stroke='[^']*'/g, "stroke='currentColor'")
      : rawSvg
          .replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"')
          .replace(/stroke="[^"]*"/g, 'stroke="currentColor"')
          .replace(/fill='(?!none)[^']*'/g, "fill='currentColor'")
          .replace(/stroke='[^']*'/g, "stroke='currentColor'");

    setSvgContent(coloredSvg);
  }, [rawSvg, forceFill]);

  if (!svgContent) return null;

  return (
    <div
      className={`flex-shrink-0 ${color || ""} ${className}`}
      dangerouslySetInnerHTML={{ __html: svgContent }}
      aria-label={alt}
    />
  );
};

