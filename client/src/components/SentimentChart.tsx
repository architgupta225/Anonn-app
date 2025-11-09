import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface SentimentChartProps {
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export default function SentimentChart({ sentimentBreakdown }: SentimentChartProps) {
  const total = sentimentBreakdown.positive + sentimentBreakdown.neutral + sentimentBreakdown.negative;
  
  if (total === 0) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Sentiment Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center text-gray-500 dark:text-gray-400">
            No reviews to analyze yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const data = [
    {
      name: 'Positive',
      value: sentimentBreakdown.positive,
      percentage: Math.round((sentimentBreakdown.positive / total) * 100),
      color: '#10b981'
    },
    {
      name: 'Neutral',
      value: sentimentBreakdown.neutral,
      percentage: Math.round((sentimentBreakdown.neutral / total) * 100),
      color: '#f59e0b'
    },
    {
      name: 'Negative',
      value: sentimentBreakdown.negative,
      percentage: Math.round((sentimentBreakdown.negative / total) * 100),
      color: '#ef4444'
    }
  ].filter(item => item.value > 0);

  return (
    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Sentiment Breakdown</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percentage }) => `${name} ${percentage}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value} reviews (${data.find(d => d.name === name)?.percentage}%)`,
                  name
                ]}
                contentStyle={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend with percentages */}
        <div className="mt-4 space-y-2">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">{item.name}</span>
              </div>
              <span className="text-sm font-medium">
                {item.value} ({item.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}