import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, AlertTriangle } from 'lucide-react';

type Insights = {
  insights: {
    monthlyLimit: number;
    remainingBudget: number;
    spendingByCategory: Record<string, number>;
  };
  trends: {
    trend: Array<{
      date: string;
      amount: number;
    }>;
  };
};

export default function FinancialInsights() {
  const { data: insights, isLoading } = useQuery<Insights>({
    queryKey: ['/api/insights'],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!insights) return null;

  const { monthlyLimit, remainingBudget, spendingByCategory } = insights.insights;
  const spentPercentage = ((monthlyLimit - remainingBudget) / monthlyLimit) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Financial Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">Monthly Budget</h4>
            <Progress value={spentPercentage} className="h-2" />
            <div className="flex justify-between mt-2">
              <p className="text-sm text-muted-foreground">
                ₦{remainingBudget.toFixed(2)} remaining
              </p>
              <p className="text-sm text-muted-foreground">
                ₦{monthlyLimit.toFixed(2)} limit
              </p>
            </div>
            {spentPercentage > 70 && (
              <div className="flex items-center gap-2 mt-2 text-warning">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm">Approaching budget limit</p>
              </div>
            )}
          </div>

          <div>
            <h4 className="font-medium mb-2">Spending by Category</h4>
            <div className="space-y-2">
              {Object.entries(spendingByCategory).map(([category, amount]) => (
                <div key={category} className="flex justify-between">
                  <p className="text-sm capitalize">{category.replace('_', ' ')}</p>
                  <p className="text-sm">₦{amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {insights.trends && (
            <div>
              <h4 className="font-medium mb-2">Recent Spending Trend</h4>
              <div className="space-y-2">
                {insights.trends.trend.slice(-5).map((day) => (
                  <div key={day.date} className="flex justify-between">
                    <p className="text-sm">
                      {new Date(day.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm">₦{day.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}