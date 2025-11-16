import { useState, useEffect } from "react";

interface SvgIconProps {
  src: string;
  color?: string;
  className?: string;
  alt?: string;
}

export const SvgIcon = ({ 
  src, 
  color, 
  className = "",
  alt 
}: SvgIconProps) => {
  const [svgContent, setSvgContent] = useState<string>("");
  
  useEffect(() => {
    fetch(src)
      .then(res => res.text())
      .then(svg => {
        const coloredSvg = svg
          .replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"')
          .replace(/stroke="[^"]*"/g, 'stroke="currentColor"')
          .replace(/fill='(?!none)[^']*'/g, "fill='currentColor'")
          .replace(/stroke='[^']*'/g, "stroke='currentColor'");
        setSvgContent(coloredSvg);
      })
      .catch(err => console.error(`Failed to load SVG: ${src}`, err));
  }, [src]);
  
  if (!svgContent) return null;
  
  return (
    <div 
      className={`flex-shrink-0 ${color || ''} ${className}`}
      dangerouslySetInnerHTML={{ __html: svgContent }}
      aria-label={alt}
    />
  );
};

