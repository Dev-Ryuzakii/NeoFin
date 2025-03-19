import Paystack from "@paystack/paystack-sdk";

if (!process.env.PAYSTACK_SECRET_KEY) {
  throw new Error("Missing Paystack secret key");
}

const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY);

export class PaystackService {
  static async initializePayment(amount: number, email: string, metadata: any = {}) {
    try {
      const response = await paystack.transaction.initialize({
        amount: Math.round(amount * 100), // Convert to kobo
        email,
        metadata,
      });

      return response.data;
    } catch (error) {
      console.error("Paystack payment initialization error:", error);
      throw new Error("Failed to initialize payment");
    }
  }

  static async verifyPayment(reference: string) {
    try {
      const response = await paystack.transaction.verify(reference);
      return response.data;
    } catch (error) {
      console.error("Paystack payment verification error:", error);
      throw new Error("Failed to verify payment");
    }
  }

  static async purchaseAirtime(phone: string, amount: number, provider: string) {
    // Note: This is a placeholder. You'll need to implement the actual airtime purchase
    // using Paystack's APIs or another provider that supports airtime purchases
    throw new Error("Airtime purchase not implemented");
  }

  static async payBill(billType: string, billNumber: string, amount: number, provider: string) {
    // Note: This is a placeholder. You'll need to implement the actual bill payment
    // using Paystack's APIs or another provider that supports bill payments
    throw new Error("Bill payment not implemented");
  }
}