const PROXIES = ["rotunnel.com", "roproxy.com", "rbxproxy.com"];

export default async function middleware(request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    const apiHeaders = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
    const tryFetch = async (s, e) => {
      for (let p of PROXIES) {
        try {
          const r = await fetch(`https://${s}.${p}${e}`, { headers: { "User-Agent": "RoStats_Final" }});
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
    <title>RoStats</title>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        :root { --bg: #050505; --card: #0d0d0d; --border: #1a1a1a; --accent: #4ade80; --text: #ffffff; --dim: #71717a; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        body { background: var(--bg); color: var(--text); display: flex; flex-direction: column; align-items: center; min-height: 100vh; }

        /* Login UI Fix */
        .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 9999; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .modal { background: #111; border: 1px solid var(--border); padding: 30px; border-radius: 20px; width: 90%; max-width: 360px; }
        .modal h2 { margin-bottom: 20px; font-weight: 800; text-align: center; }
        .modal input { width: 100%; background: #000; border: 1px solid var(--border); color: #fff; padding: 12px; border-radius: 10px; margin-bottom: 10px; outline: none; }
        
        .header { width: 100%; max-width: 800px; padding: 20px; display: flex; justify-content: flex-end; }
        .btn { background: var(--accent); color: #000; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 0.85rem; transition: 0.2s; }
        .btn-outline { background: transparent; color: #fff; border: 1px solid var(--border); }
        .btn:hover { opacity: 0.8; }

        .container { width: 100%; max-width: 800px; padding: 20px 20px 100px; }
        .search-section { text-align: center; margin-bottom: 40px; }
        .search-bar { display: flex; gap: 10px; background: var(--card); padding: 8px; border-radius: 15px; border: 1px solid var(--border); max-width: 500px; margin: 20px auto; }
        .search-bar input { flex: 1; background: transparent; border: none; color: #fff; padding: 10px; outline: none; }

        .dashboard { display: none; flex-direction: column; gap: 15px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; }
        .stat-card { background: var(--card); border: 1px solid var(--border); padding: 20px; border-radius: 18px; }
        .stat-label { font-size: 0.65rem; color: var(--dim); text-transform: uppercase; font-weight: 800; letter-spacing: 1px; }
        .stat-value { font-size: 1.4rem; font-weight: 700; display: block; margin-top: 5px; }

        .chip-group { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
        .chip { background: var(--card); border: 1px solid var(--border); padding: 8px 15px; border-radius: 10px; font-size: 0.75rem; cursor: pointer; }
        .section-label { font-size: 0.7rem; font-weight: 800; color: #444; text-transform: uppercase; margin-top: 30px; }

        .footer { position: fixed; bottom: 20px; right: 20px; font-size: 0.7rem; font-weight: 800; opacity: 0.5; }
        a { color: inherit; text-decoration: none; }
    </style>
</head>
<body>
    <div id="authModal" class="modal-overlay" onclick="closeModal()">
        <div class="modal" onclick="event.stopPropagation()">
            <h2 id="modalTitle">RoStats</h2>
            <input type="text" id="mUser" placeholder="Username">
            <input type="password" id="mPass" placeholder="Password">
            <button class="btn" style="width: 100%" id="mSubmit">Continue</button>
        </div>
    </div>

    <div class="header">
        <div id="loggedOutUI">
            <button class="btn btn-outline" onclick="openAuth('login')">Login</button>
            <button class="btn" onclick="openAuth('signup')" style="margin-left:8px;">Sign Up</button>
        </div>
        <div id="loggedInUI" style="display:none;">
            <span id="userDisplay" style="margin-right:15px; font-weight:700; color:var(--accent);"></span>
            <button class="btn btn-outline" onclick="logout()">Logout</button>
        </div>
    </div>

    <div class="container">
        <div class="search-section">
            <h1 style="font-size: 2.5rem; font-weight: 800; letter-spacing: -1.5px;">RoStats</h1>
            <div class="search-bar">
                <input type="text" id="placeId" placeholder="Game ID or Link">
                <button class="btn" id="scanBtn" onclick="run()" disabled>Scan</button>
            </div>
            <div class="cf-turnstile" data-sitekey="0x4AAAAAACk-FIXxhlsidtFU" data-callback="onCaptcha"></div>
        </div>

        <div id="homeUI">
            <div class="section-label">Global Popular</div>
            <div id="popContainer" class="chip-group"></div>
            <div id="favBlock" style="display:none;">
                <div class="section-label">Favorites</div>
                <div id="favContainer" class="chip-group"></div>
            </div>
        </div>

        <div id="results" class="dashboard">
            <div class="stat-card" style="text-align:center;">
                <h2 id="gTitle">-</h2>
                <p id="gOwner" style="color:var(--accent); font-weight:700; margin-top:5px;"></p>
                <div style="margin-top:20px; display:flex; gap:10px; justify-content:center;">
                    <a id="gPlay" target="_blank" class="btn">Play Game</a>
                    <button class="btn btn-outline" id="favBtn" onclick="toggleFavorite()">Favorite</button>
                </div>
            </div>
            <div class="grid">
                <div class="stat-card"><span class="stat-label">Active Players</span><span class="stat-value" id="vPlay">-</span></div>
                <div class="stat-card"><span class="stat-label">Total Visits</span><span class="stat-value" id="vVisit">-</span></div>
                <div class="stat-card"><span class="stat-label">Est. Robux Earned</span><span class="stat-value" id="vRev" style="color:var(--accent);">-</span></div>
                <div class="stat-card"><span class="stat-label">Rating</span><span class="stat-value" id="vRate">-</span></div>
                <div class="stat-card"><span class="stat-label">Favorites</span><span class="stat-value" id="vFav">-</span></div>
                <div class="stat-card"><span class="stat-label">Max Servers</span><span class="stat-value" id="vMax">-</span></div>
                <div class="stat-card"><span class="stat-label">Created</span><span class="stat-value" id="vCreated" style="font-size:1rem;">-</span></div>
                <div class="stat-card"><span class="stat-label">Last Updated</span><span class="stat-value" id="vUpdated" style="font-size:1rem;">-</span></div>
            </div>
            <div class="stat-card">
                <span class="stat-label">Description</span>
                <p id="gDesc" style="font-size:0.85rem; color:#aaa; margin-top:10px; white-space:pre-wrap;"></p>
            </div>
            <button class="btn btn-outline" onclick="location.reload()">New Search</button>
        </div>
    </div>

    <div class="footer"><a href="https://www.roblox.com/users/9461867215/profile" target="_blank">BY ROQARD</a></div>

    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
        import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
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

        let currentUser = null, userData = null, currentId = null;

        const fmt = x => x >= 1e9 ? (x/1e9).toFixed(1)+'B' : x >= 1e6 ? (x/1e6).toFixed(1)+'M' : x >= 1e3 ? (x/1e3).toFixed(1)+'K' : x.toLocaleString();

        window.openAuth = (m) => {
            document.getElementById('modalTitle').innerText = m === 'signup' ? 'Create Account' : 'Login';
            document.getElementById('mSubmit').onclick = () => handleAuth(m);
            document.getElementById('authModal').style.display = 'flex';
        };
        window.closeModal = () => document.getElementById('authModal').style.display = 'none';

        async function handleAuth(mode) {
            const u = document.getElementById('mUser').value.trim().toLowerCase() + "@rostats.internal";
            const p = document.getElementById('mPass').value;
            try {
                if(mode === 'signup') await createUserWithEmailAndPassword(auth, u, p);
                else await signInWithEmailAndPassword(auth, u, p);
                closeModal();
            } catch(e) { alert(e.message); }
        }

        window.logout = () => signOut(auth).then(() => location.reload());

        onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            if(user) {
                document.getElementById('loggedInUI').style.display = 'block';
                document.getElementById('loggedOutUI').style.display = 'none';
                document.getElementById('userDisplay').innerText = user.email.split('@')[0].toUpperCase();
                const snap = await getDoc(doc(db, "users", user.uid));
                userData = snap.exists() ? snap.data() : { favorites: [] };
                if(!snap.exists()) await setDoc(doc(db, "users", user.uid), userData);
                renderUserFavs();
            }
        });

        window.onCaptcha = (t) => { document.getElementById('scanBtn').disabled = false; };

        window.run = async () => {
            const input = document.getElementById('placeId').value;
            const id = input.match(/\\d+/) ? input.match(/\\d+/)[0] : "";
            if(!id) return;
            currentId = id;
            document.getElementById('scanBtn').innerText = "...";
            try {
                const val = await fetch("/api/validate-id?id="+id).then(r => r.json());
                const data = await fetch("/api/get-stats?uid="+val.universeId).then(r => r.json());
                const g = data.game;
                
                document.getElementById('homeUI').style.display = 'none';
                document.getElementById('results').style.display = 'flex';
                document.getElementById('gTitle').innerText = g.name;
                document.getElementById('gOwner').innerText = "By " + g.creator.name;
                document.getElementById('vPlay').innerText = fmt(g.playing);
                document.getElementById('vVisit').innerText = fmt(g.visits);
                document.getElementById('vRev').innerText = "R$ " + fmt(Math.floor(g.visits * 0.7));
                document.getElementById('vRate').innerText = Math.round((data.votes.upVotes/(data.votes.upVotes+data.votes.downVotes))*100) + "%";
                document.getElementById('vFav').innerText = fmt(data.favorites);
                document.getElementById('vMax').innerText = g.maxPlayers;
                document.getElementById('vCreated').innerText = new Date(g.created).toLocaleDateString();
                document.getElementById('vUpdated').innerText = new Date(g.updated).toLocaleDateString();
                document.getElementById('gDesc').innerText = g.description;
                document.getElementById('gPlay').href = "https://www.roblox.com/games/"+id;
                
                await setDoc(doc(db, "popular", id), { name: g.name, count: increment(1), hidden: false }, { merge: true });
                updateFavBtn();
            } catch(e) { alert("Game not found"); }
            document.getElementById('scanBtn').innerText = "Scan";
        };

        window.toggleFavorite = async () => {
            if(!currentUser) return openAuth('login');
            const game = { id: currentId, name: document.getElementById('gTitle').innerText };
            const exists = userData.favorites.some(f => f.id === currentId);
            if(exists) {
                await updateDoc(doc(db, "users", currentUser.uid), { favorites: arrayRemove(userData.favorites.find(f => f.id === currentId)) });
            } else {
                await updateDoc(doc(db, "users", currentUser.uid), { favorites: arrayUnion(game) });
            }
            const snap = await getDoc(doc(db, "users", currentUser.uid));
            userData = snap.data();
            updateFavBtn();
            renderUserFavs();
        };

        function updateFavBtn() {
            const btn = document.getElementById('favBtn');
            btn.innerText = userData?.favorites?.some(f => f.id === currentId) ? "Unfavorite" : "Favorite";
        }

        function renderUserFavs() {
            if(userData?.favorites?.length) {
                document.getElementById('favBlock').style.display = 'block';
                const container = document.getElementById('favContainer');
                container.innerHTML = '';
                userData.favorites.forEach(f => {
                    const c = document.createElement('div');
                    c.className = 'chip';
                    c.innerText = f.name;
                    c.onclick = () => { document.getElementById('placeId').value = f.id; window.run(); };
                    container.appendChild(c);
                });
            }
        }

        async function loadPopular() {
            const q = query(collection(db, "popular"), where("hidden", "==", false), orderBy("count", "desc"), limit(12));
            const snap = await getDocs(q);
            const container = document.getElementById('popContainer');
            snap.forEach(d => {
                const c = document.createElement('div');
                c.className = 'chip';
                c.innerText = d.data().name;
                c.onclick = () => { document.getElementById('placeId').value = d.id; window.run(); };
                container.appendChild(c);
            });
        }
        loadPopular();
    </script>
</body></html>`;
