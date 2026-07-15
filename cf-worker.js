const UPSTREAM_URL = "https://github.com/claration/Feather/releases/latest/download/Feather.ipa";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Range, If-None-Match, If-Modified-Since",
	"Access-Control-Expose-Headers": "Content-Length, Content-Range, Content-Type, Accept-Ranges, ETag, Last-Modified",
};

function withCors(headers) {
	const responseHeaders = new Headers(headers);

	for (const [key, value] of Object.entries(CORS_HEADERS)) {
		responseHeaders.set(key, value);
	}

	return responseHeaders;
}

function buildOptionsResponse() {
	return new Response(null, {
		status: 204,
		headers: withCors({
			"Access-Control-Max-Age": "86400",
		}),
	});
}

export default {
	async fetch(request, env, ctx) {
		if (request.method === "OPTIONS") {
			return buildOptionsResponse();
		}

		if (request.method !== "GET" && request.method !== "HEAD") {
			return new Response("Method Not Allowed", {
				status: 405,
				headers: withCors({
					Allow: "GET, HEAD, OPTIONS",
				}),
			});
		}

        
		const cacheKey = new Request(UPSTREAM_URL, { method: "GET" });

		try {
			// Try Worker cache first
			const cached = await caches.default.match(cacheKey);

			if (cached) {
				// Return cached copy immediately
				const cachedClone = cached.clone();

				// Background revalidation using ETag (non-blocking)
				ctx.waitUntil((async () => {
					try {
						const etag = cachedClone.headers.get("etag");
						const revalidateHeaders = etag ? { "If-None-Match": etag } : {};

						const reval = await fetch(UPSTREAM_URL, {
							method: "GET",
							headers: revalidateHeaders,
							cf: { cacheTtl: 3600, cacheEverything: true },
							redirect: "follow",
						});

						if (reval.status === 200) {
							await caches.default.put(cacheKey, reval.clone());
						}
					} catch (e) {
						// background errors are ignored
					}
				})());

				const resp = new Response(cachedClone.body, {
					status: cachedClone.status,
					statusText: cachedClone.statusText,
					headers: withCors(cachedClone.headers),
				});

				resp.headers.set("X-Cache", "HIT");
				return resp;
			}

			// No cached copy — fetch from upstream, cache and return
			const upstreamResp = await fetch(UPSTREAM_URL, {
				method: request.method,
				headers: request.headers,
				cf: { cacheTtl: 3600, cacheEverything: true },
				redirect: "follow",
			});

			if (upstreamResp.status === 200) {
				try {
					await caches.default.put(cacheKey, upstreamResp.clone());
				} catch (e) {
					// ignore cache put failures
				}
			}

			const out = new Response(upstreamResp.body, {
				status: upstreamResp.status,
				statusText: upstreamResp.statusText,
				headers: withCors(upstreamResp.headers),
			});

			out.headers.set("X-Cache", "MISS");
			return out;
		} catch (err) {
			return new Response("Upstream error: " + (err.message || err), {
				status: 502,
				headers: withCors({}),
			});
		}
	},
};
