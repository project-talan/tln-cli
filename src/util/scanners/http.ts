/** Fetches `url`, throwing a descriptive error on a non-2xx response — the one place a plain (non-paginated) request is made and checked. */
async function fetchOrThrow(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed (${response.status} ${response.statusText}): ${url}`);
  return response;
}

export async function fetchJson<T>(url: string): Promise<T> {
  return (await fetchOrThrow(url)).json() as Promise<T>;
}

export async function fetchText(url: string): Promise<string> {
  return (await fetchOrThrow(url)).text();
}
