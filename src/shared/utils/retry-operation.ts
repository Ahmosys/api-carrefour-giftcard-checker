export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 200),
      );
    }
  }
  throw lastError;
}
