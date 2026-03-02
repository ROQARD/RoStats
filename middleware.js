const PROXIES = ["rotunnel.com", "roproxy.com", "rbxproxy.com"];

export default async function middleware(request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    const apiHeaders = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
    const tryFetch = async (s, e) => {
      for (let p of PROXIES) {
        try {
          const r = await fetch(`https://${s}.${p}${e}`, { headers: { "User-Agent": "RoStats_Standard" }});
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
    <title>RoStats | Roblox Analytics</title>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        :root { --bg: #050505; --card: #0c0c0c; --border: #1a1a1a; --accent: #4ade80; --text: #fff; --dim: #71717a; --warn: #ff4444; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        body { background: var(--bg); color: var(--text); display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
        
        .header { width: 100%; max-width: 650px; padding: 20px; display: flex; justify-content: flex-end; gap: 10px; min-height: 80px; align-items: center; }
        .auth-btn { background: var(--accent); color: #000; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; font-size: 0.8rem; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
        .auth-btn.secondary { background: #1a1a1a; color: #fff; border: 1px solid var(--border); }
        
        .modal-overlay { display: none; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:2000; align-items:center; justify-content:center; backdrop-filter: blur(4px); }
        .modal { background: #0f0f0f; border: 1px solid var(--border); padding: 30px; border-radius: 28px; width: 90%; max-width: 380px; text-align: center; }
        .modal input { width: 100%; background: #000; border: 1px solid var(--border); color: white; padding: 14px; border-radius: 14px; margin-bottom: 12px; outline: none; }

        .container { width: 100%; max-width: 650px; padding: 0 20px 100px; }
        .search-area { background: var(--card); border: 1px solid var(--border); padding: 40px 30px; border-radius: 32px; text-align: center; margin-bottom: 25px; }
        .input-box { display: flex; gap: 10px; background: #000; padding: 10px; border-radius: 20px; border: 1px solid var(--border); }
        input { flex: 1; background: transparent; border: none; color: white; padding: 10px 15px; font-size: 1rem; outline: none; }
        .scan-btn { background: var(--accent); color: #000; border: none; padding: 0 28px; border-radius: 14px; font-weight: 800; cursor: pointer; }

        .dashboard { display: none; flex-direction: column; gap: 15px; }
        .box { background: var(--card); border: 1px solid var(--border); padding: 25px; border-radius: 24px; text-align: center; position: relative; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .val { font-size: 1.3rem; font-weight: 800; display: block; }
        .label { font-size: 0.6rem; color: var(--dim); text-transform: uppercase; font-weight: 900; letter-spacing: 1px; }

        .desc-container { text-align: left; background: #000; padding: 25px; border-radius: 20px; border: 1px solid var(--border); }
        #gDesc { font-size: 0.9rem; color: #bbb; line-height: 1.6; max-height: 350px; overflow-y: auto; white-space: pre-wrap; }

        .nav-label { font-size: 0.65rem; color: #444; text-transform: uppercase; font-weight: 900; letter-spacing: 2px; margin: 30px 0 12px; }
        .chip-group { display: flex; gap: 8px; flex-wrap: wrap; }
        .nav-chip { background: var(--card); border: 1px solid var(--border); color: #ccc; padding: 10px 16px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; cursor: pointer; }

        .fav-btn { position: absolute; top: 20px; right: 20px; font-size: 1.8rem; cursor: pointer; }
        .footer { position: fixed; bottom: 20px; right: 25px; opacity: 0.5; font-size: 0.7rem; font-weight: 800; }
        .footer a { color: inherit; text-decoration: none; transition: 0.2s; }
        .footer a:hover { color: var(--accent); opacity: 1; }
    </style>
</head>
<body>
    <div id="authModal" class="modal-overlay" onclick="closeModal()">
        <div class="modal" onclick="event.stopPropagation()">
            <h2 id="modalTitle" style="margin-bottom:20px;">Welcome</h2>
            <input type="text" id="mUser" placeholder="Username">
            <input type="password" id="mPass" placeholder="Password (6+ chars)">
            <button class="auth-btn" style="width:100%; padding:15px;" id="mSubmit">Continue</button>
        </div>
    </div>

    <div class="header">
        <div id="loggedOutUI">
            <button class="auth-btn secondary" onclick="openAuth('signup')">Create Account</button>
            <button class="auth-btn" onclick="openAuth('login')">Log In</button>
        </div>
        <div id="loggedInUI" style="display:none; align-items:center;">
            <span id="userDisplay" style="margin-right:15px; font-weight:800; font-size:0.85rem; color:var(--accent);"></span>
            <button class="auth-btn" style="background:var(--warn); color:#fff;" onclick="logout()">Sign Out</button>
        </div>
    </div>

    <div class="container">
        <div class="search-area">
            <h1 style="font-size: 2.5rem; margin-bottom:10px; letter-spacing:-1.5px;">Ro<span style="color:var(--accent)">Stats</span></h1>
            <div class="input-box">
                <input type="text" id="placeId" placeholder="Paste Game ID or Link...">
                <button class="scan-btn" id="scanBtn" onclick="run()" disabled>Scan</button>
            </div>
            <div style="margin-top:15px;"><div class="cf-turnstile" data-sitekey="0x4AAAAAACk-FIXxhlsidtFU" data-callback="onCaptcha"></div></div>
        </div>

        <div id="homeUI">
            <div class="nav-label">Popular Globally</div><div id="popContainer" class="chip-group"></div>
            <div id="favBlock" style="display:none;"><div class="nav-label">Favorites ❤️</div><div id="favContainer" class="chip-group"></div></div>
            <div class="nav-label">Recent Searches</div><div id="recentContainer" class="chip-group"></div>
        </div>

        <div id="results" class="dashboard">
            <div class="box">
                <div class="fav-btn" id="heartBtn" onclick="toggleFavorite()">🤍</div>
                <h2 id="gTitle" style="font-size: 1.8rem; margin-bottom: 5px;">-</h2>
                <a id="gOwner" style="color:var(--accent); text-decoration:none; font-size:0.9rem; font-weight:700; display:block; margin-bottom: 15px;" target="_blank">-</a>
                <a id="gPlay" class="auth-btn" style="width:100%; background:#fff; color:#000;" target="_blank">Play on Roblox</a>
            </div>
            <div class="stats-grid">
                <div class="box"><span class="label">Playing</span><span class="val" id="vPlay">-</span></div>
                <div class="box"><span class="label">Visits</span><span class="val" id="vVisit">-</span></div>
                <div class="box"><span class="label">Rating</span><span class="val" id="vRate">-</span></div>
            </div>
            <div class="desc-container">
                <div class="label" style="margin-bottom:10px; color:var(--text)">Full Description</div>
                <div id="gDesc"></div>
            </div>
            <button class="auth-btn secondary" style="width:100%; margin-top:15px;" onclick="location.reload()">Back to Home</button>
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

        let currentUser = null, userData = null, currentGame = null;

        const fmt = x => {
            if (x >= 1e9) return (x / 1e9).toFixed(1) + 'B';
            if (x >= 1e6) return (x / 1e6).toFixed(1) + 'M';
            if (x >= 1e3) return (x / 1e3).toFixed(1) + 'K';
            return x.toLocaleString();
        };

        window.openAuth = (m) => {
            document.getElementById('modalTitle').innerText = m === 'signup' ? 'Create Account' : 'Login';
            document.getElementById('mSubmit').onclick = () => handleAuth(m);
            document.getElementById('authModal').style.display = 'flex';
        };
        window.closeModal = () => document.getElementById('authModal').style.display = 'none';

        async function handleAuth(mode) {
            const user = document.getElementById('mUser').value.trim().toLowerCase();
            const pass = document.getElementById('mPass').value.trim();
            if(!user || pass.length < 6) return alert("Check inputs.");
            try {
                const email = user + "@rostats.internal";
                if(mode === 'signup') await createUserWithEmailAndPassword(auth, email, pass);
                else await signInWithEmailAndPassword(auth, email, pass);
                closeModal();
            } catch(e) { alert(e.message); }
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
            btn.innerText = '...';
            try {
                const r = await fetch("/api/validate-id?id=" + id).then(res => res.json());
                const d = await fetch("/api/get-stats?uid=" + r.universeId).then(res => res.json());
                const g = d.game;
                currentGame = { id, name: g.name };
                
                document.getElementById('homeUI').style.display = 'none';
                document.getElementById('results').style.display = 'flex';
                document.getElementById('gTitle').innerText = g.name;
                document.getElementById('vPlay').innerText = fmt(g.playing);
                document.getElementById('vVisit').innerText = fmt(g.visits);
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
                loadPopular();
            } catch(e) { btn.innerText = 'Scan'; alert("Error loading game."); }
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

        async function loadPopular() {
            const q = query(collection(db, "popular"), where("hidden", "==", false), orderBy("count", "desc"), limit(10));
            const snap = await getDocs(q);
            renderChips(snap.docs.map(d => ({id: d.id, name: d.data().name})), 'popContainer');
        }

        function renderUserCollections() {
            if(userData?.favorites?.length) { 
                document.getElementById('favBlock').style.display = 'block'; 
                renderChips(userData.favorites, 'favContainer'); 
            }
            if(userData?.recents?.length) renderChips(userData.recents.slice(-8).reverse(), 'recentContainer');
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
