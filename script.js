const supabaseUrl = 'https://hysjbwysizpczgcsqvuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2pid3lzaXpwY3pnY3NxdnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjA2MTYsImV4cCI6MjA3OTQ5NjYxNn0.sLSfXMn9htsinETKUJ5IAsZ2l774rfeaNNmB7mVQcR4';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let globalData = []; 
let globalHistory = [];
let vipLists = {1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};
let achieverTxtContent = "";
let sortState = {col:'joinDate', dir:'asc'};

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    
    // Inisialisasi User Asli
    if (isLoggedIn && !sessionStorage.getItem('realUserUid')) {
        sessionStorage.setItem('realUserUid', sessionStorage.getItem('userUid'));
    }

    if (!isLoggedIn && !path.includes('index.html') && !path.endsWith('/')) {
        window.location.href = 'index.html';
        return;
    }

    if (isLoggedIn) {
        await loadData();
    }

    if (path.includes('index.html') || path.endsWith('/')) {
        const btn = document.getElementById('loginButton');
        if(btn) btn.addEventListener('click', doLogin);
    } else if (path.includes('dashboard.html')) {
        renderDashboard(); 
        startCountdown();
    } else if (path.includes('list.html')) {
        prepareMyTeamData();
        initList();
    } else if (path.includes('network.html')) {
        prepareMyTeamData();
        initNetwork();
    }
});

async function loadData() {
    try {
        const { data: members, error: errMem } = await db.from('members').select('*');
        if (errMem) throw errMem;
        
        globalData = members.map(a => ({
            uid: String(a.UID || a.uid).trim(),
            name: (a.Nama || a.nama || a.name || '-').trim(),
            upline: a.Upline || a.upline ? String(a.Upline || a.upline).trim() : "",
            joinDate: new Date(a.TanggalBergabung || a.tanggalbergabung || a.joinDate)
        }));

        const { data: history, error: errHist } = await db.from('vip_history').select('*');
        if (!errHist) globalHistory = history;

    } catch (err) {
        console.error("Gagal load data:", err);
    }
}

// === FUNGSI JARINGAN (GOJS STABIL) ===
let myTeamData = [];
function prepareMyTeamData(){
    const userUid = sessionStorage.getItem('userUid');
    const user = globalData.find(m => m.uid === userUid);
    if(user){
        myTeamData = [user, ...getDownlinesRecursive(userUid)];
    }
}

function initNetwork() {
    if (!myTeamData.length) return;
    const $ = go.GraphObject.make;
    const diagram = $(go.Diagram, "networkDiagram", {
        padding: 20,
        layout: $(go.TreeLayout, { angle: 90, layerSpacing: 40 }),
        "undoManager.isEnabled": true,
        initialContentAlignment: go.Spot.Center,
        minScale: 0.1,
        maxScale: 1.5
    });

    diagram.nodeTemplate = $(go.Node, "Auto",
        $(go.Shape, "RoundedRectangle", { fill: "#111", stroke: "#D4AF37", strokeWidth: 2 }),
        $(go.Panel, "Vertical",
            { margin: 8 },
            $(go.TextBlock, { stroke: "white", font: "bold 12px sans-serif", margin: 2 },
              new go.Binding("text", "labelName")),
            $(go.TextBlock, { stroke: "#D4AF37", font: "10px monospace" },
              new go.Binding("text", "labelUid"))
        )
    );

    diagram.linkTemplate = $(go.Link, 
        { routing: go.Link.Orthogonal, corner: 5 },
        $(go.Shape, { strokeWidth: 1.5, stroke: "#666" })
    );

    const nodes = myTeamData.map(m => ({ 
        key: m.uid, 
        labelName: m.name,
        labelUid: m.uid
    }));
    
    const links = myTeamData.filter(m => m.upline && m.upline !== "").map(m => ({ from: m.upline, to: m.uid }));

    diagram.model = new go.GraphLinksModel(nodes, links);
    
    window.downloadNetworkImage = function() {
        const img = diagram.makeImage({ scale: 2, background: "#000" });
        const a = document.createElement('a');
        a.href = img.src;
        a.download = 'jaringan.png';
        a.click();
    };
}

// === DASHBOARD LOGIC ===
function renderDashboard() {
    if (!globalData || globalData.length === 0) return;

    const currentUid = sessionStorage.getItem('userUid');
    const realUid = sessionStorage.getItem('realUserUid'); 
    const currentUser = globalData.find(m => m.uid === currentUid);

    if (!currentUser) return logout();

    const returnBtn = document.getElementById('returnToMeBtn');
    if (realUid && currentUid !== realUid) {
        returnBtn.style.display = 'block';
    } else {
        returnBtn.style.display = 'none';
    }

    document.getElementById('mName').innerText = currentUser.name;
    document.getElementById('mUid').innerText = currentUser.uid;
    const uplineData = globalData.find(m => m.uid === currentUser.upline);
    document.getElementById('mRefUid').innerText = uplineData ? uplineData.uid : '-';

    const downlines = getDownlinesRecursive(currentUid);
    const totalTeam = 1 + downlines.length; 
    document.getElementById('totalMembers').innerText = totalTeam;

    calculateMyRank(totalTeam, globalData.filter(m => m.upline === currentUid).length, currentUid);
    
    const teamFull = [currentUser, ...downlines];
    countVipStats(teamFull);
    renderTargetChart(totalTeam);

    // Hitung Growth (Periode Berjalan)
    const now = new Date();
    const d = now.getDate();
    const m = now.getMonth();
    const y = now.getFullYear();
    let startP, endP, pLabel;

    if (d <= 15) {
        startP = new Date(y, m, 1);
        endP = new Date(y, m, 15, 23, 59, 59);
        pLabel = `PERIODE 1 (${getMonthName(m)})`;
    } else {
        startP = new Date(y, m, 16);
        endP = new Date(y, m + 1, 0, 23, 59, 59);
        pLabel = `PERIODE 2 (${getMonthName(m)})`;
    }
    
    document.getElementById('currentPeriodLabel').innerText = pLabel;

    const prevCount = teamFull.filter(m => m.joinDate < startP).length;
    const newCount = teamFull.filter(m => m.joinDate >= startP && m.joinDate <= endP).length;
    
    const targetGrowth = Math.ceil(prevCount / 2); 
    let gap = targetGrowth - newCount;
    if (gap < 0) gap = 0;

    document.getElementById('prevPeriodCount').innerText = prevCount;
    document.getElementById('targetCount').innerText = targetGrowth;
    document.getElementById('newMemberCount').innerText = newCount;
    document.getElementById('gapCount').innerText = gap;

    renderChart(newCount, targetGrowth);
}

// === FUNGSI PERAIH 50% (DIPERBAIKI: PERIODE SEBELUMNYA) ===
function openAchieverModal() {
    const modal = document.getElementById('achieverModal');
    const body = document.getElementById('achieverBody');
    const title = document.getElementById('achieverTitle');
    const btnDl = document.getElementById('btnDlAchiever');
    modal.style.display = 'flex'; body.innerHTML = '<div class="v-empty">Sedang menghitung data...</div>'; 
    achieverTxtContent = "DATA PERAIH 50%\n\n";

    setTimeout(() => {
        const currentUid = sessionStorage.getItem('userUid');
        const now = new Date();
        const d = now.getDate();
        const m = now.getMonth();
        const y = now.getFullYear();
        let startP, endP, plabel;

        // LOGIKA PERIODE SEBELUMNYA (PREVIOUS)
        if (d > 15) {
            // Jika hari ini tgl 16-31, maka periode sebelumnya adalah tgl 1-15 bulan INI
            startP = new Date(y, m, 1);
            endP = new Date(y, m, 15, 23, 59, 59);
            plabel = `PERIODE 1 (${getMonthName(m)} ${y})`;
        } else {
            // Jika hari ini tgl 1-15, maka periode sebelumnya adalah tgl 16-Akhir bulan LALU
            let pm = m - 1;
            let py = y;
            if (pm < 0) { pm = 11; py--; }
            startP = new Date(py, pm, 16);
            endP = new Date(py, pm + 1, 0, 23, 59, 59);
            plabel = `PERIODE 2 (${getMonthName(pm)} ${py})`;
        }

        title.innerText = `PERAIH 50% - ${plabel}`; 
        
        const myTeam = [globalData.find(m => m.uid === currentUid), ...getDownlinesRecursive(currentUid)];
        let achievers = [];

        myTeam.forEach((mem) => {
            if (!mem) return;
            const memDownlines = getDownlinesRecursive(mem.uid);
            
            // Hitung di Periode Tersebut
            const base = memDownlines.filter(d => d.joinDate < startP).length + 1; // Total Member Sebelum Periode Itu
            const grow = memDownlines.filter(d => d.joinDate >= startP && d.joinDate <= endP).length; // Growth di Periode Itu
            
            const target = Math.ceil(base / 2);
            const rank = getRankLevel(mem.uid);

            if (grow >= target && grow > 0) {
                achievers.push({
                    name: mem.name,
                    uid: mem.uid,
                    rank: rank,
                    target: target,
                    actual: grow
                });
            }
        });

        achievers.sort((a,b) => b.actual - a.actual);

        if (achievers.length === 0) {
            body.innerHTML = '<div class="v-empty">Belum ada yang mencapai target pada periode tersebut.</div>';
        } else {
            let html = '';
            let count = 0;
            achievers.forEach(ach => {
                count++;
                html += `
                <div class="achiever-item">
                    <div class="achiever-top">
                        <span class="v-n" style="font-size:11px;">${count}. ${ach.name}</span>
                        <span class="achiever-rank-badge">VIP ${ach.rank}</span>
                    </div>
                    <div style="font-size:9px; color:#666; margin-bottom:5px;">UID: ${ach.uid}</div>
                    <div class="achiever-stats">
                        <span>Target: <b class="val-target">${ach.target}</b></span>
                        <span>Capaian: <b class="val-actual">${ach.actual}</b></span>
                    </div>
                </div>`;
                achieverTxtContent += `${count}. ${ach.name} (VIP ${ach.rank}) - Target: ${ach.target}, Actual: ${ach.actual}\n`;
            });
            body.innerHTML = html;
        }
    }, 100);
}

// === VIP LIST & SORTING ===
window.openVipModal = function(level) {
    const modal = document.getElementById('vipModal');
    const body = document.getElementById('modalBody');
    const title = document.getElementById('modalTitle');
    title.innerText = `DAFTAR V.I.P ${level}`;
    body.innerHTML = '';
    
    let list = vipLists[level];
    
    // Sort: Terbaru ke Terlama
    list.sort((a, b) => {
        const histA = globalHistory.find(h => h.uid === a.uid && h.vip_level === level);
        const histB = globalHistory.find(h => h.uid === b.uid && h.vip_level === level);
        const dateA = histA ? new Date(histA.achieved_at) : new Date(a.joinDate);
        const dateB = histB ? new Date(histB.achieved_at) : new Date(b.joinDate);
        return dateB - dateA; 
    });

    if (list.length === 0) {
        body.innerHTML = '<div class="v-empty">Belum ada anggota.</div>';
    } else {
        list.forEach(m => {
            const hist = globalHistory.find(h => h.uid === m.uid && h.vip_level === level);
            const dateObj = hist ? new Date(hist.achieved_at) : new Date(m.joinDate);
            const dateStr = dateObj.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) + 
                            ' ' + dateObj.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});

            const isNew = (new Date() - dateObj) < (24*60*60*1000);
            const alertClass = isNew ? 'new-name-alert' : '';
            const badge = isNew ? '🔥' : '';

            body.innerHTML += `
            <div class="v-item ${alertClass}">
                <div style="display:flex; flex-direction:column;">
                    <span class="v-n">${m.name} ${badge}</span>
                    <small style="color:#666; font-size:9px;">${dateStr}</small>
                </div>
                <span class="v-u">${m.uid}</span>
            </div>`;
        });
    }
    modal.style.display = 'flex';
}

// === UTILS ===
function getDownlinesRecursive(uid) {
    let list = [];
    const children = globalData.filter(m => m.upline === uid);
    children.forEach(child => {
        list.push(child);
        list = list.concat(getDownlinesRecursive(child.uid));
    });
    return list;
}

function countSpecificVipInTeam(teamMembers, targetLevel) {
    let count = 0;
    for (let i = 1; i < teamMembers.length; i++) { 
        const rank = getRankLevel(teamMembers[i].uid); 
        if (rank >= targetLevel) count++;
    }
    return count;
}

function getRankLevel(uid) {
    const tm = [globalData.find(m => m.uid === uid), ...getDownlinesRecursive(uid)];
    const total = tm.length;
    const direct = globalData.filter(m => m.upline === uid).length;
    if (total >= 3501 && countSpecificVipInTeam(tm, 2) >= 2) return 9;
    if (total >= 1601 && countSpecificVipInTeam(tm, 2) >= 2) return 8;
    if (total >= 901 && countSpecificVipInTeam(tm, 2) >= 2) return 7;
    if (total >= 501 && countSpecificVipInTeam(tm, 2) >= 2) return 6;
    if (total >= 351 && countSpecificVipInTeam(tm, 2) >= 2) return 5;
    if (total >= 201 && countSpecificVipInTeam(tm, 2) >= 2) return 4;
    if (total >= 101 && countSpecificVipInTeam(tm, 2) >= 2) return 3;
    if (total >= 31 && countSpecificVipInTeam(tm, 1) >= 2) return 2;
    if (direct >= 5) return 1;
    return 0;
}

function calculateMyRank(totalTeam, direct, uid) {
    const myRank = getRankLevel(uid);
    document.getElementById('rankName').innerText = myRank > 0 ? `V.I.P ${myRank}` : 'MEMBER';
    const nextLevels = [{ l: 1, req: '5 Direct' }, { l: 2, req: '31 Team + 2 VIP1' }, { l: 3, req: '101 Team + 2 VIP2' }, { l: 4, req: '201 Team + 2 VIP2' }, { l: 5, req: '351 Team + 2 VIP2' }];
    const next = nextLevels.find(n => n.l === myRank + 1);
    document.getElementById('rankNextGoal').innerText = next ? `Target: ${next.req}` : 'Top Rank';
}

function countVipStats(teamArray) {
    for(let i=1; i<=9; i++) {
        vipLists[i] = [];
        const box = document.getElementById(`cVIP${i}`);
        const boxParent = document.getElementById(`cVIP${i}Box`);
        if(box) box.innerText = 0;
        if(boxParent) boxParent.classList.remove('new-alert');
    }
    teamArray.forEach(m => {
        const rank = getRankLevel(m.uid);
        if (rank > 0) {
            vipLists[rank].push(m);
            checkHistory(m.uid, rank).then(isNew => {
                if (isNew) {
                    const boxParent = document.getElementById(`cVIP${rank}Box`);
                    if(boxParent) boxParent.classList.add('new-alert');
                }
            });
        }
    });
    for(let i=1; i<=9; i++) {
        const box = document.getElementById(`cVIP${i}`);
        if(box) box.innerText = vipLists[i].length;
    }
}

async function checkHistory(uid, level) {
    let hist = globalHistory.find(h => h.uid === uid && h.vip_level === level);
    if (!hist) {
        const now = new Date().toISOString();
        db.from('vip_history').insert([{ uid, vip_level: level, achieved_at: now }]);
        globalHistory.push({ uid, vip_level: level, achieved_at: now });
        return true;
    }
    const achieveTime = new Date(hist.achieved_at);
    return (new Date() - achieveTime) < (24*60*60*1000);
}

// LOGIN & LOGOUT
async function doLogin() {
    const uidInput = document.getElementById('loginUid').value.trim();
    if (!uidInput) return;
    document.getElementById('loginButton').innerText = "Loading...";
    await loadData();
    const user = globalData.find(m => m.uid === uidInput);
    if (user) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userUid', user.uid);
        sessionStorage.setItem('realUserUid', user.uid);
        window.location.href = 'dashboard.html';
    } else {
        document.getElementById('error').innerText = "UID Tidak Terdaftar";
        document.getElementById('loginButton').innerText = "MASUK";
    }
}

function viewUpline() {
    const currentUid = sessionStorage.getItem('userUid');
    const user = globalData.find(m => m.uid === currentUid);
    if (user && user.upline && globalData.find(m => m.uid === user.upline)) {
        sessionStorage.setItem('userUid', user.upline);
        location.reload();
    } else { alert("Tidak ada upline."); }
}

function returnToMyDashboard() {
    const real = sessionStorage.getItem('realUserUid');
    if (real) { sessionStorage.setItem('userUid', real); location.reload(); }
}

// CHART & MOTIVASI
function renderTargetChart(total) {
    const nextTarget = Math.ceil((total + 1)/1000)*1000;
    document.getElementById('nextTargetNum').innerText = nextTarget;
    document.getElementById('targetGap').innerText = Math.max(0, nextTarget - total);
    const ctx = document.getElementById('targetChart').getContext('2d');
    if(window.donut) window.donut.destroy();
    window.donut = new Chart(ctx, {type:'doughnut', data:{datasets:[{data:[total, nextTarget-total], backgroundColor:['#D4AF37','#222'], borderWidth:0}]}, options:{cutout:'80%', plugins:{tooltip:{enabled:false}}}});
}

function renderChart(growth, target) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    if (window.bar) window.bar.destroy();
    window.bar = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['Target', 'Actual'], datasets: [{ data: [target, growth], backgroundColor: ['#333', '#D4AF37'], borderRadius:4, barThickness:30 }] },
        options: { plugins: {legend:{display:false}}, scales:{y:{display:false}, x:{grid:{display:false}, ticks:{color:'#888'}}} }
    });
}

function openBroadcastModal() {
    const total = document.getElementById('totalMembers').innerText;
    const gap = document.getElementById('gapCount').innerText;
    document.getElementById('broadcastText').value = `🔥 *UPDATE TIM* 🔥\nTotal: ${total}\nKekurangan Target 50%: ${gap}\n#Gaspol`;
    document.getElementById('broadcastModal').style.display = 'flex';
}

function copyBroadcast() {
    document.getElementById("broadcastText").select(); document.execCommand("copy");
    document.getElementById('broadcastModal').style.display = 'none';
}

function downloadAchieverData() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([achieverTxtContent], {type: 'text/plain'}));
    a.download = 'achievers.txt';
    a.click();
}

window.closeVipModal = function() { document.getElementById('vipModal').style.display = 'none'; }
window.closeAchieverModal = function() { document.getElementById('achieverModal').style.display = 'none'; }

function startCountdown() {
    const el = document.getElementById('countdownTimer');
    setInterval(() => {
        const now = new Date();
        const d = now.getDate();
        let target = d <= 15 ? new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59) : new Date(now.getFullYear(), now.getMonth()+1, 0, 23, 59, 59);
        const diff = target - now;
        if (diff < 0) { el.innerText = "SELESAI"; return; }
        const days = Math.floor(diff / (1000*60*60*24));
        const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
        const min = Math.floor((diff % (1000*60*60)) / (1000*60));
        el.innerText = `${days}H ${hours}J ${min}M`;
    }, 1000);
}

function getMonthName(m) { return ["JAN","FEB","MAR","APR","MEI","JUN","JUL","AGU","SEP","OKT","NOV","DES"][m]; }

function initList(){
    const tbody = document.getElementById('membersTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    let sorted = [...myTeamData]; 
    sorted.sort((a,b) => new Date(b.joinDate) - new Date(a.joinDate));

    sorted.forEach((m, i) => {
        const d = new Date(m.joinDate).toLocaleDateString('id-ID');
        tbody.innerHTML += `<tr><td class="col-no">${i+1}</td><td class="col-name">${m.name}</td><td class="col-uid">${m.uid}</td><td class="col-ref">${m.upline}</td><td class="col-date">${d}</td></tr>`;
    });
}
