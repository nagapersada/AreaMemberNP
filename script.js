const supabaseUrl = 'https://hysjbwysizpczgcsqvuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2pid3lzaXpwY3pnY3NxdnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjA2MTYsImV4cCI6MjA3OTQ5NjYxNn0.sLSfXMn9htsinETKUJ5IAsZ2l774rfeaNNmB7mVQcR4';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let globalData = []; 
let globalHistory = [];
let vipLists = {1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};
let achieverTxtContent = "";

// INISIALISASI UTAMA
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    
    // Pastikan Real UID tersimpan saat inisialisasi jika sudah login
    if (isLoggedIn && !sessionStorage.getItem('realUserUid')) {
        sessionStorage.setItem('realUserUid', sessionStorage.getItem('userUid'));
    }

    if (!isLoggedIn && !path.includes('index.html') && !path.endsWith('/')) {
        window.location.href = 'index.html';
        return;
    }

    if (isLoggedIn) {
        await loadData(); // TUNGGU DATA SAMPAI SELESAI
    }

    if (path.includes('index.html') || path.endsWith('/')) {
        const loginBtn = document.getElementById('loginButton');
        if(loginBtn) loginBtn.addEventListener('click', doLogin);
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

// LOGIN SYSTEM
async function doLogin() {
    const uidInput = document.getElementById('loginUid').value.trim();
    const btn = document.getElementById('loginButton');
    const errText = document.getElementById('error');

    if (!uidInput) return;
    
    btn.innerText = "Loading...";
    btn.disabled = true;
    
    await loadData(); // Load data saat login
    
    const user = globalData.find(m => m.uid === uidInput);
    if (user) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userUid', user.uid);
        sessionStorage.setItem('realUserUid', user.uid);
        window.location.href = 'dashboard.html';
    } else {
        errText.innerText = "UID Tidak Terdaftar";
        btn.innerText = "MASUK";
        btn.disabled = false;
    }
}

function logout() { sessionStorage.clear(); window.location.href = 'index.html'; }

// LOGIC DASHBOARD
function renderDashboard() {
    // 1. Cek Data Ketersediaan
    if (!globalData || globalData.length === 0) {
        // Jangan reload, biarkan loading text terlihat
        return; 
    }

    const currentUid = sessionStorage.getItem('userUid');
    const realUid = sessionStorage.getItem('realUserUid'); 
    const currentUser = globalData.find(m => m.uid === currentUid);

    if (!currentUser) return logout();

    // 2. Tampilkan Tombol Kembali jika sedang intip Upline
    const returnBtn = document.getElementById('returnToMeBtn');
    if (realUid && currentUid !== realUid) {
        returnBtn.style.display = 'block';
    } else {
        returnBtn.style.display = 'none';
    }

    // 3. Render Data Dasar
    document.getElementById('mName').innerText = currentUser.name;
    document.getElementById('mUid').innerText = currentUser.uid;
    
    const uplineData = globalData.find(m => m.uid === currentUser.upline);
    document.getElementById('mRefUid').innerText = uplineData ? uplineData.uid : '-';

    // 4. Hitung Statistik Tim
    const downlines = getDownlinesRecursive(currentUid);
    const totalTeam = 1 + downlines.length; // +1 diri sendiri
    document.getElementById('totalMembers').innerText = totalTeam;

    // 5. Hitung Peringkat & VIP
    calculateMyRank(totalTeam, globalData.filter(m => m.upline === currentUid).length, currentUid);
    
    // Gabungkan array untuk proses VIP
    const teamFull = [currentUser, ...downlines];
    countVipStats(teamFull);
    renderTargetChart(totalTeam);

    // 6. Hitung Periode & Growth Chart
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

    // Hitung Growth (New Member di periode ini)
    const prevCount = teamFull.filter(m => m.joinDate < startP).length; // Total member SEBELUM periode ini
    const newCount = teamFull.filter(m => m.joinDate >= startP && m.joinDate <= endP).length; // Member BARU di periode ini
    
    const targetGrowth = Math.ceil(prevCount / 2); // Target 50% dari total sebelumnya
    let gap = targetGrowth - newCount;
    if (gap < 0) gap = 0;

    document.getElementById('prevPeriodCount').innerText = prevCount;
    document.getElementById('targetCount').innerText = targetGrowth;
    document.getElementById('newMemberCount').innerText = newCount;
    document.getElementById('gapCount').innerText = gap;

    // Render Bar Chart
    renderChart(newCount, targetGrowth);
}

// FUNGSI PENDUKUNG
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
    for (let i = 1; i < teamMembers.length; i++) { // Mulai dari 1 karena 0 adalah diri sendiri
        const rank = getRankLevel(teamMembers[i].uid); 
        if (rank >= targetLevel) count++;
    }
    return count;
}

function getRankLevel(uid) {
    const tm = [globalData.find(m => m.uid === uid), ...getDownlinesRecursive(uid)];
    const total = tm.length;
    const direct = globalData.filter(m => m.upline === uid).length;
    
    // Syarat VIP (Hardcoded Logic)
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
    
    // Teks Next Rank (Simplified)
    const nextLevels = [
        { l: 1, req: '5 Direct' }, { l: 2, req: '31 Team + 2 VIP1' }, 
        { l: 3, req: '101 Team + 2 VIP2' }, { l: 4, req: '201 Team + 2 VIP2' },
        { l: 5, req: '351 Team + 2 VIP2' }, { l: 6, req: '501 Team + 2 VIP2' }
    ];
    const next = nextLevels.find(n => n.l === myRank + 1);
    document.getElementById('rankNextGoal').innerText = next ? `Target: ${next.req}` : 'Top Rank';
}

function countVipStats(teamArray) {
    // Reset Counts
    for(let i=1; i<=9; i++) {
        vipLists[i] = [];
        const box = document.getElementById(`cVIP${i}`);
        const boxParent = document.getElementById(`cVIP${i}Box`);
        if(box) box.innerText = 0;
        if(boxParent) boxParent.classList.remove('new-alert');
    }

    const now = new Date();
    const oneDay = 24*60*60*1000;

    teamArray.forEach(m => {
        const rank = getRankLevel(m.uid);
        if (rank > 0) {
            vipLists[rank].push(m);
            // Cek History untuk animasi kedip
            checkHistory(m.uid, rank).then(isNew => {
                if (isNew) {
                    const boxParent = document.getElementById(`cVIP${rank}Box`);
                    if(boxParent) boxParent.classList.add('new-alert');
                }
            });
        }
    });

    // Update Angka
    for(let i=1; i<=9; i++) {
        const box = document.getElementById(`cVIP${i}`);
        if(box) box.innerText = vipLists[i].length;
    }
}

async function checkHistory(uid, level) {
    let hist = globalHistory.find(h => h.uid === uid && h.vip_level === level);
    if (!hist) {
        // Jika belum ada di history, simpan (New Rank!)
        const now = new Date().toISOString();
        db.from('vip_history').insert([{ uid, vip_level: level, achieved_at: now }]);
        globalHistory.push({ uid, vip_level: level, achieved_at: now });
        return true; // BARU
    }
    // Cek apakah < 24 jam
    const achieveTime = new Date(hist.achieved_at);
    return (new Date() - achieveTime) < (24*60*60*1000);
}

// VIEW UPLINE FEATURE
function viewUpline() {
    const currentUid = sessionStorage.getItem('userUid');
    const user = globalData.find(m => m.uid === currentUid);
    if (user && user.upline && globalData.find(m => m.uid === user.upline)) {
        sessionStorage.setItem('userUid', user.upline);
        location.reload();
    } else {
        alert("Tidak ada upline atau data belum siap.");
    }
}

function returnToMyDashboard() {
    const real = sessionStorage.getItem('realUserUid');
    if (real) {
        sessionStorage.setItem('userUid', real);
        location.reload();
    }
}

// RENDER CHARTS
function renderTargetChart(currentTotal) {
    const milestones = [5, 31, 101, 201, 351, 501, 901, 1601, 3501];
    let nextTarget = milestones.find(m => m > currentTotal);
    if (!nextTarget) nextTarget = Math.ceil((currentTotal + 1)/1000)*1000;
    
    document.getElementById('nextTargetNum').innerText = nextTarget;
    document.getElementById('targetGap').innerText = Math.max(0, nextTarget - currentTotal);

    const ctx = document.getElementById('targetChart').getContext('2d');
    if (window.donutChart) window.donutChart.destroy();
    window.donutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [currentTotal, nextTarget - currentTotal],
                backgroundColor: ['#D4AF37', '#222'],
                borderWidth: 0
            }]
        },
        options: { cutout: '80%', plugins: { tooltip: {enabled: false} } }
    });
}

function renderChart(growth, target) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    if (window.barChart) window.barChart.destroy();
    window.barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Target', 'Actual'],
            datasets: [{
                data: [target, growth],
                backgroundColor: ['#333', '#D4AF37'],
                barThickness: 20
            }]
        },
        options: { 
            plugins: { legend: {display: false} },
            scales: { x: { grid: {display: false}, ticks: {color: '#888'} }, y: { display: false } } 
        }
    });
}

// MODALS
window.openVipModal = function(level) {
    const modal = document.getElementById('vipModal');
    const body = document.getElementById('modalBody');
    document.getElementById('modalTitle').innerText = `DAFTAR V.I.P ${level}`;
    body.innerHTML = '';
    
    const list = vipLists[level];
    if (list.length === 0) {
        body.innerHTML = '<div class="v-empty">Belum ada anggota.</div>';
    } else {
        list.forEach(m => {
            // Cek history utk kedip nama
            checkHistory(m.uid, level).then(isNew => {
                const badge = isNew ? '🔥' : '';
                const alertClass = isNew ? 'new-name-alert' : '';
                const html = `
                <div class="v-item ${alertClass}">
                    <div style="display:flex; flex-direction:column;">
                        <span class="v-n">${m.name} ${badge}</span>
                        <span class="v-u">${m.uid}</span>
                    </div>
                </div>`;
                body.innerHTML += html;
            });
        });
    }
    modal.style.display = 'flex';
}

function openAchieverModal() {
    const modal = document.getElementById('achieverModal');
    const body = document.getElementById('achieverBody');
    document.getElementById('achieverTitle').innerText = "PERAIH 50%";
    body.innerHTML = ''; 
    achieverTxtContent = "DATA PERAIH 50%\n\n";

    const currentUid = sessionStorage.getItem('userUid');
    const now = new Date();
    // Tentukan Range Periode
    let startP, endP;
    if (now.getDate() <= 15) {
        startP = new Date(now.getFullYear(), now.getMonth(), 1);
        endP = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59);
    } else {
        startP = new Date(now.getFullYear(), now.getMonth(), 16);
        endP = new Date(now.getFullYear(), now.getMonth()+1, 0, 23, 59, 59);
    }

    const myTeam = [globalData.find(m => m.uid === currentUid), ...getDownlinesRecursive(currentUid)];
    let count = 0;

    myTeam.forEach((mem, idx) => {
        if (!mem) return;
        // Hitung growth member ini
        const memDownlines = getDownlinesRecursive(mem.uid);
        const prev = memDownlines.filter(d => d.joinDate < startP).length + 1; 
        const grow = memDownlines.filter(d => d.joinDate >= startP && d.joinDate <= endP).length;
        const target = Math.floor(prev / 2);
        const rank = getRankLevel(mem.uid);

        if (grow >= target && grow > 0 && rank >= 1) {
            count++;
            const row = `
            <div class="achiever-item">
                <div class="achiever-top">
                    <span class="v-n" style="font-size:11px;">${count}. ${mem.name}</span>
                    <span class="achiever-rank-badge">VIP ${rank}</span>
                </div>
                <div class="achiever-stats">
                    <span>Target: <b class="val-target">${target}</b></span>
                    <span>Capaian: <b class="val-actual">${grow}</b></span>
                </div>
            </div>`;
            body.innerHTML += row;
            achieverTxtContent += `${count}. ${mem.name} (VIP ${rank}) - Target: ${target}, Actual: ${grow}\n`;
        }
    });

    if (count === 0) body.innerHTML = '<div class="v-empty">Belum ada yang mencapai target.</div>';
    
    modal.style.display = 'flex';
}

function openBroadcastModal() {
    const total = document.getElementById('totalMembers').innerText;
    const gap = document.getElementById('gapCount').innerText;
    const text = `🔥 *UPDATE TIM* 🔥\nTotal: ${total}\nKekurangan Target 50%: ${gap}\n#Gaspol`;
    document.getElementById('broadcastText').value = text;
    document.getElementById('broadcastModal').style.display = 'flex';
}

function copyBroadcast() {
    const t = document.getElementById("broadcastText");
    t.select(); document.execCommand("copy");
    document.getElementById('broadcastModal').style.display = 'none';
}

function downloadAchieverData() {
    const blob = new Blob([achieverTxtContent], {type: 'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'achievers.txt';
    a.click();
}

window.closeVipModal = function() { document.getElementById('vipModal').style.display = 'none'; }
window.closeAchieverModal = function() { document.getElementById('achieverModal').style.display = 'none'; }

function startCountdown() {
    const timerEl = document.getElementById('countdownTimer');
    setInterval(() => {
        const now = new Date();
        let target;
        if (now.getDate() <= 15) target = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59);
        else target = new Date(now.getFullYear(), now.getMonth()+1, 0, 23, 59, 59);
        
        const diff = target - now;
        if (diff < 0) { timerEl.innerText = "SELESAI"; return; }
        
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        timerEl.innerText = `${d}H ${h}J ${m}M`;
    }, 1000);
}

function getMonthName(m) { return ["JAN","FEB","MAR","APR","MEI","JUN","JUL","AGU","SEP","OKT","NOV","DES"][m]; }
function initList(){} 
function initNetwork(){}
