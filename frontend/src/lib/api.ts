/** Browser calls to Nest API (`globalPrefix` = `api`). */
export function getApiBase(): string {
	return import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
}

export async function apiFetch<T>(
	path: string,
	init?: RequestInit,
): Promise<T> {
	const base = getApiBase().replace(/\/$/, '');
	const p = path.startsWith('/') ? path : `/${path}`;
	const url = `${base}/api${p}`;
	const res = await fetch(url, {
		...init,
		headers: {
			'Content-Type': 'application/json',
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

/** POST with optional JSON body; same URL rules as {@link apiFetch}. */
export async function apiFetchPost<T>(
	path: string,
	body?: unknown,
	init?: Omit<RequestInit, 'body' | 'method'>,
): Promise<T> {
	return apiFetch<T>(path, {
		...init,
		method: 'POST',
		...(body !== undefined ? { body: JSON.stringify(body) } : {}),
	});
}

export async function apiFetchPatch<T>(
	path: string,
	body?: unknown,
	init?: Omit<RequestInit, 'body' | 'method'>,
): Promise<T> {
	return apiFetch<T>(path, {
		...init,
		method: 'PATCH',
		...(body !== undefined ? { body: JSON.stringify(body) } : {}),
	});
}

export async function apiFetchBlob(path: string): Promise<Blob> {
	const base = getApiBase().replace(/\/$/, '');
	const p = path.startsWith('/') ? path : `/${path}`;
	const url = `${base}/api${p}`;
	const res = await fetch(url);
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
	return res.blob();
}
