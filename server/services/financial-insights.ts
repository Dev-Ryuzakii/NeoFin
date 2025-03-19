import { Transaction, User } from '@shared/schema';
import { getWebSocketService } from './websocket';

export class FinancialInsightsService {
  static async analyzeTransactions(user: User, transactions: Transaction[]) {
    console.log(`Analyzing transactions for user ${user.id}`);
    // Calculate spending patterns
    const spending = transactions.reduce((acc, transaction) => {
      if (transaction.fromUserId === user.id) {
        const amount = parseFloat(transaction.amount);
        acc.total += amount;

        // Group by transaction type
        acc.byType[transaction.type] = (acc.byType[transaction.type] || 0) + amount;
      }
      return acc;
    }, { total: 0, byType: {} as Record<string, number> });

    // Calculate monthly budget
    const monthlyLimit = parseFloat(user.balance) * 0.7; // 70% of current balance
    if (spending.total > monthlyLimit) {
      console.log(`Budget alert triggered for user ${user.id}`);
      const ws = getWebSocketService();
      ws.sendNotification(user.id, {
        type: 'budget_alert',
        title: 'Budget Alert',
        message: `You've exceeded 70% of your monthly budget limit`,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`Financial analysis completed for user ${user.id}`);
    return {
      insights: {
        spending,
        monthlyLimit,
        remainingBudget: monthlyLimit - spending.total,
        spendingByCategory: spending.byType,
      },
      trends: {
        trend: this.getSpendingTrends(transactions).trend
      }
    };
  }

  static getSpendingTrends(transactions: Transaction[]) {
    console.log(`Calculating spending trends for ${transactions.length} transactions`);
    // Group transactions by date
    const dailySpending = transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.createdAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + parseFloat(transaction.amount);
      return acc;
    }, {} as Record<string, number>);

    return {
      trend: Object.entries(dailySpending).map(([date, amount]) => ({
        date,
        amount,
      })),
    };
  }
}