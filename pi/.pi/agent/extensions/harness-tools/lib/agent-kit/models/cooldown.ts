export const PROVIDER_COOLDOWN_MS = 5 * 60_000;

export class ProviderCooldown {
  private failedAt = new Map<string, number>();

  constructor(
    private ttlMs: number = PROVIDER_COOLDOWN_MS,
    private now: () => number = () => Date.now(),
  ) {}

  record(provider: string): void {
    this.failedAt.set(provider, this.now());
  }

  isCooled(provider: string): boolean {
    const at = this.failedAt.get(provider);
    if (at === undefined) return false;
    if (this.now() - at >= this.ttlMs) {
      this.failedAt.delete(provider);
      return false;
    }
    return true;
  }

  clear(): void {
    this.failedAt.clear();
  }
}

export const providerCooldown = new ProviderCooldown();
