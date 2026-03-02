const PROXIES = ["rotunnel.com", "roproxy.com", "rbxproxy.com"];

export default async function middleware(request) {
  const url = new URL(request.url);

  // 1. Handle API Routes
  if (url.pathname.startsWith("/api/")) {
    const apiHeaders = { 
      "Content-Type": "application/json", 
      "Access-Control-Allow-Origin": "*" 
    };

    if (url.pathname === "/api/verify-captcha") {
      const token = url.searchParams.get("token");
      const secret = process.env.TURNSTILE_SECRET; 
      const outcome = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secret}&response=${token}`
      }).then(res => res.json());
      return new Response(JSON.stringify(outcome), { headers: apiHeaders });
    }

    const tryFetch = async (s, e) => {
      for (let p of PROXIES) {
        try {
          const r = await fetch(`https://${s}.${p}${e}`, { headers: { "User-Agent": "RoStats_Standard" }});
          if (r.status === 403) throw new Error("Private");
          if (r.ok) return await r.json();
        } catch (err) {
          if (err.message === "Private") throw err;
          continue;
        }
      }
      throw new Error("NotFound");
    };

    try {
      if (url.pathname === "/api/validate-id") {
        const id = url.searchParams.get("id");
        const d = await tryFetch('apis', `/universes/v1/places/${id}/universe`);
        return new Response(JSON.stringify({ universeId: d.universeId }), { headers: apiHeaders });
      }
      if (url.pathname === "/api/get-stats") {
        const u = url.searchParams.get("uid");
        const [g, v, f] = await Promise.all([
          tryFetch('games', `/v1/games?universeIds=${u}`),
          tryFetch('games', `/v1/games/votes?universeIds=${u}`),
          tryFetch('games', `/v1/games/${u}/favorites/count`)
        ]);
        return new Response(JSON.stringify({ game: g.data[0], votes: v.data[0], favorites: f.favoritesCount }), { headers: apiHeaders });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: apiHeaders });
    }
  }

  // 2. Handle the Frontend (Serve HTML for all other paths)
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

// Ensure it runs on the Edge (V8 Isolate) just like Cloudflare
export const config = {
  matcher: '/(.*)',
};

const html = `<!DOCTYPE html>...`; // Your full HTML code here
