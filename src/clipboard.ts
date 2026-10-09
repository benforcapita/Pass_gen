export class ClipboardTimeoutError extends Error {
  constructor() { super('Clipboard did not confirm the write in time.'); }
}

/** An unresponsive platform clipboard must not leave Copy permanently disabled. */
export async function copyWithTimeout(write: () => Promise<void>, timeoutMs = 5000): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new ClipboardTimeoutError()), timeoutMs);
  });
  try { await Promise.race([write(), timeout]); }
  finally { clearTimeout(timer); }
}
