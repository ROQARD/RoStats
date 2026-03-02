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
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1937157010205619" crossorigin="anonymous"></script>
    <title>RoStats | Dashboard</title>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        :root { --bg: #050505; --card: #0c0c0c; --border: #1a1a1a; --accent: #4ade80; --text: #fff; --dim: #71717a; --warn: #ff4444; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        body { background: var(--bg); color: var(--text); display: flex; flex-direction: column; align-items: center; min-height: 100vh; overflow-x: hidden; }
        
        .auth-bar { width: 100%; max-width: 650px; padding: 15px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; font-size: 0.75rem; }
        .auth-bar input { background: #000; border: 1px solid var(--border); color: white; padding: 6px 10px; border-radius: 8px; outline: none; width: 110px; }
        .auth-btn { background: var(--accent); color: #000; border: none; padding: 6px 12px; border-radius: 8px; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .auth-btn:hover { transform: scale(1.05); }
        .admin-tag { background: #ffdf00; color: #000; padding: 2px 6px; border-radius: 4px; font-size: 0.6rem; font-weight: 900; display: none; margin-right: 5px; }

        .container { width: 100%; max-width: 650px; padding: 20px; padding-bottom: 100px; }
        .search-area { background: var(--card); border: 1px solid var(--border); padding: 30px; border-radius: 24px; text-align: center; margin-bottom: 15px; }
        .input-box { display: flex; gap: 10px; background: #000; padding: 6px; border-radius: 14px; border: 1px solid var(--border); }
        input { flex: 1; background: transparent; border: none; color: white; padding: 10px 15px; font-size: 0.9rem; outline: none; }
        .scan-btn { background: var(--accent); color: #000; border: none; padding: 0 25px; border-radius: 10px; font-weight: 800; cursor: pointer; }
        
        .nav-wrapper { display: flex; flex-direction: column; gap: 20px; margin-bottom: 20px; }
        .nav-label { font-size: 0.6rem; color: #444; text-transform: uppercase; font-weight: 900; letter-spacing: 1.5px; margin-bottom: 8px; }
        .chip-group { display: flex; gap: 8px; flex-wrap: wrap; }
        .nav-chip { background: var(--card); border: 1px solid var(--border); color: var(--dim); padding: 10px 16px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .nav-chip:hover { border-color: var(--accent); color: #fff; }

        .dashboard { display: none; flex-direction: column; gap: 15px; }
        .box { background: var(--card); border: 1px solid var(--border); padding: 25px; border-radius: 20px; text-align: center; position: relative; }
        .fav-btn { position: absolute; top: 20px; right: 20px; font-size: 1.5rem; cursor: pointer; color: var(--dim); transition: 0.2s; }
        .fav-btn.active { color: var(--warn); }
        
        .thumb-wrap { width: 120px; height: 120px; border-radius: 18px; margin: 0 auto 15px; overflow: hidden; border: 1px solid var(--border); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .thumb-wrap img { width: 100%; height: 100%; object-fit: cover; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .val { font-size: 1.4rem; font-weight: 800; display: block; }
        .label { font-size: 0.6rem; color: var(--dim); text-transform: uppercase; font-weight: 900; }

        .desc-card { background: var(--card); border: 1px solid var(--border); padding: 25px; border-radius: 22px; text-align: left; }
        #gDesc { font-size: 0.85rem; color: var(--dim); line-height: 1.6; max-height: 200px; overflow-y: auto; white-space: pre-wrap; padding-right: 10px; }
        
        /* Admin Panel Modal */
        #adminPanel { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #111; border: 2px solid var(--accent); padding: 30px; border-radius: 20px; z-index: 1000; width: 90%; max-width: 400px; }
        .overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 999; }
        
        .footer { position: fixed; bottom: 20px; right: 25px; }
        .footer-link { color: var(--dim); text-decoration: none; font-size: 0.65rem; font-weight: 800; letter-spacing: 1px; }
    </style>
</head>
<body>
    <div class="overlay" onclick="toggleAdminPanel()"></div>
    <div id="adminPanel">
        <h2 style="margin-bottom:15px; color:var(--accent)">Admin Control</h2>
        <div id="adminList" style="max-height: 300px; overflow-y: auto;"></div>
        <button class="auth-btn" style="width:100%; margin-top:20px;" onclick="toggleAdminPanel()">Close</button>
    </div>

    <div class="auth-bar">
        <div id="loggedOutUI">
            <input type="text" id="userIn" placeholder="User">
            <input type="password" id="passIn" placeholder="Pass">
            <button class="auth-btn" onclick="handleAuth('login')">Login</button>
            <button class="auth-btn google-btn" style="background:#fff;" onclick="handleGoogle()">G</button>
        </div>
        <div id="loggedInUI" style="display:none; align-items:center;">
            <span class="admin-tag" id="adminTag">ADMIN</span>
            <span id="displayUser" style="margin-right:10px; font-weight:700;"></span>
            <button id="adminBtn" class="auth-btn" style="background:#333; color:#fff; display:none; margin-right:5px;" onclick="toggleAdminPanel()">Panel</button>
            <button class="auth-btn" style="background:var(--warn); color:#fff;" onclick="logout()">Logout</button>
        </div>
    </div>

    <div class="container">
        <div class="search-area">
            <h1 style="font-size: 2.2rem; margin-bottom:20px; letter-spacing:-1px;">Ro<span style="color:var(--accent)">Stats</span></h1>
            <div class="input-box">
                <input type="text" id="placeId" placeholder="Paste Game Link or ID...">
                <button class="scan-btn" id="scanBtn" onclick="run()" disabled>Scan</button>
            </div>
            <div class="captcha-box" style="margin-top:15px;"><div class="cf-turnstile" data-sitekey="0x4AAAAAACk-FIXxhlsidtFU" data-callback="onCaptcha"></div></div>
        </div>

        <div id="navWrapper" class="nav-wrapper">
            <div id="popBlock"><div class="nav-label">Popular Globally</div><div id="popContainer" class="chip-group"></div></div>
            <div id="favBlock" style="display:none;"><div class="nav-label">Your Favorites ❤️</div><div id="favContainer" class="chip-group"></div></div>
            <div id="recentBlock"><div class="nav-label">Recent Searches</div><div id="recentContainer" class="chip-group"></div></div>
        </div>

        <div id="results" class="dashboard">
            <div class="box">
                <div class="fav-btn" id="heartBtn" onclick="toggleFavorite()">❤</div>
                <div class="thumb-wrap"><img id="gThumb" src=""></div>
                <h2 id="gTitle" style="font-size: 1.8rem;">-</h2>
                <a id="gOwner" style="color:var(--accent); text-decoration:none; font-size:0.9rem; font-weight:600; margin-top:8px; display:inline-block;" target="_blank">-</a>
            </div>
            <div class="stats-grid">
                <div class="box"><span class="label">Active</span><span class="val" id="vPlay">-</span></div>
                <div class="box"><span class="label">Visits</span><span class="val" id="vVisit">-</span></div>
                <div class="box"><span class="label">Rating</span><span class="val" id="vRate">-</span></div>
            </div>
            <div class="desc-card">
                <div class="nav-label" style="margin-bottom:10px; color:var(--text)">Full Description</div>
                <div id="gDesc"></div>
            </div>
        </div>
    </div>

    <div class="footer"><a href="https://www.roblox.com/users/9461867215/profile" class="footer-link" target="_blank">BY ROQARD</a></div>

    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
        import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
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
        let currentUser = null;
        let userData = null;
        let currentGame = null;

        // --- Auth & Admin Check ---
        window.handleAuth = async (mode) => {
            const user = document.getElementById('userIn').value;
            const pass = document.getElementById('passIn').value;
            if(!user || !pass) return;
            const fakeEmail = user + "@rostats.internal";
            try {
                if(mode === 'signup') await createUserWithEmailAndPassword(auth, fakeEmail, pass);
                else await signInWithEmailAndPassword(auth, fakeEmail, pass);
            } catch(e) { alert("Auth failed. If signing up, password must be 6+ chars."); }
        };

        window.handleGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
        window.logout = () => signOut(auth);

        onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            if(user) {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                userData = userDoc.data() || { recents: [], favorites: [] };
                if(!userDoc.exists()) await setDoc(doc(db, "users", user.uid), userData);

                document.getElementById('loggedOutUI').style.display = 'none';
                document.getElementById('loggedInUI').style.display = 'flex';
                document.getElementById('displayUser').innerText = user.displayName || user.email.split('@')[0];
                
                if(userData.role === 'admin') {
                    document.getElementById('adminBtn').style.display = 'block';
                    document.getElementById('adminTag').style.display = 'inline-block';
                }
                renderUserCollections();
            } else {
                document.getElementById('loggedOutUI').style.display = 'block';
                document.getElementById('loggedInUI').style.display = 'none';
            }
        });

        // --- UI & Stats Logic ---
        window.onCaptcha = (token) => { window.captchaToken = token; document.getElementById('scanBtn').disabled = false; };

        window.run = async () => {
            const raw = document.getElementById('placeId').value;
            const id = raw.match(/games\\/(\\d+)/) ? raw.match(/games\\/(\\d+)/)[1] : raw.replace(/\\D/g, '');
            const scanBtn = document.getElementById('scanBtn');
            scanBtn.innerText = '...';
            
            try {
                const r = await fetch("/api/validate-id?id=" + id).then(res => res.json());
                const d = await fetch("/api/get-stats?uid=" + r.universeId).then(res => res.json());
                const g = d.game;
                currentGame = { id, name: g.name };

                document.getElementById('navWrapper').style.display = 'none';
                document.getElementById('results').style.display = 'flex';
                document.getElementById('gTitle').innerText = g.name;
                document.getElementById('vPlay').innerText = g.playing.toLocaleString();
                document.getElementById('vVisit').innerText = (g.visits / 1e6).toFixed(1) + "M";
                document.getElementById('vRate').innerText = Math.round((d.votes.upVotes / (d.votes.upVotes + d.votes.downVotes)) * 100) + "%";
                document.getElementById('gDesc').innerText = g.description;
                document.getElementById('gThumb').src = "https://www.roblox.com/asset-thumbnail/image?assetId=" + id + "&width=420&height=420&format=png";
                document.getElementById('gOwner').innerText = "By " + g.creator.name;
                document.getElementById('gOwner').href = "https://www.roblox.com/users/" + g.creator.id;

                // Sync Heart State
                const isFav = userData?.favorites?.some(x => x.id === id);
                document.getElementById('heartBtn').classList.toggle('active', isFav);

                // Update Database
                if(currentUser) {
                    await updateDoc(doc(db, "users", currentUser.uid), { recents: arrayUnion(currentGame) });
                }
                await setDoc(doc(db, "popular", id), { name: g.name, count: increment(1), hidden: false }, { merge: true });
                scanBtn.innerText = 'Scan';
            } catch(e) { scanBtn.innerText = 'Scan'; alert("Game not found or private."); }
        };

        // --- Favorites & Recents ---
        window.toggleFavorite = async () => {
            if(!currentUser) return alert("Login to save favorites!");
            const btn = document.getElementById('heartBtn');
            const isFav = btn.classList.contains('active');
            
            if(isFav) {
                await updateDoc(doc(db, "users", currentUser.uid), { favorites: arrayRemove(userData.favorites.find(x => x.id === currentGame.id)) });
                btn.classList.remove('active');
            } else {
                await updateDoc(doc(db, "users", currentUser.uid), { favorites: arrayUnion(currentGame) });
                btn.classList.add('active');
            }
            // Refresh local data
            const freshDoc = await getDoc(doc(db, "users", currentUser.uid));
            userData = freshDoc.data();
        };

        function renderUserCollections() {
            if(userData.favorites?.length > 0) {
                document.getElementById('favBlock').style.display = 'block';
                renderChips(userData.favorites, 'favContainer');
            }
            if(userData.recents?.length > 0) renderChips(userData.recents.slice(0,5), 'recentContainer');
        }

        async function loadPopular() {
            const q = query(collection(db, "popular"), where("hidden", "==", false), orderBy("count", "desc"), limit(6));
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({id: d.id, name: d.data().name}));
            renderChips(list, 'popContainer');
        }

        function renderChips(list, target) {
            const container = document.getElementById(target);
            container.innerHTML = '';
            list.forEach(g => {
                const c = document.createElement('div');
                c.className = 'nav-chip';
                c.innerText = g.name;
                c.onclick = () => { document.getElementById('placeId').value = g.id; window.run(); };
                container.appendChild(c);
            });
        }

        // --- Admin Functions ---
        window.toggleAdminPanel = async () => {
            const panel = document.getElementById('adminPanel');
            const overlay = document.querySelector('.overlay');
            const isVisible = panel.style.display === 'block';
            panel.style.display = isVisible ? 'none' : 'block';
            overlay.style.display = isVisible ? 'none' : 'block';

            if(!isVisible) {
                const snap = await getDocs(query(collection(db, "popular"), orderBy("count", "desc"), limit(20)));
                const list = document.getElementById('adminList');
                list.innerHTML = '';
                snap.forEach(d => {
                    const item = d.data();
                    const div = document.createElement('div');
                    div.style = "display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #222; font-size:0.8rem;";
                    div.innerHTML = \`<span>\${item.name}</span><button onclick="hideGame('\${d.id}', \${item.hidden})" style="color:\${item.hidden?'#4ade80':'#ff4444'}; background:none; border:none; cursor:pointer; font-weight:800;">\${item.hidden?'SHOW':'HIDE'}</button>\`;
                    list.appendChild(div);
                });
            }
        };

        window.hideGame = async (id, currentState) => {
            await updateDoc(doc(db, "popular", id), { hidden: !currentState });
            toggleAdminPanel(); // Refresh
            loadPopular();
        };

        loadPopular();
    </script>
</body></html>`;
