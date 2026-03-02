const PROXIES = ["rotunnel.com", "roproxy.com", "rbxproxy.com"];

export default async function handler(req, res) {
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
  const id = searchParams.get("id");
  const uid = searchParams.get("uid");

  // --- 1. BACKEND LOGIC (Runs when scanning) ---
  if (id || uid) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const tryFetch = async (sub, path) => {
      for (let p of PROXIES) {
        try {
          const r = await fetch(`https://${sub}.${p}${path}`, { 
            headers: { "User-Agent": "RoStats_AllInOne" }
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
      if (id && !uid) {
        const d = await tryFetch('apis', `/universes/v1/places/${id}/universe`);
        return res.status(200).json({ universeId: d.universeId });
      }
      if (uid) {
        const [g, v] = await Promise.all([
          tryFetch('games', `/v1/games?universeIds=${uid}`),
          tryFetch('games', `/v1/games/votes?universeIds=${uid}`)
        ]);
        return res.status(200).json({ game: g.data[0], votes: v.data[0] });
      }
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // --- 2. FRONTEND UI (The HTML Website) ---
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>RoStats</title>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        :root { --bg: #050505; --card: #0c0c0c; --border: #1a1a1a; --accent: #4ade80; --text: #fff; --dim: #71717a; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        body { background: var(--bg); color: var(--text); padding: 20px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
        .container { width: 100%; max-width: 650px; }
        .search-area { background: var(--card); border: 1px solid var(--border); padding: 40px 30px; border-radius: 24px; text-align: center; margin-bottom: 12px; }
        .logo-img { width: 120px; height: 120px; object-fit: contain; margin-bottom: 20px; border-radius: 20px; }
        .input-box { display: flex; gap: 10px; background: #000; padding: 6px; border-radius: 14px; border: 1px solid var(--border); }
        input { flex: 1; background: transparent; border: none; color: white; padding: 12px 15px; font-size: 0.95rem; outline: none; }
        .scan-btn { background: var(--accent); color: #000; border: none; padding: 0 25px; border-radius: 10px; font-weight: 800; cursor: pointer; text-transform: uppercase; font-size: 0.75rem; }
        .scan-btn:disabled { opacity: 0.3; }
        .captcha-box { margin: 20px 0 10px; display: flex; justify-content: center; min-height: 65px; }
        .dashboard { display: none; flex-direction: column; gap: 12px; }
        .box { background: var(--card); border: 1px solid var(--border); padding: 20px; border-radius: 18px; }
        .val { font-size: 1.4rem; font-weight: 800; }
        .label { font-size: 0.6rem; color: var(--dim); text-transform: uppercase; font-weight: 800; margin-bottom: 6px; }
        #gDesc { font-size: 0.85rem; color: var(--dim); line-height: 1.6; white-space: pre-wrap; margin-top: 10px; }
        .btn { text-decoration: none; text-align: center; padding: 16px; border-radius: 14px; font-weight: 800; text-transform: uppercase; font-size: 0.8rem; cursor: pointer; border: none; background: #fff; color: #000; margin-top: 10px;}
    </style>
</head>
<body>
    <div class="container">
        <div class="search-area" id="searchSection">
            <img src="logo.jpeg" alt="RoStats" class="logo-img">
            <div class="input-box">
                <input type="text" id="placeId" placeholder="Enter Game ID...">
                <button class="scan-btn" id="scanBtn" onclick="run()" disabled>Scan</button>
            </div>
            <div class="captcha-box"><div class="cf-turnstile" data-sitekey="0x4AAAAAACk-FIXxhlsidtFU" data-callback="onCaptcha"></div></div>
        </div>
        <div id="results" class="dashboard">
            <div class="box" style="text-align:center"><h2 id="gTitle">-</h2><p id="gOwner" style="color:var(--accent);">-</p></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="box"><div class="label">Active</div><div class="val" id="vPlay">-</div></div>
                <div class="box"><div class="label">Rating</div><div class="val" id="vRate">-</div></div>
            </div>
            <div class="box"><div class="label">Description</div><div id="gDesc"></div></div>
            <button class="btn" onclick="location.reload()">New Search</button>
        </div>
    </div>
    <script>
        let captchaToken = null;
        function onCaptcha(t) { captchaToken = t; document.getElementById('scanBtn').disabled = false; }
        async function run() {
            const id = document.getElementById('placeId').value.replace(/\\D/g, '');
            document.getElementById('scanBtn').innerText = "WAIT...";
            try {
                const v = await fetch(window.location.href + '?id=' + id).then(r => r.json());
                const d = await fetch(window.location.href + '?uid=' + v.universeId).then(r => r.json());
                document.getElementById('searchSection').style.display = 'none';
                document.getElementById('results').style.display = 'flex';
                const rate = Math.round((d.votes.upVotes / (d.votes.upVotes + d.votes.downVotes)) * 100) || 0;
                document.getElementById('gTitle').innerText = d.game.name;
                document.getElementById('gOwner').innerText = "By " + d.game.creator.name;
                document.getElementById('vPlay').innerText = d.game.playing.toLocaleString();
                document.getElementById('vRate').innerText = rate + "%";
                document.getElementById('gDesc').textContent = d.game.description;
            } catch (e) { alert("Error."); location.reload(); }
        }
    </script>
</body>
</html>
  `);
}
