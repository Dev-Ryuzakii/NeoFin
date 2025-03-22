declare module '@paystack/paystack-sdk' {
  export default class Paystack {
    constructor(secretKey: string);
    transaction: {
      initialize(params: {
        amount: number;
        email: string;
        metadata?: any;
      }): Promise<{ data: any }>;
      verify(reference: string): Promise<{ data: any }>;
    };
  }
} 