/** Browser calls to Nest API (`globalPrefix` = `api`). */
export function getApiBase(): string {
	return import.meta.env.VITE_API_URL ?? "http://localhost:4000";
}

export async function apiFetch<T>(
	path: string,
	init?: RequestInit,
): Promise<T> {
	const base = getApiBase().replace(/\/$/, "");
	const p = path.startsWith("/") ? path : `/${path}`;
	const url = `${base}/api${p}`;
	const res = await fetch(url, {
		...init,
		headers: {
			"Content-Type": "application/json",
			...(init?.headers ?? {}),
		},
	});
	if (!res.ok) {
		let detail = res.statusText;
		try {
			const body = await res.text();
			if (body) detail = body;
		} catch {
			/* ignore */
		}
		throw new Error(detail);
	}
	if (res.status === 204) return undefined as T;
	return res.json() as Promise<T>;
}
