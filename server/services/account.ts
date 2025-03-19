import { User } from '@shared/schema';

export class AccountService {
  private static readonly BANK_CODE = '035'; // Example bank code
  private static readonly ACCOUNT_LENGTH = 10;

  static generateAccountNumber(): string {
    // Generate a random 7-digit number (excluding the bank code)
    const randomPart = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    return this.BANK_CODE + randomPart;
  }

  static async assignAccountNumber(user: User): Promise<string> {
    console.log(`Generating account number for user ${user.id}`);
    // Generate a unique account number
    const accountNumber = this.generateAccountNumber();
    console.log(`Generated account number: ${accountNumber}`);
    return accountNumber;
  }

  static validateAccountNumber(accountNumber: string): boolean {
    // Basic validation: check length and format
    if (!accountNumber || accountNumber.length !== this.ACCOUNT_LENGTH) {
      return false;
    }

    // Check if it starts with our bank code
    if (!accountNumber.startsWith(this.BANK_CODE)) {
      return false;
    }

    // Check if it contains only numbers
    return /^\d+$/.test(accountNumber);
  }
}
