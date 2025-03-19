import { VirtualCard, User } from '@shared/schema';
import { getWebSocketService } from './websocket';

export class VirtualCardService {
  private static readonly BIN = '506099'; // Example BIN (Bank Identification Number)

  static generateCardNumber(): string {
    // Generate a random 10-digit number (excluding the BIN)
    const randomPart = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    return this.BIN + randomPart;
  }

  static generateCVV(): string {
    return Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  }

  static generateExpiryDate(): { month: string; year: string } {
    const now = new Date();
    const expiryDate = new Date(now.setFullYear(now.getFullYear() + 3)); // 3 years validity
    return {
      month: (expiryDate.getMonth() + 1).toString().padStart(2, '0'),
      year: expiryDate.getFullYear().toString().slice(-2),
    };
  }

  static async createVirtualCard(user: User): Promise<VirtualCard> {
    console.log(`Creating virtual card for user ${user.id}`);
    
    const cardNumber = this.generateCardNumber();
    const { month, year } = this.generateExpiryDate();
    const cvv = this.generateCVV();

    const virtualCard = {
      userId: user.id,
      cardNumber,
      expiryMonth: month,
      expiryYear: year,
      cvv,
      status: 'active',
      createdAt: new Date(),
    } as VirtualCard;

    // Notify user about card creation
    const ws = getWebSocketService();
    ws.sendNotification(user.id, {
      type: 'virtual_card',
      title: 'Virtual Card Created',
      message: 'Your virtual card has been created successfully.',
    });

    return virtualCard;
  }

  static maskCardNumber(cardNumber: string): string {
    return `${cardNumber.slice(0, 6)}${'*'.repeat(6)}${cardNumber.slice(-4)}`;
  }
}
