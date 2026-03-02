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

        .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 9999; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
        .modal { background: #111; border: 1px solid var(--border); padding: 35px; border-radius: 24px; width: 90%; max-width: 360px; }
        .modal h2 { margin-bottom: 25px; font-weight: 800; text-align: center; font-size: 1.5rem; }
        .modal input { width: 100%; background: #000; border: 1px solid var(--border); color: #fff; padding: 14px; border-radius: 12px; margin-bottom: 12px; outline: none; }
        
        .header { width: 100%; max-width: 800px; padding: 25px; display: flex; justify-content: flex-end; }
        .btn { background: var(--accent); color: #000; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 0.85rem; transition: 0.2s; text-align: center; text-decoration: none; }
        .btn-outline { background: transparent; color: #fff; border: 1px solid var(--border); }
        .btn:hover { transform: translateY(-1px); opacity: 0.9; }

        .container { width: 100%; max-width: 800px; padding: 0 20px 100px; }
        .search-section { text-align: center; margin-bottom: 40px; }
        .search-bar { display: flex; gap: 10px; background: var(--card); padding: 8px; border-radius: 18px; border: 1px solid var(--border); max-width: 500px; margin: 25px auto; }
        .search-bar input { flex: 1; background: transparent; border: none; color: #fff; padding: 10px; outline: none; font-size: 1rem; }

        .dashboard { display: none; flex-direction: column; gap: 15px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .stat-card { background: var(--card); border: 1px solid var(--border); padding: 25px; border-radius: 20px; }
        .stat-label { font-size: 0.65rem; color: var(--dim); text-transform: uppercase; font-weight: 800; letter-spacing: 1.2px; }
        .stat-value { font-size: 1.6rem; font-weight: 700; display: block; margin-top: 8px; }

        .chip-group { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px; }
        .chip { background: var(--card); border: 1px solid var(--border); padding: 10px 18px; border-radius: 12px; font-size: 0.8rem; cursor: pointer; transition: 0.2s; font-weight: 600; }
        .chip:hover { border-color: var(--accent); }
        .section-label { font-size: 0.75rem; font-weight: 800; color: #444; text-transform: uppercase; margin-top: 40px; }

        .footer { position: fixed; bottom: 25px; right: 25px; font-size: 0.75rem; font-weight: 800; opacity: 0.4; }
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
            <button class="btn" onclick="openAuth('signup')" style="margin-left:10px;">Sign Up</button>
        </div>
        <div id="loggedInUI" style="display:none;">
            <span id="userDisplay" style="margin-right:20px; font-weight:800; color:var(--accent);"></span>
            <button class="btn btn-outline" onclick="logout()">Logout</button>
        </div>
    </div>

    <div class="container">
        <div class="search-section">
            <h1 style="font-size: 3rem; font-weight: 800; letter-spacing: -2px;">RoStats</h1>
            <div class="search-bar">
                <input type="text" id="placeId" placeholder="Enter Game ID or Link">
                <button class="btn" id="scanBtn" onclick="run()" disabled>Scan</button>
            </div>
            <div style="display:flex; justify-content:center;"><div class="cf-turnstile" data-sitekey="0x4AAAAAACk-FIXxhlsidtFU" data-callback="onCaptcha"></div></div>
        </div>

        <div id="homeUI">
            <div id="recentBlock" style="display:none;">
                <div class="section-label">Your Recents</div>
                <div id="recentContainer" class="chip-group"></div>
            </div>
            <div class="section-label">Most Popular</div>
            <div id="popContainer" class="chip-group"></div>
            <div id="favBlock" style="display:none;">
                <div class="section-label">Your Favorites</div>
                <div id="favContainer" class="chip-group"></div>
            </div>
        </div>

        <div id="results" class="dashboard">
            <div class="stat-card" style="text-align:center;">
                <h2 id="gTitle">-</h2>
                <p id="gOwner" style="color:var(--accent); font-weight:700; margin-top:8px;"></p>
                <div style="margin-top:25px; display:flex; gap:12px; justify-content:center;">
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
                <div class="stat-card"><span class="stat-label">Max Players per Server</span><span class="stat-value" id="vMax">-</span></div>
                <div class="stat-card"><span class="stat-label">Creation Date</span><span class="stat-value" id="vCreated">-</span></div>
                <div class="stat-card"><span class="stat-label">Last Updated</span><span class="stat-value" id="vUpdated">-</span></div>
            </div>
            <div class="stat-card">
                <span class="stat-label">Game Description</span>
                <p id="gDesc" style="font-size:0.9rem; color:#bbb; margin-top:15px; white-space:pre-wrap;"></p>
            </div>
            <button class="btn btn-outline" onclick="location.reload()">Start New Search</button>
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
            document.getElementById('modalTitle').innerText = m === 'signup' ? 'Sign Up' : 'Login';
            document.getElementById('mSubmit').onclick = () => handleAuth(m);
            document.getElementById('authModal').style.display = 'flex';
        };
        window.closeModal = () => document.getElementById('authModal').style.display = 'none';

        async function handleAuth(mode) {
            const uInput = document.getElementById('mUser').value.trim();
            const p = document.getElementById('mPass').value;
            const u = uInput.toLowerCase() + "@rostats.internal";
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
                userData = snap.exists() ? snap.data() : { favorites: [], recents: [] };
                if(!snap.exists()) await setDoc(doc(db, "users", user.uid), userData);
                renderUserCollections();
            }
        });

        window.onCaptcha = (t) => { document.getElementById('scanBtn').disabled = false; };

        window.run = async () => {
            const input = document.getElementById('placeId').value;
            const id = input.match(/\\d+/) ? input.match(/\\d+/)[0] : "";
            if(!id) return;
            currentId = id;
            const btn = document.getElementById('scanBtn');
            btn.innerText = "...";
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
                document.getElementById('vRev').innerText = "R$ " + fmt(Math.floor(g.visits * 0.4));
                document.getElementById('vRate').innerText = Math.round((data.votes.upVotes/(data.votes.upVotes+data.votes.downVotes))*100) + "%";
                document.getElementById('vFav').innerText = fmt(data.favorites);
                document.getElementById('vMax').innerText = g.maxPlayers;
                document.getElementById('vCreated').innerText = new Date(g.created).toLocaleDateString();
                document.getElementById('vUpdated').innerText = new Date(g.updated).toLocaleDateString();
                document.getElementById('gDesc').innerText = g.description;
                document.getElementById('gPlay').href = "https://www.roblox.com/games/"+id;
                
                // FIXED: Save to Recents for logged in users
                if(currentUser) {
                    const recentGame = { id: id, name: g.name };
                    // Remove if already exists to avoid duplicates, then add to top
                    const filtered = (userData.recents || []).filter(f => f.id !== id);
                    const newRecents = [recentGame, ...filtered].slice(0, 10);
                    await updateDoc(doc(db, "users", currentUser.uid), { recents: newRecents });
                    userData.recents = newRecents;
                }

                await setDoc(doc(db, "popular", id), { name: g.name, count: increment(1), hidden: false }, { merge: true });
                updateFavBtn();
            } catch(e) { alert("Game not found"); }
            btn.innerText = "Scan";
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
            renderUserCollections();
        };

        function updateFavBtn() {
            const btn = document.getElementById('favBtn');
            btn.innerText = userData?.favorites?.some(f => f.id === currentId) ? "Unfavorite" : "Favorite";
        }

        function renderUserCollections() {
            // Render Favorites
            if(userData?.favorites?.length) {
                document.getElementById('favBlock').style.display = 'block';
                renderChips(userData.favorites, 'favContainer');
            } else document.getElementById('favBlock').style.display = 'none';

            // Render Recents
            if(userData?.recents?.length) {
                document.getElementById('recentBlock').style.display = 'block';
                renderChips(userData.recents, 'recentContainer');
            } else document.getElementById('recentBlock').style.display = 'none';
        }

        function renderChips(list, targetId) {
            const container = document.getElementById(targetId);
            container.innerHTML = '';
            list.forEach(item => {
                const c = document.createElement('div');
                c.className = 'chip';
                c.innerText = item.name;
                c.onclick = () => { document.getElementById('placeId').value = item.id; window.run(); };
                container.appendChild(c);
            });
        }

        async function loadPopular() {
            const q = query(collection(db, "popular"), where("hidden", "==", false), orderBy("count", "desc"), limit(12));
            const snap = await getDocs(q);
            const container = document.getElementById('popContainer');
            container.innerHTML = '';
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
