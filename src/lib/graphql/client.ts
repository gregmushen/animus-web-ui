import { GraphQLClient } from "graphql-request";
import { QueryClient, useQuery as _useQuery, useMutation as _useMutation } from "@tanstack/react-query";
import { createClient as createWSClient } from "graphql-ws";
import { useEffect, useRef, useState } from "react";

// API endpoint resolution (highest precedence wins):
//   1. VITE_ANIMUS_GRAPHQL_URL — compile-time env var, explicit GraphQL HTTP URL
//   2. VITE_ANIMUS_API_ORIGIN — compile-time env var, origin only (/graphql appended)
//   3. window.__ANIMUS_CONFIG__.graphqlUrl — runtime override injected by host page
//   4. window.__ANIMUS_CONFIG__.apiOrigin — runtime override, origin only
//   5. window.location.origin + "/graphql" — same-origin default (embedded plugin mode)
//
// The same order applies to the websocket URL via VITE_ANIMUS_GRAPHQL_WS_URL or
// window.__ANIMUS_CONFIG__.graphqlWsUrl, otherwise it is derived from the HTTP URL.
//
// When the React app is served by the animus-transport-graphql plugin, the same-origin
// default works as-is. When served standalone, point it at the GraphQL transport plugin
// (default localhost:8081) via VITE_* at build time or window.__ANIMUS_CONFIG__ at runtime.

declare global {
  interface Window {
    __ANIMUS_CONFIG__?: {
      graphqlUrl?: string;
      graphqlWsUrl?: string;
      apiOrigin?: string;
    };
  }
}

function resolveGraphQLUrl(): string {
  const runtime = typeof window !== "undefined" ? window.__ANIMUS_CONFIG__ : undefined;
  const envUrl = import.meta.env?.VITE_ANIMUS_GRAPHQL_URL as string | undefined;
  const envOrigin = import.meta.env?.VITE_ANIMUS_API_ORIGIN as string | undefined;
  if (envUrl) return envUrl;
  if (envOrigin) return `${envOrigin.replace(/\/$/, "")}/graphql`;
  if (runtime?.graphqlUrl) return runtime.graphqlUrl;
  if (runtime?.apiOrigin) return `${runtime.apiOrigin.replace(/\/$/, "")}/graphql`;
  if (typeof window !== "undefined") return `${window.location.origin}/graphql`;
  return "http://localhost:8081/graphql";
}

function resolveGraphQLWsUrl(): string {
  const runtime = typeof window !== "undefined" ? window.__ANIMUS_CONFIG__ : undefined;
  const envWsUrl = import.meta.env?.VITE_ANIMUS_GRAPHQL_WS_URL as string | undefined;
  if (envWsUrl) return envWsUrl;
  if (runtime?.graphqlWsUrl) return runtime.graphqlWsUrl;
  const httpUrl = resolveGraphQLUrl();
  try {
    const u = new URL(httpUrl);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = `${u.pathname.replace(/\/$/, "")}/ws`;
    return u.toString();
  } catch {
    if (typeof window !== "undefined") {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProtocol}//${window.location.host}/graphql/ws`;
    }
    return "ws://localhost:8081/graphql/ws";
  }
}

const gql = new GraphQLClient(resolveGraphQLUrl());

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000, refetchOnWindowFocus: true },
  },
});

function gqlRequest<TResult>(doc: unknown, variables?: unknown): Promise<TResult> {
  const query = typeof doc === "string" ? doc : String(doc);
  return gql.request(query, variables as Record<string, unknown> | undefined) as Promise<TResult>;
}

function getOpName(doc: unknown): string {
  const str = typeof doc === "string" ? doc : String(doc);
  const m = str.match(/(?:query|mutation|subscription)\s+(\w+)/);
  return m?.[1] ?? "gql";
}

export function useQuery<TData = any>(opts: {
  query: unknown;
  variables?: Record<string, unknown>;
  pause?: boolean;
}): [{ data: TData | undefined; fetching: boolean; error: { message: string } | undefined }, (...args: any[]) => void] {
  const result = _useQuery<TData>({
    queryKey: [getOpName(opts.query), opts.variables],
    queryFn: () => gqlRequest<TData>(opts.query, opts.variables),
    enabled: !opts.pause,
  });

  return [
    {
      data: result.data,
      fetching: result.isLoading,
      error: result.error ? { message: result.error.message } : undefined,
    },
    () => result.refetch(),
  ];
}

export function useMutation<TData = any, TVars = any>(
  doc: unknown,
): [{ fetching: boolean }, (vars: TVars) => Promise<{ data?: TData; error?: { message: string } }>] {
  const mutation = _useMutation<TData, Error, TVars>({
    mutationFn: (variables: TVars) => gqlRequest<TData>(doc, variables),
    // Mirror CLI behavior: after any successful mutation, mark every cached
    // query stale so open lists/detail views refetch and reflect the change.
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const execute = async (variables: TVars) => {
    try {
      const data = await mutation.mutateAsync(variables);
      return { data, error: undefined };
    } catch (e: any) {
      return { data: undefined, error: { message: e.message } };
    }
  };

  return [{ fetching: mutation.isPending }, execute];
}

const wsClient = createWSClient({ url: resolveGraphQLWsUrl() });

export function useSubscription<TData = any, TResult = TData>(
  opts: { query: unknown; variables?: Record<string, unknown>; pause?: boolean },
  handler?: (prev: TResult | undefined, data: TData) => TResult,
): [{ data: TResult | undefined; fetching: boolean; error: { message: string } | undefined }] {
  const [fetching, setFetching] = useState(!opts.pause);
  const [error, setError] = useState<{ message: string } | undefined>();
  const [result, setResult] = useState<TResult | undefined>();
  const resultRef = useRef(result);
  // Keep the ref current outside render (react-hooks/refs): the async
  // subscription `next` handler reads resultRef.current to fold into `handler`.
  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    if (opts.pause) {
      setFetching(false);
      return;
    }

    const query = typeof opts.query === "string" ? opts.query : String(opts.query);
    setFetching(true);
    setError(undefined);

    const unsubscribe = wsClient.subscribe(
      { query, variables: opts.variables as Record<string, unknown> },
      {
        next(value) {
          const data = value.data as TData;
          if (handler) {
            const next = handler(resultRef.current, data);
            setResult(next);
          } else {
            setResult(data as unknown as TResult);
          }
        },
        error(err) {
          setError({ message: err instanceof Error ? err.message : String(err) });
          setFetching(false);
        },
        complete() {
          setFetching(false);
        },
      },
    );

    return () => unsubscribe();
  }, [opts.pause, String(opts.query), JSON.stringify(opts.variables)]);

  return [{ data: result, fetching, error }];
}
