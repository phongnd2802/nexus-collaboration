import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
  authorization: string;
  workspaceId?: string;
  requestId: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export const withRequestContext = <T>(context: RequestContext, callback: () => Promise<T>): Promise<T> => {
  return storage.run(context, callback);
};

export const getRequestContext = (): RequestContext => {
  const context = storage.getStore();
  if (!context) {
    throw new Error("Request context is not available");
  }

  return context;
};
