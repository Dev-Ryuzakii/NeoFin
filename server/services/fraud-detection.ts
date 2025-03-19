import { Transaction, User } from '@shared/schema';
import { getWebSocketService } from './websocket';

export class FraudDetectionService {
  static async analyzeTansaction(transaction: Transaction, user: User) {
    const suspiciousFactors = [];
    
    // Check for unusual amount
    if (parseFloat(transaction.amount) > 1000000) { // Over 1M naira
      suspiciousFactors.push('Unusually large transaction amount');
    }

    // Check for rapid succession transactions
    // This is a simple implementation - in production, you'd want more sophisticated rules
    const timeWindow = new Date();
    timeWindow.setHours(timeWindow.getHours() - 1);

    // Check for multiple high-value transactions in short time
    // In a real implementation, you'd query recent transactions from the database
    if (parseFloat(transaction.amount) > 100000) { // Over 100k naira
      suspiciousFactors.push('Multiple high-value transactions in short time');
    }

    // If suspicious factors found, send alert
    if (suspiciousFactors.length > 0) {
      const ws = getWebSocketService();
      ws.sendNotification(user.id, {
        type: 'fraud_alert',
        title: 'Suspicious Activity Detected',
        message: `Potential fraud detected: ${suspiciousFactors.join(', ')}`,
        timestamp: new Date().toISOString(),
      });

      return {
        isSuspicious: true,
        factors: suspiciousFactors,
      };
    }

    return {
      isSuspicious: false,
      factors: [],
    };
  }
}
