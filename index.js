const PROXIES = ["rotunnel.com", "roproxy.com", "rbxproxy.com"];

export default async function handler(req, res) {
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
  const id = searchParams.get("id");
  const uid = searchParams.get("uid");

  // --- BACKEND LOGIC ---
  if (id || uid) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const tryFetch = async (sub, path) => {
      for (let p of PROXIES) {
        try {
          const r = await fetch(`https://${sub}.${p}${path}`, { 
            headers: { "User-Agent": "RoStats_Premium_v1" }
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

  // --- FRONTEND UI ---
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
        
        body { 
            background: var(--bg); 
            background-image: radial-gradient(circle at 50% -20%, #1a1a1a 0%, #050505 80%);
            color: var(--text); 
            padding: 20px; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            min-height: 100vh; 
            overflow-x: hidden;
        }

        /* Ambient Glow Animation */
        body::before {
            content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(74, 222, 128, 0.05) 0%, transparent 50%);
            z-index: -1; pointer-events: none;
        }

        .container { width: 100%; max-width: 600px; z-index: 1; margin-top: 5vh; }
        
        .search-area { 
            background: rgba(12, 12, 12, 0.8); 
            backdrop-filter: blur(10px);
            border: 1px solid var(--border); 
            padding: 50px 30px; 
            border-radius: 32px; 
            text-align: center; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }

        .logo-img { 
            width: 130px; height: 130px; object-fit: contain; 
            margin-bottom: 25px; border-radius: 24px; 
            border: 1px solid var(--border);
            animation: float 6s ease-in-out infinite;
        }

        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

        .input-box { 
            display: flex; gap: 10px; background: #000; padding: 8px; 
            border-radius: 18px; border: 1px solid var(--border); 
            transition: 0.3s;
        }
        .input-box:focus-within { border-color: var(--accent); box-shadow: 0 0 15px rgba(74, 222, 128, 0.2); }
        
        input { flex: 1; background: transparent; border: none; color: white; padding: 12px 15px; font-size: 1rem; outline: none; }
        
        .scan-btn { 
            background: var(--accent); color: #000; border: none; 
            padding: 0 28px; border-radius: 12px; font-weight: 800; 
            cursor: pointer; text-transform: uppercase; font-size: 0.8rem;
            transition: 0.2s;
        }
        .scan-btn:hover:not(:disabled) { transform: scale(1.05); filter: brightness(1.1); }
        .scan-btn:disabled { opacity: 0.2; cursor: not-allowed; }

        .captcha-box { margin: 25px 0 10px; display: flex; justify-content: center; min-height: 65px; }

        .dashboard { display: none; flex-direction: column; gap: 15px; animation: fadeInUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

        .box { background: var(--card); border: 1px solid var(--border); padding: 25px; border-radius: 24px; }
        .val { font-size: 1.8rem; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
        .label { font-size: 0.7rem; color: var(--dim); text-transform: uppercase; font-weight: 800; margin-bottom: 8px; letter-spacing: 1px; }
        
        #gDesc { font-size: 0.9rem; color: #a1a1aa; line-height: 1.7; white-space: pre-wrap; }

        .reset-btn { 
            background: transparent; color: var(--dim); border: 1px solid var(--border);
            padding: 15px; border-radius: 16px; font-weight: 600; cursor: pointer;
            margin-top: 10px; transition: 0.2s;
        }
        .reset-btn:hover { background: #111; color: #fff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="search-area" id="searchSection">
            <img src="logo.jpeg" alt="RoStats" class="logo-img">
            <div class="input-box">
                <input type="text" id="placeId" placeholder="Enter Game ID or Link...">
                <button class="scan-btn" id="scanBtn" onclick="run()" disabled>Scan</button>
            </div>
            <div class="captcha-box"><div class="cf-turnstile" data-sitekey="0x4AAAAAACk-FIXxhlsidtFU" data-callback="onCaptcha"></div></div>
        </div>

        <div id="results" class="dashboard">
            <div class="box" style="text-align:center">
                <h2 id="gTitle" style="font-size: 2rem; margin-bottom: 8px;">-</h2>
                <p id="gOwner" style="color:var(--accent); font-weight:600; font-size:1rem;">-</p>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="box"><div class="label">Current Active</div><div class="val" id="vPlay">-</div></div>
                <div class="box"><div class="label">User Rating</div><div class="val" id="vRate">-</div></div>
            </div>
            <div class="box">
                <div class="label">Experience Description</div>
                <div id="gDesc"></div>
            </div>
            <button class="reset-btn" onclick="location.reload()">← BACK TO SEARCH</button>
        </div>
    </div>

    <script>
        // Track mouse for ambient glow
        document.addEventListener('mousemove', e => {
            document.body.style.setProperty('--x', (e.clientX / window.innerWidth * 100) + '%');
            document.body.style.setProperty('--y', (e.clientY / window.innerHeight * 100) + '%');
        });

        let captchaToken = null;
        function onCaptcha(t) { captchaToken = t; document.getElementById('scanBtn').disabled = false; }

        async function run() {
            const raw = document.getElementById('placeId').value;
            const id = raw.replace(/\\D/g, '');
            if (!id) return;
            
            const btn = document.getElementById('scanBtn');
            btn.innerText = "QUERYING...";
            btn.disabled = true;

            try {
                const baseUrl = window.location.origin;
                const v = await fetch(baseUrl + '?id=' + id).then(r => r.json());
                const d = await fetch(baseUrl + '?uid=' + v.universeId).then(r => r.json());
                
                document.getElementById('searchSection').style.display = 'none';
                document.getElementById('results').style.display = 'flex';
                
                const rate = Math.round((d.votes.upVotes / (d.votes.upVotes + d.votes.downVotes)) * 100) || 0;
                
                document.getElementById('gTitle').innerText = d.game.name;
                document.getElementById('gOwner').innerText = "By " + d.game.creator.name;
                document.getElementById('vPlay').innerText = d.game.playing.toLocaleString();
                document.getElementById('vRate').innerText = rate + "%";
                document.getElementById('gDesc').textContent = d.game.description || "No description provided.";
            } catch (e) { 
                alert("Game not found."); 
                location.reload(); 
            }
        }
    </script>
</body>
</html>
  `);
}
