// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

// Store the captured error on globalThis to survive module reloads (HMR / dev)
// and to avoid leaking a local module-bound variable across multiple imports.

type LastCaptured = { error: unknown; at: number } | undefined;

const GLOBAL_KEY = Symbol.for("journey-planner-plus.lastCapturedError.v1");

function getLastCaptured(): LastCaptured {
  return (globalThis as any)[GLOBAL_KEY] as LastCaptured;
}

function setLastCaptured(value: LastCaptured) {
  (globalThis as any)[GLOBAL_KEY] = value;
}

const TTL_MS = 5_000;

function record(error: unknown) {
  setLastCaptured({ error, at: Date.now() });
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

export function consumeLastCapturedError(): unknown {
  const lastCapturedError = getLastCaptured();
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    setLastCaptured(undefined);
    return undefined;
  }
  const { error } = lastCapturedError;
  setLastCaptured(undefined);
  return error;
}
