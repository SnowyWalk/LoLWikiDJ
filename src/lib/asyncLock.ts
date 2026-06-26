const locks = new Map<string, Promise<void>>();

export async function withAsyncLock<T>(key: string, action: () => Promise<T>) {
  const previous = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.then(() => current);
  locks.set(key, chained);

  await previous;
  try {
    return await action();
  } finally {
    release();
    if (locks.get(key) === chained) {
      locks.delete(key);
    }
  }
}
