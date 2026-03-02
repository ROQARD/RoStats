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
    <title>RoStats | Professional Roblox Analytics</title>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
        :root { --bg: #050505; --card: #0c0c0c; --border: #1a1a1a; --accent: #4ade80; --text: #fff; --dim: #71717a; --warn: #ff4444; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
        body { background: var(--bg); color: var(--text); display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
        
        /* Header */
        .header { width: 100%; max-width: 650px; padding: 20px; display: flex; justify-content: flex-end; gap: 10px; align-items: center; min-height: 80px; }
        .auth-btn { background: var(--accent); color: #000; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; font-size: 0.8rem; transition: 0.2s; }
        .auth-btn.secondary { background: #1a1a1a; color: #fff; border: 1px solid var(--border); }
        .auth-btn:hover { transform: translateY(-2px); opacity: 0.9; }

        /* Modals */
        .modal-overlay { display: none; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:2000; align-items:center; justify-content:center; backdrop-filter: blur(5px); }
        .modal { background: #0f0f0f; border: 1px solid var(--border); padding: 30px; border-radius: 28px; width: 90%; max-width: 400px; text-align: center; }
        .modal input { width: 100%; background: #000; border: 1px solid var(--border); color: white; padding: 14px; border-radius: 14px; margin-bottom: 12px; outline: none; }
        
        /* Main UI */
        .container { width: 100%; max-width: 650px; padding: 0 20px 100px; }
        .search-area { background: var(--card); border: 1px solid var(--border); padding: 40px 30px; border-radius: 32px; text-align: center; margin-bottom: 25px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .input-box { display: flex; gap: 10px; background: #000; padding: 10px; border-radius: 20px; border: 1px solid var(--border); }
        input { flex: 1; background: transparent; border: none; color: white; padding: 10px 15px; font-size: 1rem; outline: none; }
        .scan-btn { background: var(--accent); color: #000; border: none; padding: 0 28px; border-radius: 14px; font-weight: 800; cursor: pointer; }
        .scan-btn:disabled { background: #222; color: #444; cursor: not-allowed; }

        /* Dashboard */
        .dashboard { display: none; flex-direction: column; gap: 15px; }
        .box { background: var(--card); border: 1px solid var(--border); padding: 25px; border-radius: 24px; text-align: center; position: relative; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        .val { font-size: 1.4rem; font-weight: 800; display: block; color: #fff; }
        .label { font-size: 0.65rem; color: var(--dim); text-transform: uppercase; font-weight: 900; letter-spacing: 1px; }
        
        /* Description Fixes */
        .desc-container { text-align: left; background: #000; padding: 25px; border-radius: 20px; border: 1px solid var(--border); margin-top: 10px; }
        #gDesc { font-size: 0.9rem; color: #bbb; line-height: 1.7; max-height: 400px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word; }

        /* Chips */
        .nav-label { font-size: 0.65rem; color: #555; text-transform: uppercase; font-weight: 900; letter-spacing: 2px; margin: 30px 0 12px 5px; }
        .chip-group { display: flex; gap: 10px; flex-wrap: wrap; }
        .nav-chip { background: var(--card); border: 1px solid var(--border); color: #ccc; padding: 12px 18px; border-radius: 15px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .nav-chip:hover { border-color: var(--accent); color: #fff; background: #111; }

        /* Admin UI */
        .admin-tag { background: #ffdf00; color: #000; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; margin-right: 10px; display: none; }
        .admin-panel-list { max-height: 300px; overflow-y: auto; text-align: left; margin-top: 20px; }
        .admin-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #222; font-size: 0.85rem; }

        .fav-btn { position: absolute; top: 25px; right: 25px; font-size: 1.8rem; cursor: pointer; color: #222; transition: 0.3s; }
        .fav-btn.active { color: var(--warn); text-shadow: 0 0 15px rgba(255,68,68,0.4); }
        .thumb-wrap { width: 120px; height: 120px; border-radius: 24px; margin: 0 auto 15px; overflow: hidden; border: 2px solid var(--border); }
        .thumb-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .footer { position: fixed; bottom: 20px; right: 25px; opacity: 0.3; font-size: 0.7rem; font-weight: 800; }
    </style>
</head>
<body>
    <div id="authModal" class="modal-overlay" onclick="closeModal('authModal')">
        <div class="modal" onclick="event.stopPropagation()">
            <h2 id="modalTitle" style="margin-bottom:25px;">Welcome</h2>
            <input type="text" id="mUser" placeholder="Username">
            <input type="password" id="mPass" placeholder="Password (6+ chars)">
            <button class="auth-btn" style="width:100%; padding:16px;" id="mSubmit">Continue</button>
        </div>
    </div>

    <div id="adminModal" class="modal-overlay" onclick="closeModal('adminModal')">
        <div class="modal" style="max-width: 500px;" onclick="event.stopPropagation()">
            <h2 style="color:var(--accent); margin-bottom:5px;">Admin Control Panel</h2>
            <p id="userCount" style="font-size:0.75rem; color:var(--dim); margin-bottom:20px;">Loading users...</p>
            <div class="admin-panel-list" id="adminList"></div>
            <button class="auth-btn secondary" style="width:100%; margin-top:20px;" onclick="closeModal('adminModal')">Close Panel</button>
        </div>
    </div>

    <div class="header">
        <div id="loadingStatus" style="color:var(--dim); font-size:0.7rem;">Connecting...</div>
        <div id="loggedOutUI" style="display:none;">
            <button class="auth-btn secondary" onclick="openAuth('signup')">Create Account</button>
            <button class="auth-btn" onclick="openAuth('login')">Log In</button>
        </div>
        <div id="loggedInUI" style="display:none; align-items:center;">
            <span class="admin-tag" id="adminTag">ADMIN</span>
            <span id="userDisplay" style="margin-right:15px; font-weight:800; font-size:0.85rem; color:var(--accent);"></span>
            <button id="adminBtn" class="auth-btn secondary" style="display:none; margin-right:10px;" onclick="openAdmin()">Admin Panel</button>
            <button class="auth-btn" style="background:var(--warn); color:#fff;" onclick="logout()">Sign Out</button>
        </div>
    </div>

    <div class="container">
        <div class="search-area">
            <h1 style="font-size: 2.8rem; margin-bottom:10px; letter-spacing:-2px;">Ro<span style="color:var(--accent)">Stats</span></h1>
            <p style="color:var(--dim); font-size:0.85rem; margin-bottom:25px; font-weight:600;">The most accurate real-time Roblox analytics.</p>
            <div class="input-box">
                <input type="text" id="placeId" placeholder="Paste Game Link or ID here...">
                <button class="scan-btn" id="scanBtn" onclick="run()" disabled>Scan</button>
            </div>
            <div class="captcha-box" style="margin-top:20px;"><div class="cf-turnstile" data-sitekey="0x4AAAAAACk-FIXxhlsidtFU" data-callback="onCaptcha"></div></div>
        </div>

        <div id="homeUI">
            <div class="nav-label">🔥 Popular Globally</div><div id="popContainer" class="chip-group"></div>
            <div id="favBlock" style="display:none;"><div class="nav-label">❤️ Your Favorites</div><div id="favContainer" class="chip-group"></div></div>
            <div class="nav-label">🕒 Recently Scanned</div><div id="recentContainer" class="chip-group"></div>
        </div>

        <div id="results" class="dashboard">
            <div class="box">
                <div class="fav-btn" id="heartBtn" onclick="toggleFavorite()">❤</div>
                <div class="thumb-wrap"><img id="gThumb" src=""></div>
                <h2 id="gTitle" style="font-size: 1.8rem; letter-spacing:-0.5px;">-</h2>
                <a id="gOwner" style="color:var(--accent); text-decoration:none; font-size:0.9rem; font-weight:700; margin-top:5px; display:inline-block;" target="_blank">-</a>
            </div>
            <div class="stats-grid">
                <div class="box"><span class="label">Playing</span><span class="val" id="vPlay">-</span></div>
                <div class="box"><span class="label">Total Visits</span><span class="val" id="vVisit">-</span></div>
                <div class="box"><span class="label">Rating</span><span class="val" id="vRate">-</span></div>
            </div>
            <div class="desc-container">
                <div class="label" style="margin-bottom:15px; color:var(--text); font-size:0.75rem;">Game Description</div>
                <div id="gDesc"></div>
            </div>
            <button class="auth-btn secondary" style="margin-top:20px; width:100%;" onclick="location.reload()">Back to Home</button>
        </div>
    </div>

    <div class="footer">BY ROQARD | ROSTATS v3.0</div>

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
            if (x >= 1e9) return (x / 1e9).toFixed(2) + 'B';
            if (x >= 1e6) return (x / 1e6).toFixed(1) + 'M';
            if (x >= 1e3) return (x / 1e3).toFixed(1) + 'K';
            return x.toLocaleString();
        };

        window.openAuth = (mode) => {
            document.getElementById('modalTitle').innerText = mode === 'signup' ? 'Create Account' : 'Login';
            document.getElementById('mSubmit').onclick = () => handleAuth(mode);
            document.getElementById('authModal').style.display = 'flex';
        };
        window.closeModal = (id) => { document.getElementById(id).style.display = 'none'; };

        window.handleAuth = async (mode) => {
            const user = document.getElementById('mUser').value.trim();
            const pass = document.getElementById('mPass').value.trim();
            if(!user || pass.length < 6) return alert("Invalid inputs.");
            
            const email = user.toLowerCase() + "@rostats.internal";
            try {
                if(mode === 'signup') await createUserWithEmailAndPassword(auth, email, pass);
                else await signInWithEmailAndPassword(auth, email, pass);
                closeModal('authModal');
            } catch(e) { alert(e.message); }
        };

        window.logout = () => signOut(auth).then(() => location.reload());

        onAuthStateChanged(auth, async (user) => {
            document.getElementById('loadingStatus').style.display = 'none';
            currentUser = user;
            if(user) {
                document.getElementById('loggedInUI').style.display = 'flex';
                document.getElementById('loggedOutUI').style.display = 'none';
                document.getElementById('userDisplay').innerText = user.email.split('@')[0].toUpperCase();
                
                const snap = await getDoc(doc(db, "users", user.uid));
                if(!snap.exists()) {
                    userData = { recents: [], favorites: [], role: 'user' };
                    await setDoc(doc(db, "users", user.uid), userData);
                } else { userData = snap.data(); }
                
                if(userData.role === 'admin') {
                    document.getElementById('adminBtn').style.display = 'block';
                    document.getElementById('adminTag').style.display = 'inline-block';
                }
                renderUserCollections();
            } else {
                document.getElementById('loggedOutUI').style.display = 'flex';
                document.getElementById('loggedInUI').style.display = 'none';
            }
        });

        window.onCaptcha = (t) => { window.captchaToken = t; document.getElementById('scanBtn').disabled = false; };

        window.run = async () => {
            const raw = document.getElementById('placeId').value;
            const id = raw.match(/games\\/(\\d+)/) ? raw.match(/games\\/(\\d+)/)[1] : raw.replace(/\\D/g, '');
            const btn = document.getElementById('scanBtn');
            btn.innerText = 'Analyzing...';
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
                document.getElementById('gThumb').src = "https://www.roblox.com/asset-thumbnail/image?assetId=" + id + "&width=420&height=420&format=png";
                document.getElementById('gOwner').innerText = "By " + g.creator.name;
                document.getElementById('gOwner').href = "https://www.roblox.com/users/" + g.creator.id;
                
                document.getElementById('heartBtn').classList.toggle('active', userData?.favorites?.some(x => x.id === id));
                if(currentUser) await updateDoc(doc(db, "users", currentUser.uid), { recents: arrayUnion(currentGame) });
                await setDoc(doc(db, "popular", id), { name: g.name, count: increment(1), hidden: false }, { merge: true });
                btn.innerText = 'Scan';
                loadPopular();
            } catch(e) { btn.innerText = 'Scan'; alert("Game data unavailable."); }
        };

        window.toggleFavorite = async () => {
            if(!currentUser) return openAuth('login');
            const heart = document.getElementById('heartBtn');
            const isAdding = !heart.classList.contains('active');
            heart.classList.toggle('active');
            if(isAdding) await updateDoc(doc(db, "users", currentUser.uid), { favorites: arrayUnion(currentGame) });
            else await updateDoc(doc(db, "users", currentUser.uid), { favorites: arrayRemove(userData.favorites.find(x => x.id === currentGame.id)) });
            const snap = await getDoc(doc(db, "users", currentUser.uid));
            userData = snap.data();
            renderUserCollections();
        };

        async function loadPopular() {
            const q = query(collection(db, "popular"), where("hidden", "==", false), orderBy("count", "desc"), limit(8));
            const snap = await getDocs(q);
            renderChips(snap.docs.map(d => ({id: d.id, name: d.data().name})), 'popContainer');
        }

        async function renderUserCollections() {
            if(userData?.favorites?.length) { 
                document.getElementById('favBlock').style.display = 'block'; 
                renderChips(userData.favorites, 'favContainer'); 
            }
            if(userData?.recents?.length) renderChips(userData.recents.slice(-8).reverse(), 'recentContainer');
        }

        function renderChips(list, target) {
            const container = document.getElementById(target);
            container.innerHTML = '';
            const unique = Array.from(new Map(list.map(item => [item.id, item])).values());
            unique.forEach(g => {
                const c = document.createElement('div');
                c.className = 'nav-chip';
                c.innerText = g.name;
                c.onclick = () => { document.getElementById('placeId').value = g.id; window.run(); };
                container.appendChild(c);
            });
        }

        // Admin logic
        window.openAdmin = async () => {
            document.getElementById('adminModal').style.display = 'flex';
            const usersSnap = await getDocs(collection(db, "users"));
            document.getElementById('userCount').innerText = "Total Registered Users: " + usersSnap.size;
            
            const popSnap = await getDocs(query(collection(db, "popular"), orderBy("count", "desc"), limit(20)));
            const list = document.getElementById('adminList');
            list.innerHTML = '';
            popSnap.forEach(d => {
                const data = d.data();
                const div = document.createElement('div');
                div.className = 'admin-item';
                div.innerHTML = \`<span>\${data.name} (\${data.count})</span> <button onclick="hideGame('\${d.id}', \${data.hidden})" style="color:\${data.hidden?'#4ade80':'#ff4444'}; background:none; border:none; cursor:pointer; font-weight:900;">\${data.hidden?'SHOW':'HIDE'}</button>\`;
                list.appendChild(div);
            });
        };

        window.hideGame = async (id, state) => {
            await updateDoc(doc(db, "popular", id), { hidden: !state });
            openAdmin(); // Refresh panel
            loadPopular(); // Refresh home
        };

        loadPopular();
    </script>
</body></html>`;
