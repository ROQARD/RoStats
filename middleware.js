export default async function middleware(request) {
  const url = new URL(request.url);

  // 1. API ROUTES (Simplified)
  if (url.pathname.startsWith("/api/")) {
    const apiHeaders = { 
      "Content-Type": "application/json", 
      "Access-Control-Allow-Origin": "*" 
    };

    if (url.pathname === "/api/verify-captcha") {
      const token = url.searchParams.get("token");
      const secret = "0x4AAAAAACk-FBhYSFtiH6dRcg_6osS-xLM"; 
      const outcome = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${secret}&response=${token}`
      }).then(res => res.json());
      return new Response(JSON.stringify(outcome), { headers: apiHeaders });
    }

    // Proxy Fetch Logic
    const tryFetch = async (s, e) => {
      const PROXIES = ["rotunnel.com", "roproxy.com", "rbxproxy.com"];
      for (let p of PROXIES) {
        try {
          const r = await fetch(`https://${s}.${p}${e}`, { 
            headers: { "User-Agent": "RoStats_Standard" },
            next: { revalidate: 60 } // Cache for 1 minute to save resources
          });
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

  // 2. SERVE THE FULL HTML
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}

export const config = {
  matcher: ['/', '/api/:path*'],
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1937157010205619" crossorigin="anonymous"></script>
    <title>RoStats</title>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        :root { --bg: #050505; --card: #0c0c0c; --border: #1a1a1a; --accent: #4ade80; --text: #fff; --dim: #71717a; --warn: #ff4444; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        body { background: var(--bg); color: var(--text); padding: 20px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
        .container { width: 100%; max-width: 650px; padding-bottom: 80px; }
        .search-area { background: var(--card); border: 1px solid var(--border); padding: 30px; border-radius: 24px; text-align: center; margin-bottom: 12px; }
        .input-box { display: flex; gap: 10px; background: #000; padding: 6px; border-radius: 14px; border: 1px solid var(--border); transition: 0.3s; }
        input { flex: 1; background: transparent; border: none; color: white; padding: 10px 15px; font-size: 0.9rem; outline: none; }
        .scan-btn { background: var(--accent); color: #000; border: none; padding: 0 20px; border-radius: 10px; font-weight: 800; cursor: pointer; text-transform: uppercase; font-size: 0.7rem; }
        .scan-btn:disabled { opacity: 0.3; cursor: not-allowed; filter: grayscale(1); }
        .captcha-box { margin: 15px 0; display: flex; justify-content: center; min-height: 65px; }
        .nav-wrapper { width: 100%; display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; }
        .nav-label { font-size: 0.55rem; color: #444; text-transform: uppercase; font-weight: 900; width: 100%; margin-bottom: 4px; letter-spacing: 1px; }
        .chip-group { display: flex; gap: 6px; flex-wrap: wrap; }
        .nav-chip { background: var(--card); border: 1px solid var(--border); color: var(--dim); padding: 8px 14px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
        .nav-chip:hover { border-color: var(--accent); color: #fff; }
        .dashboard { display: none; flex-direction: column; gap: 12px; }
        .box { background: var(--card); border: 1px solid var(--border); padding: 20px; border-radius: 18px; }
        .val { font-size: 1.3rem; font-weight: 800; }
        .label { font-size: 0.6rem; color: var(--dim); text-transform: uppercase; font-weight: 800; }
        .error-msg { color: var(--warn); font-size: 0.65rem; font-weight: 800; margin-top: 10px; display: none; }
        .footer { margin-top: 40px; }
        .footer-link { color: var(--dim); text-decoration: none; font-size: 0.65rem; font-weight: 800; opacity: 0.4; }
    </style>
</head>
<body>
    <div class="container">
        <div class="search-area">
            <h1 style="font-size: 2rem; margin-bottom:20px;">Ro<span style="color:var(--accent)">Stats</span></h1>
            <div class="input-box">
                <input type="text" id="placeId" placeholder="Paste Game ID...">
                <button class="scan-btn" id="scanBtn" onclick="run()" disabled>Scan</button>
            </div>
            <div class="captcha-box">
                <div class="cf-turnstile" data-sitekey="0x4AAAAAACk-FIXxhlsidtFU" data-callback="onCaptcha"></div>
            </div>
            <div id="errorBox" class="error-msg">EXPERIENCE NOT FOUND</div>
        </div>
        <div id="results" class="dashboard">
            <div class="box" style="text-align:center"><h2 id="gTitle">-</h2></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="box"><div class="label">Active</div><div class="val" id="vPlay">-</div></div>
                <div class="box"><div class="label">Rating</div><div class="val" id="vRate">-</div></div>
            </div>
        </div>
    </div>
    <div class="footer"><a href="#" class="footer-link">BY ROQARD</a></div>
    <script>
        let captchaToken = null;
        function onCaptcha(token) { captchaToken = token; document.getElementById('scanBtn').disabled = false; }
        async function run() {
            const id = document.getElementById('placeId').value.replace(/\\D/g, '');
            const scanBtn = document.getElementById('scanBtn');
            scanBtn.innerText = '...';
            try {
                const r = await fetch("/api/validate-id?id=" + id);
                const v = await r.json();
                const d = await fetch("/api/get-stats?uid=" + v.universeId).then(res => res.json());
                document.getElementById('results').style.display = 'flex';
                document.getElementById('gTitle').innerText = d.game.name;
                document.getElementById('vPlay').innerText = d.game.playing;
                scanBtn.innerText = 'Scan';
            } catch(e) { 
                document.getElementById('errorBox').style.display = 'block'; 
                scanBtn.innerText = 'Scan';
            }
        }
    </script>
</body></html>`;
