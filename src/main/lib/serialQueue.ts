export type SerialQueue = {
  run(task: () => Promise<void>): void;
  drain(): Promise<void>;
};

export function createSerialQueue(onError: (error: Error) => void): SerialQueue {
  let tail: Promise<void> = Promise.resolve();
  return {
    run(task) {
      tail = tail.then(task).catch((err: unknown) => onError(err instanceof Error ? err : new Error(String(err))));
    },
    drain: () => tail,
  };
}
