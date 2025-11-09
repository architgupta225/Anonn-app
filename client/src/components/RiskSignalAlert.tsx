import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface RiskSignalAlertProps {
  riskSignal: {
    hasRisk: boolean;
    negativePercentageLast30Days: number;
  };
}

export default function RiskSignalAlert({ riskSignal }: RiskSignalAlertProps) {
  if (!riskSignal.hasRisk) return null;

  return (
    <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-red-800 dark:text-red-300">🔥 Risk Signal Detected</AlertTitle>
      <AlertDescription className="text-red-700 dark:text-red-300">
        <strong>{riskSignal.negativePercentageLast30Days}%</strong> of reviews in the last 30 days have been negative, 
        which exceeds the 40% risk threshold. This organization may be experiencing significant issues.
      </AlertDescription>
    </Alert>
  );
}