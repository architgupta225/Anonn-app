import { Badge } from "@/components/ui/badge";
import { getKarmaLevel } from "@shared/schema";

interface KarmaBadgeProps {
  karma: number;
  className?: string;
}

export default function KarmaBadge({ karma, className = "" }: KarmaBadgeProps) {
  const { level, name, color } = getKarmaLevel(karma);
  
  return (
    <Badge 
      variant="outline" 
      className={`${color} border-current text-xs font-medium ${className}`}
    >
      L{level} {name}
    </Badge>
  );
}