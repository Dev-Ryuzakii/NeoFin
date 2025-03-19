import { ExternalTransfer, User, ExternalBank } from '@shared/schema';
import { getWebSocketService } from './websocket';
import { FraudDetectionService } from './fraud-detection';

export class ExternalTransferService {
  private static readonly SUPPORTED_BANKS: ExternalBank[] = [
    { id: 1, bankName: 'GTBank', bankCode: '058', createdAt: new Date() },
    { id: 2, bankName: 'OPay', bankCode: '100', createdAt: new Date() },
    { id: 3, bankName: 'Kuda Bank', bankCode: '090267', createdAt: new Date() },
    { id: 4, bankName: 'Palmpay', bankCode: '100033', createdAt: new Date() },
  ];

  static getSupportedBanks(): ExternalBank[] {
    return this.SUPPORTED_BANKS;
  }

  static validateBankAccount(bankCode: string, accountNumber: string): Promise<boolean> {
    // In a real implementation, this would validate against the bank's API
    console.log(`Validating account: ${accountNumber} with bank code: ${bankCode}`);
    return Promise.resolve(true); // Mock validation
  }

  static async initiateTransfer(
    user: User,
    bankId: number,
    recipientAccount: string,
    recipientName: string,
    amount: number
  ): Promise<ExternalTransfer> {
    console.log(`Initiating external transfer for user ${user.id}`);

    const bank = this.SUPPORTED_BANKS.find(b => b.id === bankId);
    if (!bank) {
      throw new Error('Invalid bank selected');
    }

    // Validate account number
    const isValid = await this.validateBankAccount(bank.bankCode, recipientAccount);
    if (!isValid) {
      throw new Error('Invalid recipient account number');
    }

    // Generate a unique reference
    const reference = `ET${Date.now()}${Math.floor(Math.random() * 1000000)}`;

    const transfer = {
      userId: user.id,
      bankId,
      recipientName,
      recipientAccount,
      amount,
      status: 'pending',
      reference,
      createdAt: new Date(),
    } as ExternalTransfer;

    // Check for potential fraud
    const fraudCheck = await FraudDetectionService.analyzeExternalTransfer(transfer, user);
    if (fraudCheck.isSuspicious) {
      const ws = getWebSocketService();
      ws.sendNotification(user.id, {
        type: 'fraud_alert',
        title: 'Suspicious Transfer Detected',
        message: `Your transfer of ${amount} NGN to ${recipientName} has triggered our fraud detection system.`,
      });
    }

    return transfer;
  }
}
