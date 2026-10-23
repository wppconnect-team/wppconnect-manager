export function decodeBase64(base64: string, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./base64.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      worker.terminate();
      resolve(new Blob([event.data], { type }));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(event.error ?? new Error(event.message || "Media decode failed"));
    };
    worker.postMessage(base64);
  });
}
