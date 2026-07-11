export class Money {
  private constructor(readonly cents: number, readonly currency: string) {}

  static of(amount: number | string, currency: string): Money {
    const normalized = typeof amount === 'string' ? Number(amount) : amount;
    if (!Number.isFinite(normalized) || normalized < 0) {
      throw new Error('Money amount must be a non-negative finite number');
    }
    const cents = Math.round(normalized * 100);
    const cur = (currency ?? 'USD').toUpperCase();
    if (!/^[A-Z]{3}$/.test(cur)) {
      throw new Error('Currency must be an ISO-4217 three-letter code');
    }
    return new Money(cents, cur);
  }

  static fromCents(cents: number, currency: string): Money {
    return new Money(cents, currency.toUpperCase());
  }

  toAmount(): number {
    return this.cents / 100;
  }

  toString(): string {
    return `${this.currency} ${this.toAmount().toFixed(2)}`;
  }
}
