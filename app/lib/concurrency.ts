// Runs `fn` over `items` with at most `limit` running at once. Converting several
// HEIC photos at the same time (WASM decode, one per file) can exhaust the browser's
// memory and make individual conversions fail — this keeps only a few in flight.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const i = next++
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i], i) }
      } catch (error) {
        results[i] = { status: 'rejected', reason: error }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
