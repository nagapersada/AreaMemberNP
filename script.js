const supabaseUrl = 'https://hysjbwysizpczgcsqvuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2pid3lzaXpwY3pnY3NxdnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjA2MTYsImV4cCI6MjA3OTQ5NjYxNn0.sLSfXMn9htsinETKUJ5IAsZ2l774rfeaNNmB7mVQcR4';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let globalData=[], myTeamData=[], globalHistory=[], globalAchievers=[], globalFailures=[], sortState={col:'joinDate',dir:'asc'};
let vipLists = {1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};
let achieverTxtContent = "";

// VARIABEL GLOBAL DASHBOARD
let currentGap = 0; 
let globalTarget = 0;

// CONFIG PERINGKAT
const RANK_RULES = [
    { level: 9, min: 3501, reqVip: 8 },
    { level: 8, min: 1601, reqVip: 7 },
    { level: 7, min: 901, reqVip: 6 },
    { level: 6, min: 501, reqVip: 5 },
    { level: 5, min: 351, reqVip: 4 },
    { level: 4, min: 201, reqVip: 3 },
    { level: 3, min: 101, reqVip: 2 },
    { level: 2, min: 31, reqVip: 1 },
    { level: 1, min: 5, reqVip: 0 } 
];

document.addEventListener('DOMContentLoaded',async()=>{const a=window.location.pathname,b=sessionStorage.getItem('isLoggedIn');if(!b&&!a.includes('index.html')){window.location.href='index.html';return}if(b)await loadData();if(a.includes('index.html'))document.getElementById('loginButton').addEventListener('click',doLogin);else if(a.includes('dashboard.html'))renderDashboard();else if(a.includes('list.html')){prepareMyTeamData();initList()}else if(a.includes('network.html')){prepareMyTeamData();initNetwork()}});

// CACHE
let rankCache = {}; 
let downlineCache = {};
let legCache = {}; 

async function loadData() {
    try {
        const [membersRes, historyRes, achieverRes, failureRes] = await Promise.all([
            db.from('members').select('*'),
            db.from('vip_history').select('*'),
            db.from('achiever_history').select('*'),
            db.from('failure_history').select('*')
        ]);

        if (membersRes.error) throw membersRes.error;
        globalData = membersRes.data.map(a => ({
            uid: String(a.UID || a.uid).trim(),
            name: (a.Nama || a.nama || a.name || '-').trim(),
            upline: a.Upline || a.upline ? String(a.Upline || a.upline).trim() : "",
            joinDate: new Date(a.TanggalBergabung || a.tanggalbergabung || a.joinDate)
        }));

        if (historyRes.data) globalHistory = historyRes.data;
        if (achieverRes.data) globalAchievers = achieverRes.data;
        if (failureRes.data) globalFailures = failureRes.data;

        rankCache = {}; downlineCache = {}; legCache = {};
        
        // Bersihkan data history yang tidak valid saat load
        cleanInvalidVipHistory();

    } catch (a) {
        console.error("Load Error:", a);
        alert("Gagal memuat data. Cek koneksi internet.");
    }
}

async function cleanInvalidVipHistory() {
    const invalidIds = [];
    globalHistory.forEach(hist => {
        const currentRealRank = getRankLevel(hist.uid);
        if (hist.vip_level > currentRealRank) {
            invalidIds.push(hist.id);
        }
    });
    if (invalidIds.length > 0) {
        // Filter lokal saja agar tampilan benar
        globalHistory = globalHistory.filter(h => getRankLevel(h.uid) >= h.vip_level);
    }
}

function prepareMyTeamData(){const a=sessionStorage.getItem('userUid'),b=globalData.find(b=>b.uid===a);if(b){const c=getDownlinesRecursive(a);myTeamData=[b,...c]}}

function getDownlinesRecursive(uid){
    if(downlineCache[uid]) return downlineCache[uid];
    let b=[];
    const c=globalData.filter(b=>b.upline===uid);
    c.forEach(a=>{ b.push(a); b=b.concat(getDownlinesRecursive(a.uid)); });
    downlineCache[uid] = b;
    return b;
}

function getDirectDownlines(uid) {
    return globalData.filter(m => m.upline === uid);
}

// ============================================================
// LOGIKA PERINGKAT (CORE)
// ============================================================

function getRankLevel(uid) {
    if (rankCache[uid] !== undefined) return rankCache[uid];

    const team = getDownlinesRecursive(uid);
    const totalTeam = team.length + 1; 
    const directs = getDirectDownlines(uid);

    let currentLevel = 0;

    // VIP 1 Rule
    if (directs.length >= 5) {
        currentLevel = 1;
    }

    // VIP 2 - 9 Rules
    for (const rule of RANK_RULES) {
        if (rule.level === 1) continue; 

        if (totalTeam >= rule.min) {
            const hasStructure = checkStructureCondition(uid, rule.reqVip);
            const hasGrowth = checkGrowthCondition(uid, team, rule.min);

            if (hasStructure || hasGrowth) {
                if (rule.level > currentLevel) {
                    currentLevel = rule.level;
                    break; 
                }
            }
        }
    }

    rankCache[uid] = currentLevel;
    return currentLevel;
}

function checkStructureCondition(uid, requiredVipLevel) {
    const cacheKey = `${uid}_leg_${requiredVipLevel}`;
    if (legCache[cacheKey] !== undefined) return legCache[cacheKey];
    const directs = getDirectDownlines(uid);
    let qualifiedLegs = 0;
    for (const direct of directs) {
        if (legHasVip(direct.uid, requiredVipLevel)) {
            qualifiedLegs++;
        }
        if (qualifiedLegs >= 2) break;
    }
    const result = (qualifiedLegs >= 2);
    legCache[cacheKey] = result;
    return result;
}

function legHasVip(uid, targetLevel) {
    if (getRankLevel(uid) >= targetLevel) return true;
    const directs = getDirectDownlines(uid);
    for (const d of directs) {
        if (legHasVip(d.uid, targetLevel)) return true;
    }
    return false;
}

function checkGrowthCondition(uid, teamMembers, minMembersReq) {
    const sortedTeam = [...teamMembers].sort((a, b) => a.joinDate - b.joinDate);
    if ((sortedTeam.length + 1) < minMembersReq) return false;
    
    const triggerIdx = minMembersReq - 2; 
    if (triggerIdx < 0) return false; 

    const triggeringMember = sortedTeam[triggerIdx];
    const dateLimitReached = triggeringMember ? new Date(triggeringMember.joinDate) : new Date();

    const p1Dates = getPeriodFromDate(dateLimitReached);
    const p1Stats = calculatePeriodGrowth(uid, p1Dates.start, p1Dates.end);

    const p2Dates = getNextPeriodDates(p1Dates.end);
    if (new Date() < p2Dates.end) return false;

    const p2Stats = calculatePeriodGrowth(uid, p2Dates.start, p2Dates.end);

    const p1Success = (p1Stats.target - p1Stats.actual) <= 0;
    const p2Success = (p2Stats.target - p2Stats.actual) <= 0;

    return p1Success && p2Success;
}

// ============================================================
// MANAJEMEN TANGGAL & PERIODE
// ============================================================

// P1: Tgl 31 prev - 15 curr | P2: Tgl 16 curr - 31 curr
function getPeriodFromDate(date) {
    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear();
    let start, end;

    if (d >= 16) {
        // PERIODE 2: 16 s/d Akhir Bulan
        start = new Date(y, m, 16);
        end = new Date(y, m + 1, 0, 23, 59, 59); 
    } else {
        // PERIODE 1: 1 s/d 15 (Start ditarik dari tgl 31 bulan lalu utk data)
        let pm = m - 1; let py = y;
        if (pm < 0) { pm = 11; py--; }
        const lastDayPrev = new Date(py, pm + 1, 0).getDate();
        
        start = new Date(py, pm, lastDayPrev); // Start Tgl 30/31 Bulan Lalu
        end = new Date(y, m, 15, 23, 59, 59); // End Tgl 15 Bulan Ini
    }
    return { start, end };
}

function getNextPeriodDates(prevPeriodEndDate) {
    const nextStart = new Date(prevPeriodEndDate.getTime() + 2000); 
    return getPeriodFromDate(nextStart);
}

function getPreviousPeriodDates(currentPeriodStartDate) {
    const prevEnd = new Date(currentPeriodStartDate.getTime() - 2000); 
    return getPeriodFromDate(prevEnd);
}

function calculatePeriodGrowth(uid, startDate, endDate) {
    const team = getDownlinesRecursive(uid);
    const downlinesBefore = team.filter(m => m.joinDate < startDate).length;
    const baseCount = 1 + downlinesBefore;
    const target = Math.ceil(baseCount / 2);
    const actual = team.filter(m => m.joinDate >= startDate && m.joinDate <= endDate).length;
    return { baseCount, target, actual };
}

// ============================================================
// DASHBOARD & UI
// ============================================================

function doLogin(){
    const a=document.getElementById('loginUid').value.trim(),b=document.getElementById('loginButton'),c=document.getElementById('error');
    if(!a)return void(c.innerText="Masukkan UID");
    b.innerText="..."; b.disabled=!0; c.innerText="";
    loadData().then(() => {
        const d=globalData.find(m=>m.uid===a);
        if(d){
            sessionStorage.setItem('isLoggedIn','true');
            sessionStorage.setItem('userUid',d.uid);
            window.location.href='dashboard.html';
        } else {
            c.innerText="UID Tidak Terdaftar"; b.innerText="MASUK"; b.disabled=!1;
        }
    });
}

function logout(){sessionStorage.clear(),window.location.href='index.html'}

function renderDashboard(){
    const uid=sessionStorage.getItem('userUid');if(!globalData.length)return void location.reload();const user=globalData.find(b=>b.uid===uid);if(!user)return logout();
    document.getElementById('mName').innerText=user.name,document.getElementById('mUid').innerText=user.uid;const upline=globalData.find(a=>a.uid===user.upline);document.getElementById('mRefUid').innerText=upline?upline.uid:'-';
    
    rankCache = {}; legCache = {}; 
    const downlines=getDownlinesRecursive(uid);
    document.getElementById('totalMembers').innerText = downlines.length + 1; 
    
    calculateMyRank(downlines.length + 1, uid);
    
    myTeamData = [user, ...downlines];
    
    // PERIODE BERJALAN
    const now = new Date();
    const currP = getPeriodFromDate(now);
    
    // Gunakan End Date untuk nama bulan
    const pMonthName = getMonthName(currP.end.getMonth());
    const isP2 = currP.end.getDate() > 15;
    
    document.getElementById('currentPeriodLabel').innerText = `PERIODE ${isP2?2:1} (${pMonthName})`;
    
    startCountdown(currP.end);
    showMotivation();

    const currStats = calculatePeriodGrowth(uid, currP.start, currP.end);
    let gap = currStats.target - currStats.actual; if(gap<0) gap=0;
    
    document.getElementById('prevPeriodCount').innerText = currStats.baseCount; 
    document.getElementById('targetCount').innerText = currStats.target;
    document.getElementById('newMemberCount').innerText = currStats.actual;
    document.getElementById('gapCount').innerText = gap;

    currentGap = gap; globalTarget = currStats.target;

    const prevP = getPreviousPeriodDates(currP.start);
    const prevStats = calculatePeriodGrowth(uid, prevP.start, prevP.end);
    renderChart(prevStats.actual, currStats.actual);

    countVipStats();
}

function calculateMyRank(teamSize, uid) {
    const curLevel = getRankLevel(uid);
    document.getElementById('rankName').innerText = curLevel > 0 ? `V.I.P ${curLevel}` : "MEMBER";

    const nextLvl = curLevel + 1;
    const nextRule = RANK_RULES.find(r => r.level === nextLvl);
    const goalEl = document.getElementById('rankNextGoal');
    const gapEl = document.getElementById('nextLevelGap');

    if (nextRule) {
        if (nextLvl === 1) {
            // Khusus VIP 1
            const directs = getDirectDownlines(uid).length;
            const gap = Math.max(0, 5 - directs);
            goalEl.innerText = "Target: 5 Downline Langsung";
            gapEl.innerText = gap;
        } else {
            const gapMem = Math.max(0, nextRule.min - teamSize);
            
            // TAMPILAN 2 BARIS SESUAI PERMINTAAN TERAKHIR
            goalEl.innerHTML = `Menuju VIP ${nextLvl}<br><span style="font-size:9px; color:#888; font-style:italic;">(Syarat: 2 Kaki @VIP${nextRule.reqVip} ATAU Growth 50%)</span>`;
            
            gapEl.innerText = gapMem;
        }
    } else {
        goalEl.innerText = "Top Level";
        gapEl.innerText = "0";
    }
}

function renderChart(prevVal, currVal){
    const ctx = document.getElementById('growthChart').getContext('2d');
    if(window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['LALU', 'SAAT INI'],
            datasets: [{
                label: 'Growth',
                data: [prevVal, currVal],
                backgroundColor: ['#333', '#D4AF37'], 
                borderColor: '#D4AF37',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#333' }, ticks: { display: false } },
                x: { grid: { display: false }, ticks: { color: '#888', font: { size: 10 } } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ============================================================
// LOGIKA TIM PER LEVEL (VIP MODAL)
// ============================================================

function countVipStats(){
    vipLists = {1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};
    let counts = {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};
    let alertStatus = {1:false,2:false,3:false,4:false,5:false,6:false,7:false,8:false,9:false};
    
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    
    myTeamData.forEach(m => {
        const r = getRankLevel(m.uid);
        if (r >= 1 && r <= 9) {
            counts[r]++;
            vipLists[r].push(m);
            const hist = globalHistory.find(h => h.uid === m.uid && h.vip_level === r);
            let achieveTime = hist ? new Date(hist.achieved_at) : new Date(m.joinDate);
            if ((now - achieveTime) < oneDay) {
                alertStatus[r] = true;
                m.isNewAlert = true; 
            }
        }
    });

    for(let i=1;i<=9;i++){
        const el=document.getElementById(`cVIP${i}`);
        if(el) {
            el.innerText = counts[i];
            const parent = el.parentElement;
            if(alertStatus[i]) parent.classList.add('new-alert');
            else parent.classList.remove('new-alert');
        }
    }
}

window.openVipModal = function(level) {
    const modal = document.getElementById('vipModal');
    const body = document.getElementById('modalBody');
    const title = document.getElementById('modalTitle');
    
    title.innerText = `DAFTAR V.I.P ${level}`; 
    body.innerHTML = ''; 

    const list = vipLists[level].sort((a,b) => {
        const histA = globalHistory.find(h => h.uid === a.uid && h.vip_level === level);
        const histB = globalHistory.find(h => h.uid === b.uid && h.vip_level === level);
        const timeA = histA ? new Date(histA.achieved_at) : new Date(a.joinDate);
        const timeB = histB ? new Date(histB.achieved_at) : new Date(b.joinDate);
        return timeB - timeA; 
    });
    
    const now = new Date();
    const currP = getPeriodFromDate(now);

    if (list.length > 0) {
        list.forEach(m => {
            const stats = calculatePeriodGrowth(m.uid, currP.start, currP.end);
            const gap = stats.target - stats.actual;
            const isAlert = m.isNewAlert ? 'new-name-alert' : '';
            
            // Format Tanggal (Pencapaian/Join) - DIKEMBALIKAN SESUAI PERMINTAAN
            const hist = globalHistory.find(h => h.uid === m.uid && h.vip_level === level);
            const dObj = hist ? new Date(hist.achieved_at) : new Date(m.joinDate);
            const dateStr = `${dObj.getDate()}/${dObj.getMonth()+1}/${dObj.getFullYear()}`;

            body.innerHTML += `
            <div class="v-item ${isAlert}">
                <div style="width:100%;">
                    <div style="display:flex; justify-content:space-between;">
                        <span class="v-n">${m.name} ${m.isNewAlert ? '🔥' : ''}</span>
                        <span class="v-u">${m.uid}</span>
                    </div>
                    
                    <small style="display:block; color:#666; font-size:9px; margin-top:2px;">
                        ${hist ? 'Peringkat:' : 'Bergabung:'} ${dateStr}
                    </small>

                    <div style="display:flex; gap:10px; font-size:9px; border-top:1px dashed #333; padding-top:4px; margin-top:4px;">
                        <span style="color:#aaa;">Target: <b style="color:#fff;">${stats.target}</b></span>
                        <span style="color:#aaa;">Capai: <b style="color:var(--gold);">${stats.actual}</b></span>
                        <span style="color:#aaa;">Sisa: <b style="color:${gap > 0 ? '#ff4444' : '#00ff00'};">${gap > 0 ? gap : 0}</b></span>
                    </div>
                </div>
            </div>`;
        });
    } else { 
        body.innerHTML = '<div class="v-empty">Belum ada anggota.</div>'; 
    }
    modal.style.display = 'flex';
}
window.closeVipModal = function() { document.getElementById('vipModal').style.display = 'none'; }


// ============================================================
// TOMBOL PERAIH (ACHIEVER)
// ============================================================

window.openAchieverModal = function() {
    const modal = document.getElementById('achieverModal'), body = document.getElementById('achieverBody'), title = document.getElementById('achieverTitle'), btnDl = document.getElementById('btnDlAchiever');
    modal.style.display = 'flex'; body.innerHTML = '<div class="v-empty">Menghitung data periode lalu...</div>'; btnDl.style.display = 'none'; achieverTxtContent = "";

    const now = new Date();
    const currP = getPeriodFromDate(now);
    
    // Perbaikan: Ambil nama bulan dari END Date periode sebelumnya
    const prevP = getPreviousPeriodDates(currP.start); 

    const pMonthName = getMonthName(prevP.end.getMonth());
    const isP2 = prevP.end.getDate() > 15;
    const pName = `PERIODE ${isP2 ? 2 : 1} (${pMonthName})`;

    title.innerText = `PERAIH - ${pName}`;
    achieverTxtContent = `REPORT GROWTH 50%\n${pName}\n================\n\n`;
    
    let successList = [];
    let failureList = [];

    setTimeout(() => {
        globalData.forEach(mem => {
            const rank = getRankLevel(mem.uid);
            if (rank >= 1) {
                const stats = calculatePeriodGrowth(mem.uid, prevP.start, prevP.end);
                const gap = stats.target - stats.actual;
                const dataObj = { name: mem.name, uid: mem.uid, rank: rank, target: stats.target, actual: stats.actual, gap: gap > 0 ? gap : 0 };
                if (gap <= 0) successList.push(dataObj); else failureList.push(dataObj);
            }
        });
        renderAchieverList(successList, failureList, body, btnDl);
    }, 100);
}

function renderAchieverList(successList, failureList, body, btnDl) {
    successList.sort((a,b) => (b.rank !== a.rank) ? b.rank - a.rank : b.actual - a.actual);
    failureList.sort((a,b) => (b.rank !== a.rank) ? b.rank - a.rank : a.gap - b.gap); 

    let html = '';
    const myUid = sessionStorage.getItem('userUid');
    btnDl.style.display = 'block';

    if (successList.length > 0) {
        html += `<div style="padding:10px 15px; background:#112211; color:#00ff00; font-weight:bold; border-bottom:1px solid #333;">🏆 BERHASIL (GROWTH 50%)</div>`; 
        achieverTxtContent += `[ BERHASIL ]\n`;
        successList.forEach((a,i) => { 
            const isMe = (a.uid === myUid);
            html += `<div class="achiever-item" style="border-left:3px solid #00ff00; ${isMe?'background:#1a2a1a;':''}">
                <div class="achiever-top"><span class="v-n">${i+1}. ${a.name} ${isMe?'(ANDA)':''} <small style="color:var(--gold)">(VIP ${a.rank})</small></span><span class="v-u">${a.uid}</span></div>
                <div class="achiever-stats"><span>Target: <b class="val-target">${a.target}</b></span><span>Capai: <b class="val-actual" style="color:#00ff00;">${a.actual}</b></span><span>Sisa: <b style="color:#00ff00;">0</b></span></div></div>`; 
            achieverTxtContent += `${i+1}. ${a.name} (${a.uid}) - VIP ${a.rank} | Target: ${a.target} | Capai: ${a.actual} | Sisa: 0\n`; 
        }); 
        achieverTxtContent += `\n`;
    }

    if (failureList.length > 0) {
        html += `<div style="padding:10px 15px; background:#221111; color:#ff4444; font-weight:bold; border-bottom:1px solid #333; margin-top:10px;">⚠️ GAGAL MENCAPAI TARGET</div>`; 
        achieverTxtContent += `[ GAGAL ]\n`;
        failureList.forEach((a,i) => { 
            const isMe = (a.uid === myUid);
            html += `<div class="achiever-item" style="border-left:3px solid #ff4444; ${isMe?'background:#2a1a1a;':''}">
                <div class="achiever-top"><span class="v-n">${i+1}. ${a.name} ${isMe?'(ANDA)':''} <small style="color:#888">(VIP ${a.rank})</small></span><span class="v-u">${a.uid}</span></div>
                <div class="achiever-stats"><span>Target: <b class="val-target">${a.target}</b></span><span>Capai: <b style="color:#ff4444;">${a.actual}</b></span><span>Sisa: <b style="color:#ff4444;">${a.gap}</b></span></div></div>`; 
            achieverTxtContent += `${i+1}. ${a.name} (${a.uid}) - VIP ${a.rank} | Target: ${a.target} | Capai: ${a.actual} | Sisa: ${a.gap}\n`; 
        });
    }

    if (successList.length === 0 && failureList.length === 0) { html = '<div class="v-empty">Tidak ada data VIP di periode lalu.</div>'; }
    body.innerHTML = html;
}

function downloadAchieverData() { if(!achieverTxtContent) return; const blob=new Blob([achieverTxtContent],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='laporan_achiever.txt'; a.click(); }
function closeAchieverModal() { document.getElementById('achieverModal').style.display = 'none'; }


// ============================================================
// UTILS & FITUR PELENGKAP
// ============================================================
function getMonthName(a){return["JAN","FEB","MAR","APR","MEI","JUN","JUL","AGU","SEP","OKT","NOV","DES"][a]}

function initList(){window.sortData=a=>{sortState.col===a?sortState.dir='asc'===sortState.dir?'desc':'asc':(sortState.col=a,sortState.dir='asc'),renderTable()},renderTable()}
function renderTable(){
    const a=document.getElementById('membersTableBody'),{col:b,dir:c}=sortState,d=[...myTeamData].sort((a,d)=>{let e=a[b],f=d[b];return'joinDate'===b?'asc'===c?e-f:f-e:(e=e.toLowerCase(),f=f.toLowerCase(),'asc'===c?e<f?-1:1:e>f?1:-1)});
    let e='';
    d.forEach((a,b)=>{
        const c=a.joinDate,d=`${String(c.getDate()).padStart(2,'0')}/${String(c.getMonth()+1).padStart(2,'0')}/${c.getFullYear()}`,f=a.upline?a.upline:'-';
        e+=`<tr><td class="col-no">${b+1}</td><td class="col-name">${a.name}</td><td class="col-uid">${a.uid}</td><td class="col-ref">${f}</td><td class="col-date">${d}</td></tr>`
    });
    a.innerHTML=e;
}

function initNetwork(){
    const a=sessionStorage.getItem('userUid'),b=go.GraphObject.make,
    c=b(go.Diagram,"networkDiagram",{padding:new go.Margin(150),scrollMode:go.Diagram.InfiniteScroll,layout:b(go.TreeLayout,{angle:0,layerSpacing:60,nodeSpacing:10}),undoManager:{isEnabled:!0},initialContentAlignment:go.Spot.Center,minScale:.1,maxScale:2});
    c.nodeTemplate=b(go.Node,"Horizontal",{selectionObjectName:"PANEL"},
        b(go.Panel,"Auto",{name:"PANEL"},
            b(go.Shape,"RoundedRectangle",{fill:"#000",strokeWidth:1},new go.Binding("stroke","strokeColor"),new go.Binding("strokeWidth","strokeWidth")),
            b(go.TextBlock,{margin:new go.Margin(2,6,2,6),stroke:"#fff",font:"11px sans-serif",textAlign:"center",maxLines:1,overflow:go.TextBlock.OverflowEllipsis},new go.Binding("text","label"))
        ),
        b("TreeExpanderButton",{width:14,height:14,alignment:go.Spot.Right,margin:new go.Margin(0,0,0,4),"ButtonBorder.fill":"#222","ButtonBorder.stroke":"#D4AF37","ButtonIcon.stroke":"white"})
    );
    c.linkTemplate=b(go.Link,{routing:go.Link.Orthogonal,corner:5},b(go.Shape,{strokeWidth:1,stroke:"white"}));
    const d=myTeamData.map(a=>{
        const b=a.joinDate;
        const c=`${String(b.getDate()).padStart(2,'0')}-${String(b.getMonth()+1).padStart(2,'0')}-${String(b.getFullYear()).slice(-2)}`;
        const rank = getRankLevel(a.uid); const isVip = rank >= 1;
        let starStr = ""; if(rank > 0) { starStr = "⭐".repeat(rank) + " "; }
        return { key:a.uid, label:`${starStr}${a.uid} / ${a.name} / ${c}`, strokeColor:isVip?"#ffd700":"#ffffff",strokeWidth:isVip?2:1 }
    });
    const e=myTeamData.filter(a=>a.upline&&""!==a.upline).map(a=>({from:a.upline,to:a.uid}));
    c.model=new go.GraphLinksModel(d,e);
    const f=c.findNodeForKey(a);f&&(c.centerRect(f.actualBounds),f.isSelected=!0),window.downloadNetworkImage=function(){const a=c.makeImage({scale:2,background:"#000",maxSize:new go.Size(Infinity,Infinity),padding:new go.Margin(50)}),b=document.createElement("a");b.href=a.src,b.download="jaringan_dvteam.png",document.body.appendChild(b),b.click(),document.body.removeChild(b)}
};

let intervalId; 
function startCountdown(targetDate) {
    if (intervalId) clearInterval(intervalId);
    function updateTimer() {
        const now = new Date().getTime(); const distance = targetDate.getTime() - now;
        if (distance < 0) { 
            document.getElementById("cdDays").textContent="00"; document.getElementById("cdHours").textContent="00"; document.getElementById("cdMin").textContent="00"; document.getElementById("cdSec").textContent="00"; 
            return; 
        }
        const days = Math.floor(distance / (1000 * 60 * 60 * 24)); const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)); const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        document.getElementById("cdDays").textContent=days<10?"0"+days:days; document.getElementById("cdHours").textContent=hours<10?"0"+hours:hours; document.getElementById("cdMin").textContent=minutes<10?"0"+minutes:minutes; document.getElementById("cdSec").textContent=seconds<10?"0"+seconds:seconds;
    }
    updateTimer(); intervalId = setInterval(updateTimer, 1000);
}

const wordBank = { openings: ["🔥 SAYA SIAP BERTEMPUR!", "⚠️ PERINGATAN KERAS!", "🚀 JANGAN LENGAH!", "🦁 BANGKITLAH PEMENANG!", "💎 MENTAL JUTAWAN!"], conditions: ["Hari ini musuhmu sedang bekerja keras,", "Target tidak akan menunggu kamu siap,", "Kemiskinan sedang mengintip di depan pintu,", "Orang lain sudah berlari dua kali lebih cepat,"], actions: ["maka HANCURKAN rasa malasmu sekarang!", "segera RAPATKAN BARISAN dan kejar ketertinggalan!", "buktikan kamu bukan PENGECUT!", "ubah keringatmu menjadi EMAS!"], closings: ["PASTI BISA!", "GASPOLL!", "TUNTASKAN!", "REBUT!", "SEKARANG!"] };
function generateDynamicQuote() { const r = (arr) => arr[Math.floor(Math.random() * arr.length)]; return `"${r(wordBank.openings)} ${r(wordBank.conditions)} ${r(wordBank.actions)} ${r(wordBank.closings)}"`; }
function showMotivation() { if (!sessionStorage.getItem('isLoggedIn')) return; const modal = document.getElementById('motivationModal'); const textEl = document.getElementById('dailyMotivation'); if (modal && textEl) { textEl.innerText = generateDynamicQuote(); modal.style.display = 'flex'; } }
window.closeMotivation = function() { const modal = document.getElementById('motivationModal'); if (modal) { modal.style.opacity = '0'; setTimeout(() => { modal.style.display = 'none'; modal.style.opacity = '1'; }, 300); } }

const groupWords = { headers: ["🔥 UPDATE MEMBARA", "🚀 INFO PENTING TIM", "⚠️ SIAGA SATU", "🏆 LAPORAN PERTEMPURAN"], intros: ["Keberhasilan tim bukan dinilai dari seberapa cepat kita berlari, tapi seberapa kuat kita saling menggandeng.", "Jangan biarkan mimpi mati hanya karena malas. INGAT ALASAN KITA MEMULAI!", "Pemenang bukan orang yang tak pernah gagal, tapi yang tak pernah menyerah."], alerts: ["Tetap fokus pada pertumbuhan 50%", "Jangan kasih kendor, kejar target 50%", "Rapatkan barisan, fokus angka 50%"], closings: ["Gow .. Gaaaaass sampai tembus..!! 💪🏻", "Ayo buktikan kita bisa..!! 🚀", "Salam satu komando..!! 🔥"] };
window.openShareModal = function() { generateShareText(); document.getElementById('shareModal').style.display = 'flex'; }
window.generateShareText = function() { const txtArea = document.getElementById('shareText'); const r = (arr) => arr[Math.floor(Math.random() * arr.length)]; const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']; const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']; const now = new Date(); const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`; const finalTxt = `${r(groupWords.headers)} \nDVTEAM NP 🔥\n\n` + `📅 ${dateStr}\n` + `👥 Target 50%: *${globalTarget} Anggota*\n\n` + `"${r(groupWords.intros)}"\n\n` + `🚀 ${r(groupWords.alerts)} = sisa ${currentGap} anggota lagi..!! 🏆\n` + `${r(groupWords.closings)}\n` + `#DVTeamNP #SatuVisi #SatuMisi #SatuKomando`; txtArea.value = finalTxt; }
window.copyShareText = function() { const txtArea = document.getElementById('shareText'); txtArea.select(); txtArea.setSelectionRange(0, 99999); navigator.clipboard.writeText(txtArea.value).then(() => { alert("✅ Teks berhasil disalin! Silakan tempel di Grup WhatsApp."); }); }
window.closeShareModal = function() { document.getElementById('shareModal').style.display = 'none'; }
