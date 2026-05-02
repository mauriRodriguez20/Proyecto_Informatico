import { Agent } from "undici";

const keepAliveAgent = new Agent({
  connections: 50,
  pipelining: 1,
  keepAliveTimeout: 30_000,
  keepAliveMaxTimeout: 120_000,
});

type RequestInitWithDispatcher = RequestInit & {
  dispatcher?: unknown;
};

export function fetchWithKeepAlive(
  input: string | URL | Request,
  init: RequestInit = {}
) {
  return fetch(input, {
    ...init,
    dispatcher: keepAliveAgent,
  } as RequestInitWithDispatcher);
}
