const PROXIES = ["rotunnel.com", "roproxy.com", "rbxproxy.com"];

export default async function middleware(request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    const apiHeaders = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
    const tryFetch = async (s, e) => {
      for (let p of PROXIES) {
        try {
          const r = await fetch(`https://${s}.${p}${e}`, { headers: { "User-Agent": "RoStats_Pro" }});
          if (r.status === 403) throw new Error("Private");
          if (r.ok) return await r.json();
        } catch (err) { if (err.message === "Private") throw err; continue; }
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
    } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: apiHeaders }); }
  }

  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

export const config = { matcher: '/:path*' };

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RoStats | Premium Roblox Analytics</title>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        :root { 
            --bg: #030303; 
            --card: #0a0a0a; 
            --border: rgba(255,255,255,0.08); 
            --accent: #4ade80; 
            --accent-glow: rgba(74, 222, 128, 0.12);
            --text: #ffffff; 
            --dim: #71717a; 
            --warn: #ff4444; 
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        body { 
            background: var(--bg); 
            color: var(--text); 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            min-height: 100vh;
            background-image: radial-gradient(circle at 50% -20%, #111 0%, transparent 50%);
            overflow-x: hidden;
        }

        /* Header & Auth */
        .header { width: 100%; max-width: 650px; padding: 25px; display: flex; justify-content: flex-end; gap: 12px; min-height: 90px; align-items: center; }
        .auth-btn { background: var(--accent); color: #000; border: none; padding: 12px 24px; border-radius: 14px; font-weight: 800; cursor: pointer; font-size: 0.85rem; text-decoration: none; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: inline-flex; align-items: center; justify-content: center; }
        .auth-btn.secondary { background: rgba(255,255,255,0.03); color: #fff; border: 1px solid var(--border); }
        .auth-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px var(--accent-glow); }
        .auth-btn:active { transform: scale(0.96); }

        /* Modern Container */
        .container { width: 100%; max-width: 650px; padding: 0 20px 100px; animation: fadeIn 0.8s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .search-area { background: var(--card); border: 1px solid var(--border); padding: 45px 35px; border-radius: 35px; text-align: center; margin-bottom: 30px; position: relative; }
        .input-box { display: flex; gap: 12px; background: #000; padding: 12px; border-radius: 22px; border: 1px solid var(--border); transition: 0.3s; }
        .input-box:focus-within { border-color: var(--accent); box-shadow: 0 0 20px var(--accent-glow); }
        input { flex: 1; background: transparent; border: none; color: white; padding: 10px 15px; font-size: 1rem; outline: none; }
        .scan-btn { background: var(--accent); color: #000; border: none; padding: 0 30px; border-radius: 16px; font-weight: 800; cursor: pointer; }

        /* Dashboard Effects */
        .dashboard { display: none; flex-direction: column; gap: 18px; animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .box { background: var(--card); border: 1px solid var(--border); padding: 30px; border-radius: 28px; text-align: center; position: relative; transition: 0.3s; }
        .box:hover { border-color: rgba(255,255,255,0.15); }
        
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .val { font-size: 1.6rem; font-weight: 800; display: block; margin-top: 5px; color: #fff; }
        .label { font-size: 0.65rem; color: var(--dim); text-transform: uppercase; font-weight: 900; letter-spacing: 1.5px; }

        .desc-container { text-align: left; background: #000; padding: 30px; border-radius: 25px; border: 1px solid var(--border); }
        #gDesc { font-size: 0.95rem; color: #a1a1aa; line-height: 1.7; max-height: 400px; overflow-y: auto; white-space: pre-wrap; scrollbar-width: thin; }

        /* Navigation Chips */
        .section-header { display: flex; justify-content: space-between; align-items: center; margin: 35px 0 15px; }
        .nav-label { font-size: 0.7rem; color: #555; text-transform: uppercase; font-weight: 900; letter-spacing: 2px; }
        .clear-link { font-size: 0.65rem; color: var(--warn); cursor: pointer; font-weight: 800; opacity: 0.6; transition: 0.2s; }
        .clear-link:hover { opacity: 1; }
        
        .chip-group { display: flex; gap: 10px; flex-wrap: wrap; }
        .nav-chip { background: var(--card); border: 1px solid var(--border); color: #eee; padding: 12px 20px; border-radius: 15px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .nav-chip:hover { background: var(--accent); color: #000; border-color: var(--accent); transform: scale(1.05); }

        /* Modals & Toast */
        .modal-overlay { display: none; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.92); z-index:2000; align-items:center; justify-content:center; backdrop-filter: blur(10px); }
        .modal { background: #0f0f0f; border: 1px solid var(--border); padding: 40px; border-radius: 35px; width: 90%; max-width: 400px; text-align: center; }
        .modal input { width: 100%; background: #000; border: 1px solid var(--border); color: white; padding: 16px; border-radius: 18px; margin-bottom: 15px; outline: none; }

        .fav-btn { position: absolute; top: 25px; right: 25px; font-size: 2rem; cursor: pointer; user-select: none; transition: 0.3s; }
        .fav-btn:hover { transform: scale(1.2); }

        .footer { position: fixed; bottom: 25px; right: 30px; opacity: 0.4; font-size: 0.75rem; font-weight: 800; letter-spacing: 1px; }
        .footer a { color: inherit; text-decoration: none; transition: 0.2s; }
        .footer a:hover { opacity: 1; color: var(--accent); }
    </style>
</head>
<body>
    <div id="authModal" class="modal-overlay" onclick="closeModal()">
        <div class="modal" onclick="event.stopPropagation()">
            <h2 id="modalTitle" style="margin-bottom:25px; font-size:1.8rem;">Welcome</h2>
            <input type="text" id="mUser" placeholder="Username">
            <input type="password" id="mPass" placeholder="Password (6+ chars)">
            <button class="auth-btn" style="width:100%; padding:18px;" id="mSubmit">Continue</button>
        </div>
    </div>

    <div class="header">
        <div id="loggedOutUI">
            <button class="auth-btn secondary" onclick="openAuth('signup')">Sign Up</button>
            <button class="auth-btn" onclick="openAuth('login')">Login</button>
        </div>
        <div id="loggedInUI" style="display:none; align-items:center;">
            <span id="userDisplay" style="margin-right:15px; font-weight:900; font-size:0.8rem; color:var(--accent); letter-spacing:1px;"></span>
            <button class="auth-btn" style="background:var(--warn); color:#fff; padding:10px 18px;" onclick="logout()">Sign Out</button>
        </div>
    </div>

    <div class="container">
        <div class="search-area">
            <h1 style="font-size: 3rem; margin-bottom:12px; letter-spacing:-2px; font-weight:800;">Ro<span style="color:var(--accent)">Stats</span></h1>
            <p style="color:var(--dim); font-size:0.9rem; margin-bottom:25px;">Live Roblox Analytics & Tracking</p>
            <div class="input-box">
                <input type="text" id="placeId" placeholder="Paste Game ID or Link...">
                <button class="scan-btn" id="scanBtn" onclick="run()" disabled>Scan</button>
            </div>
            <div style="margin-top:20px;"><div class="cf-turnstile" data-sitekey="0x4AAAAAACk-FIXxhlsidtFU" data-callback="onCaptcha"></div></div>
        </div>

        <div id="homeUI">
            <div class="section-header"><div class="nav-label">🔥 Most Searched</div></div>
            <div id="popContainer" class="chip-group"></div>
            
            <div id="favBlock" style="display:none;">
                <div class="section-header"><div class="nav-label">Favorites ❤️</div></div>
                <div id="favContainer" class="chip-group"></div>
            </div>
            
            <div id="recentBlock">
                <div class="section-header">
                    <div class="nav-label">Recents</div>
                    <span class="clear-link" id="clearRecentBtn" style="display:none;" onclick="clearRecents()">Clear History</span>
                </div>
                <div id="recentContainer" class="chip-group"></div>
            </div>
        </div>

        <div id="results" class="dashboard">
            <div class="box">
                <div class="fav-btn" id="heartBtn" onclick="toggleFavorite()">🤍</div>
                <h2 id="gTitle" style="font-size: 2.2rem; margin-bottom: 8px; letter-spacing: -1px;">-</h2>
                <a id="gOwner" style="color:var(--accent); text-decoration:none; font-size:1rem; font-weight:700; display:block; margin-bottom: 25px;" target="_blank">-</a>
                <div style="display:flex; gap:12px;">
                    <a id="gPlay" class="auth-btn" style="flex:2; background:#fff; color:#000;" target="_blank">Launch Game</a>
                    <button id="copyBtn" onclick="shareStats()" class="auth-btn secondary" style="flex:1;">Copy Stats</button>
                </div>
            </div>
            <div class="stats-grid">
                <div class="box"><span class="label">Playing</span><span class="val" id="vPlay">-</span></div>
                <div class="box"><span class="label">Visits</span><span class="val" id="vVisit">-</span></div>
                <div class="box"><span class="label">Rating</span><span class="val" id="vRate">-</span></div>
            </div>
            <div class="desc-container">
                <div class="label" style="margin-bottom:12px; color:var(--text)">Description</div>
                <div id="gDesc"></div>
            </div>
            <button class="auth-btn secondary" style="width:100%; margin-top:20px; padding:18px;" onclick="location.reload()">Back Home</button>
        </div>
    </div>

    <div class="footer"><a href="https://www.roblox.com/users/9461867215/profile" target="_blank">BY ROQARD</a></div>

    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
        import { getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
        import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, orderBy, limit, getDocs, increment } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "AIzaSyAm6HmeQsY8G1saKkZvrJpPApedPWJ60lU",
            authDomain: "rostats-afa40.firebaseapp.com",
            projectId: "rostats-afa40",
            storageBucket: "rostats-afa40.firebasestorage.app",
            messagingSenderId: "212222377382",
            appId: "1:212222377382:web:0c2d3e1a0c1ae18f1fe367"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        setPersistence(auth, browserLocalPersistence);

        let currentUser = null, userData = null, currentGame = null, rawStats = null;

        const fmt = x => {
            if (x >= 1e9) return (x / 1e9).toFixed(1) + 'B';
            if (x >= 1e6) return (x / 1e6).toFixed(1) + 'M';
            if (x >= 1e3) return (x / 1e3).toFixed(1) + 'K';
            return x.toLocaleString();
        };

        window.openAuth = (m) => {
            document.getElementById('modalTitle').innerText = m === 'signup' ? 'Join RoStats' : 'Welcome Back';
            document.getElementById('mSubmit').onclick = () => handleAuth(m);
            document.getElementById('authModal').style.display = 'flex';
        };
        window.closeModal = () => document.getElementById('authModal').style.display = 'none';

        async function handleAuth(mode) {
            const user = document.getElementById('mUser').value.trim().toLowerCase();
            const pass = document.getElementById('mPass').value.trim();
            if(!user || pass.length < 6) return alert("Username required & 6+ character password.");
            try {
                const email = user + "@rostats.internal";
                if(mode === 'signup') await createUserWithEmailAndPassword(auth, email, pass);
                else await signInWithEmailAndPassword(auth, email, pass);
                closeModal();
            } catch(e) { alert("Auth failed: " + e.message); }
        }

        window.logout = () => signOut(auth).then(() => location.reload());

        onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            if(user) {
                document.getElementById('loggedInUI').style.display = 'flex';
                document.getElementById('loggedOutUI').style.display = 'none';
                document.getElementById('userDisplay').innerText = user.email.split('@')[0].toUpperCase();
                const snap = await getDoc(doc(db, "users", user.uid));
                userData = snap.exists() ? snap.data() : { favorites: [], recents: [] };
                if(!snap.exists()) await setDoc(doc(db, "users", user.uid), userData);
                renderUserCollections();
            } else {
                document.getElementById('loggedOutUI').style.display = 'flex';
                document.getElementById('loggedInUI').style.display = 'none';
            }
        });

        window.onCaptcha = (t) => { window.captchaToken = t; document.getElementById('scanBtn').disabled = false; };

        window.run = async () => {
            const val = document.getElementById('placeId').value;
            const id = val.match(/games\\/(\\d+)/) ? val.match(/games\\/(\\d+)/)[1] : val.replace(/\\D/g, '');
            const btn = document.getElementById('scanBtn');
            btn.innerText = 'Analyzing...';
            btn.style.opacity = "0.6";
            
            try {
                const r = await fetch("/api/validate-id?id=" + id).then(res => res.json());
                const d = await fetch("/api/get-stats?uid=" + r.universeId).then(res => res.json());
                const g = d.game;
                currentGame = { id, name: g.name };
                rawStats = { name: g.name, playing: fmt(g.playing), visits: fmt(g.visits) };
                
                document.getElementById('homeUI').style.display = 'none';
                document.getElementById('results').style.display = 'flex';
                document.getElementById('gTitle').innerText = g.name;
                document.getElementById('vPlay').innerText = rawStats.playing;
                document.getElementById('vVisit').innerText = rawStats.visits;
                document.getElementById('vRate').innerText = Math.round((d.votes.upVotes / (d.votes.upVotes + d.votes.downVotes)) * 100) + "%";
                document.getElementById('gDesc').innerText = g.description;
                document.getElementById('gPlay').href = "https://www.roblox.com/games/" + id;
                
                const type = g.creator.type === "Group" ? "groups" : "users";
                document.getElementById('gOwner').innerText = "By " + g.creator.name;
                document.getElementById('gOwner').href = \`https://www.roblox.com/\${type}/\${g.creator.id}\`;
                
                updateHeartState(id);
                
                if(currentUser) await updateDoc(doc(db, "users", currentUser.uid), { recents: arrayUnion(currentGame) });
                await setDoc(doc(db, "popular", id), { name: g.name, count: increment(1), hidden: false }, { merge: true });
                btn.innerText = 'Scan';
                btn.style.opacity = "1";
                loadPopular();
            } catch(e) { btn.innerText = 'Scan'; btn.style.opacity = "1"; alert("Could not fetch game data."); }
        };

        window.shareStats = () => {
            const text = \`🎮 Game: \${rawStats.name}\\n🚀 Active: \${rawStats.playing}\\n📈 Visits: \${rawStats.visits}\\n\\nScan more on RoStats!\`;
            navigator.clipboard.writeText(text).then(() => {
                const b = document.getElementById('copyBtn');
                b.innerText = "Copied! ✅";
                b.style.borderColor = "var(--accent)";
                setTimeout(() => { b.innerText = "Copy Stats"; b.style.borderColor = "var(--border)"; }, 2000);
            });
        };

        function updateHeartState(id) {
            const heart = document.getElementById('heartBtn');
            const isFav = userData?.favorites?.some(x => x.id === id);
            heart.innerText = isFav ? "❤️" : "🤍";
        }

        window.toggleFavorite = async () => {
            if(!currentUser) return openAuth('login');
            const isFav = userData?.favorites?.some(x => x.id === currentGame.id);
            if(!isFav) {
                await updateDoc(doc(db, "users", currentUser.uid), { favorites: arrayUnion(currentGame) });
            } else {
                const item = userData.favorites.find(x => x.id === currentGame.id);
                if(item) await updateDoc(doc(db, "users", currentUser.uid), { favorites: arrayRemove(item) });
            }
            const snap = await getDoc(doc(db, "users", currentUser.uid));
            userData = snap.data();
            updateHeartState(currentGame.id);
            renderUserCollections();
        };

        window.clearRecents = async () => {
            if(!currentUser) return;
            if(confirm("Wipe your search history?")) {
                await updateDoc(doc(db, "users", currentUser.uid), { recents: [] });
                userData.recents = [];
                renderUserCollections();
            }
        };

        async function loadPopular() {
            try {
                const q = query(collection(db, "popular"), where("hidden", "==", false), orderBy("count", "desc"), limit(12));
                const snap = await getDocs(q);
                renderChips(snap.docs.map(d => ({id: d.id, name: d.data().name})), 'popContainer');
            } catch(e) { console.warn("Popular list cooling down..."); }
        }

        function renderUserCollections() {
            if(userData?.favorites?.length) { 
                document.getElementById('favBlock').style.display = 'block'; 
                renderChips(userData.favorites, 'favContainer'); 
            } else { document.getElementById('favBlock').style.display = 'none'; }

            if(userData?.recents?.length) {
                document.getElementById('clearRecentBtn').style.display = 'block';
                renderChips(userData.recents.slice(-10).reverse(), 'recentContainer');
            } else {
                document.getElementById('recentContainer').innerHTML = '';
                document.getElementById('clearRecentBtn').style.display = 'none';
            }
        }

        function renderChips(list, target) {
            const container = document.getElementById(target);
            container.innerHTML = '';
            const unique = Array.from(new Map(list.map(i => [i.id, i])).values());
            unique.forEach(g => {
                const c = document.createElement('div');
                c.className = 'nav-chip';
                c.innerText = g.name;
                c.onclick = () => { document.getElementById('placeId').value = g.id; window.run(); };
                container.appendChild(c);
            });
        }

        loadPopular();
    </script>
</body></html>`;
