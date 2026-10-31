const scope = self as unknown as {
  onmessage: ((event: MessageEvent<string>) => void) | null;
  postMessage: (message: ArrayBuffer, transfer: Transferable[]) => void;
};
scope.onmessage = (event) => {
  const binary = atob(event.data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  scope.postMessage(bytes.buffer, [bytes.buffer]);
};
