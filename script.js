const supabaseUrl = 'https://hysjbwysizpczgcsqvuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2pid3lzaXpwY3pnY3NxdnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjA2MTYsImV4cCI6MjA3OTQ5NjYxNn0.sLSfXMn9htsinETKUJ5IAsZ2l774rfeaNNmB7mVQcR4';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let globalData=[], myTeamData=[], globalHistory=[], globalAchievers=[], globalFailures=[], sortState={col:'joinDate',dir:'asc'};
let vipLists = {1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};
let achieverTxtContent = "";

// VARIABEL GLOBAL
let currentGap = 0; 
let globalTarget = 0;

document.addEventListener('DOMContentLoaded',async()=>{const a=window.location.pathname,b=sessionStorage.getItem('isLoggedIn');if(!b&&!a.includes('index.html')){window.location.href='index.html';return}if(b)await loadData();if(a.includes('index.html'))document.getElementById('loginButton').addEventListener('click',doLogin);else if(a.includes('dashboard.html'))renderDashboard();else if(a.includes('list.html')){prepareMyTeamData();initList()}else if(a.includes('network.html')){prepareMyTeamData();initNetwork()}});

async function loadData(){
    try{
        const{data:a,error:b}=await db.from('members').select('*');
        if(b)throw b;
        globalData=a.map(a=>({uid:String(a.UID||a.uid).trim(),name:(a.Nama||a.nama||a.name||'-').trim(),upline:a.Upline||a.upline?String(a.Upline||a.upline).trim():"",joinDate:new Date(a.TanggalBergabung||a.tanggalbergabung||a.joinDate)}));
        const{data:h,error:he}=await db.from('vip_history').select('*');
        if(!he) globalHistory = h;
        const{data:ac,error:ace}=await db.from('achiever_history').select('*');
        if(!ace) globalAchievers = ac;
        const{data:fl,error:fle}=await db.from('failure_history').select('*');
        if(!fle) globalFailures = fl;
    }catch(a){console.error(a)}
}

function prepareMyTeamData(){const a=sessionStorage.getItem('userUid'),b=globalData.find(b=>b.uid===a);if(b){const c=getDownlinesRecursive(a);myTeamData=[b,...c]}}
function getDownlinesRecursive(a){let b=[];const c=globalData.filter(b=>b.upline===a);return c.forEach(a=>{b.push(a),b=b.concat(getDownlinesRecursive(a.uid))}),b}
function getTotalGroupCount(a){const b=getDownlinesRecursive(a);return 1+b.length}
async function doLogin(){const a=document.getElementById('loginUid').value.trim(),b=document.getElementById('loginButton'),c=document.getElementById('error');if(!a)return void(c.innerText="Masukkan UID");b.innerText="...",b.disabled=!0,await loadData();const d=globalData.find(b=>b.uid===a);d?(sessionStorage.setItem('isLoggedIn','true'),sessionStorage.setItem('userUid',d.uid),window.location.href='dashboard.html'):(c.innerText="UID Tidak Terdaftar",b.innerText="MASUK",b.disabled=!1)}
function logout(){sessionStorage.clear(),window.location.href='index.html'}

function renderDashboard(){
    const a=sessionStorage.getItem('userUid');if(!globalData.length)return void location.reload();const b=globalData.find(b=>b.uid===a);if(!b)return logout();
    document.getElementById('mName').innerText=b.name,document.getElementById('mUid').innerText=b.uid;const c=globalData.find(a=>a.uid===b.upline);document.getElementById('mRefUid').innerText=c?c.uid:'-';
    const d=getDownlinesRecursive(a),e=1+d.length;
    document.getElementById('totalMembers').innerText=e;
    const f=globalData.filter(b=>b.upline===a).length;
    calculateMyRank(e,f,b.uid);
    const g=[b,...d];
    myTeamData = g; 
    countVipStats(g); 
    
    // LOGIKA PERIODE & CHART (PRESISI)
    const h=new Date,i=h.getDate(),j=h.getMonth(),k=h.getFullYear();let l,m,n,o=!1;
    let countDownTarget;
    let chartStartPrev, chartEndPrev, chartStartCurr, chartEndCurr;

    if (i === 31) {
        // TGL 31 (MASUK PERIODE 1 BULAN DEPAN)
        l=new Date(k,j+1,1); m=new Date(k,j,30,23,59,59); n="PERIODE 1 (BLN DEPAN)";
        countDownTarget = new Date(k, j + 1, 15, 23, 59, 59);
        // Chart: Prev (P2 Bulan Ini) vs Curr (P1 Bulan Depan/Hari Ini)
        chartStartCurr = new Date(k, j, 31); chartEndCurr = new Date(k, j+1, 15, 23, 59, 59);
        chartStartPrev = new Date(k, j, 16); chartEndPrev = new Date(k, j, 30, 23, 59, 59);
    } else if (i <= 15) {
        // TGL 1-15 (MASUK PERIODE 1 BULAN INI)
        l=new Date(k,j,1); m=new Date(k,j,0,23,59,59); n=`PERIODE 1 (${getMonthName(j)})`;
        countDownTarget = new Date(k, j, 15, 23, 59, 59);
        // Chart: Prev (P2 Bulan Lalu) vs Curr (P1 Bulan Ini)
        chartStartCurr = new Date(k, j, 1); chartEndCurr = new Date(k, j, 15, 23, 59, 59);
        let prevM = j-1, prevY = k; if(prevM<0){prevM=11; prevY--;}
        chartStartPrev = new Date(prevY, prevM, 16); chartEndPrev = new Date(prevY, prevM+1, 0, 23, 59, 59);
    } else {
        // TGL 16-30 (MASUK PERIODE 2 BULAN INI)
        l=new Date(k,j,16); m=new Date(k,j,15,23,59,59); n=`PERIODE 2 (${getMonthName(j)})`; o=!0;
        countDownTarget = new Date(k, j + 1, 0, 23, 59, 59);
        // Chart: Prev (P1 Bulan Ini) vs Curr (P2 Bulan Ini)
        chartStartCurr = new Date(k, j, 16); chartEndCurr = new Date(k, j+1, 0, 23, 59, 59);
        chartStartPrev = new Date(k, j, 1); chartEndPrev = new Date(k, j, 15, 23, 59, 59);
    }
    
    document.getElementById('currentPeriodLabel').innerText=n;
    startCountdown(countDownTarget);
    showMotivation();

    const p=g.filter(a=>a.joinDate<=m).length,q=g.filter(a=>{let b=new Date(a.joinDate);return b.setHours(0,0,0,0),b>=l}).length,r=Math.ceil(p/2);let s=r-q;s<0&&(s=0);
    currentGap = s; globalTarget = r;
    document.getElementById('prevPeriodCount').innerText=p,document.getElementById('targetCount').innerText=r,document.getElementById('newMemberCount').innerText=q,document.getElementById('gapCount').innerText=s;

    // Hitung Data Chart
    const countPrev = g.filter(a => a.joinDate >= chartStartPrev && a.joinDate <= chartEndPrev).length;
    const countCurr = g.filter(a => a.joinDate >= chartStartCurr && a.joinDate <= chartEndCurr).length;
    
    renderChart(countPrev, countCurr);
}

// CHART ORIGINAL (SIMPLE, FLAT) - DATA PRESISI
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
                y: {
                    beginAtZero: true,
                    grid: { color: '#333' },
                    ticks: { display: false }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#888', font: { size: 10 } }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function countSpecificVipInTeam(teamMembers, targetLevel) {
    let count = 0;
    for (let i = 1; i < teamMembers.length; i++) {
        const downlineRank = getRankLevel(teamMembers[i].uid); 
        if (downlineRank >= targetLevel) { count++; }
    }
    return count;
}

function getRankLevel(a){
    const teamMembers = [globalData.find(member => member.uid === a), ...getDownlinesRecursive(a)];
    const totalMembers = teamMembers.length;
    const directDownlinesCount = globalData.filter(b=>b.upline===a).length;
    const vip2InTeam = countSpecificVipInTeam(teamMembers, 2); 
    const vip1InTeam = countSpecificVipInTeam(teamMembers, 1);
    const rankTiers = [{level:9,min:3501,reqVip:2,reqLevel:2},{level:8,min:1601,reqVip:2,reqLevel:2},{level:7,min:901,reqVip:2,reqLevel:2},{level:6,min:501,reqVip:2,reqLevel:2},{level:5,min:351,reqVip:2,reqLevel:2},{level:4,min:201,reqVip:2,reqLevel:2},{level:3,min:101,reqVip:2,reqLevel:2},{level:2,min:31,reqVip:2,reqLevel:1}];
    for(const tier of rankTiers) {
        if (totalMembers >= tier.min) {
            let currentVips = (tier.level >= 3) ? vip2InTeam : vip1InTeam;
            if (currentVips >= tier.reqVip) return tier.level;
        }
    }
    return (directDownlinesCount >= 5) ? 1 : 0; 
}

function getHistoricalRankLevel(uid, cutoffDate) {
    const allDownlines = getDownlinesRecursive(uid);
    const historicalDownlines = allDownlines.filter(m => new Date(m.joinDate) <= cutoffDate);
    const memberSelf = globalData.find(m => m.uid === uid);
    if(!memberSelf) return 0;
    const teamMembers = [memberSelf, ...historicalDownlines];
    const totalMembers = teamMembers.length; 
    const directDownlinesCount = globalData.filter(b => b.upline === uid && new Date(b.joinDate) <= cutoffDate).length;
    const countVipHist = (lvl) => countSpecificVipInTeamHistorical(teamMembers, lvl, cutoffDate);
    const vip2InTeam = countVipHist(2);
    const vip1InTeam = countVipHist(1);
    const rankTiers = [{level:9,min:3501,reqVip:2,reqLevel:2},{level:8,min:1601,reqVip:2,reqLevel:2},{level:7,min:901,reqVip:2,reqLevel:2},{level:6,min:501,reqVip:2,reqLevel:2},{level:5,min:351,reqVip:2,reqLevel:2},{level:4,min:201,reqVip:2,reqLevel:2},{level:3,min:101,reqVip:2,reqLevel:2},{level:2,min:31,reqVip:2,reqLevel:1}];
    for(const tier of rankTiers) {
        if (totalMembers >= tier.min) {
            let currentVips = (tier.level >= 3) ? vip2InTeam : vip1InTeam;
            if (currentVips >= tier.reqVip) return tier.level;
        }
    }
    return (directDownlinesCount >= 5) ? 1 : 0;
}

function countSpecificVipInTeamHistorical(teamMembers, targetLevel, cutoffDate) {
    let count = 0;
    for (let i = 1; i < teamMembers.length; i++) {
        const downlineRank = getHistoricalRankLevel(teamMembers[i].uid, cutoffDate); 
        if (downlineRank >= targetLevel) { count++; }
    }
    return count;
}

async function checkAndSaveHistory(uid, level) {
    const exists = globalHistory.find(h => h.uid === uid && h.vip_level === level);
    if (!exists) {
        const now = new Date().toISOString();
        globalHistory.push({ uid: uid, vip_level: level, achieved_at: now });
        db.from('vip_history').insert([{ uid: uid, vip_level: level, achieved_at: now }])
          .then(({ error }) => { if (error) console.log("Save Err:", error); });
    }
}

async function checkAndSaveAchiever(uid, period, target, actual, rank) {
    const exists = globalAchievers.find(h => h.uid === uid && h.period === period);
    if (!exists) {
        const now = new Date().toISOString();
        globalAchievers.push({ uid, period, target, actual, rank, created_at: now });
        db.from('achiever_history').insert([{ uid, period, target, actual, rank }])
          .then(({ error }) => { if (error) console.log("Save Achiever Err:", error); });
    }
}

async function checkAndSaveFailure(uid, period, target, actual, rank) {
    const exists = globalFailures.find(h => h.uid === uid && h.period === period);
    if (!exists) {
        const now = new Date().toISOString();
        globalFailures.push({ uid, period, target, actual, rank, created_at: now });
        db.from('failure_history').insert([{ uid, period, target, actual, rank }])
          .then(({ error }) => { if (error) console.log("Save Failure Err:", error); });
    }
}

function countVipStats(a){
    let b={1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};
    let alertStatus = {1:false,2:false,3:false,4:false,5:false,6:false,7:false,8:false,9:false};
    vipLists = {1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};
    const now = new Date();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    a.forEach(m=>{
        let c=getRankLevel(m.uid);
        if(c>=1&&c<=9){
            b[c]++;
            vipLists[c].push(m);
            checkAndSaveHistory(m.uid, c);
            const history = globalHistory.find(h => h.uid === m.uid && h.vip_level === c);
            let achievementTime = history ? new Date(history.achieved_at) : new Date(m.joinDate);
            const is24h = (now - achievementTime) < oneDayInMs;
            const isSameDay = achievementTime.toDateString() === now.toDateString();
            if(is24h || isSameDay) alertStatus[c] = true;
        }
    });
    for(let i=1;i<=9;i++){
        const el=document.getElementById(`cVIP${i}`);
        if(el){
            el.innerText=b[i];
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
    const now = new Date();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
    let startP, endP;
    if (d === 31) { startP = new Date(y, m + 1, 1); endP = new Date(y, m + 1, 15, 23, 59, 59); } 
    else if (d <= 15) { startP = new Date(y, m, 1); endP = new Date(y, m, 15, 23, 59, 59); } 
    else { startP = new Date(y, m, 16); endP = new Date(y, m + 1, 0, 23, 59, 59); }

    title.innerText = `DAFTAR V.I.P ${level}`; body.innerHTML = ''; 
    let sorted = [...vipLists[level]].sort((a, b) => {
        const histA = globalHistory.find(h => h.uid === a.uid && h.vip_level === level);
        const histB = globalHistory.find(h => h.uid === b.uid && h.vip_level === level);
        const timeA = histA ? new Date(histA.achieved_at).getTime() : new Date(a.joinDate).getTime();
        const timeB = histB ? new Date(histB.achieved_at).getTime() : new Date(b.joinDate).getTime();
        return timeB - timeA; 
    });

    if (sorted.length > 0) {
        sorted.forEach(m => {
            const hist = globalHistory.find(h => h.uid === m.uid && h.vip_level === level);
            const achievementTime = hist ? new Date(hist.achieved_at) : new Date(m.joinDate);
            const is24h = (now - achievementTime) < oneDayInMs;
            const isSameDay = achievementTime.toDateString() === now.toDateString();
            const isNew = is24h || isSameDay;
            const dateStr = `${achievementTime.getDate()}/${achievementTime.getMonth()+1} ${achievementTime.getHours()}:${String(achievementTime.getMinutes()).padStart(2,'0')}`;
            const newBadge = isNew ? `<span class="badge-new">🔥 BARU</span>` : '';
            const allDownlines = getDownlinesRecursive(m.uid);
            const baseCount = allDownlines.filter(dl => new Date(dl.joinDate) < startP).length + 1;
            const target = Math.ceil(baseCount / 2);
            const actual = allDownlines.filter(dl => { const jd = new Date(dl.joinDate); return jd >= startP && jd <= endP; }).length;
            let gap = target - actual; if (gap < 0) gap = 0;
            body.innerHTML += `<div class="v-item ${isNew ? 'new-name-alert' : ''}"><div style="display:flex; flex-direction:column; width:100%;"><div style="display:flex; justify-content:space-between; width:100%;"><span class="v-n">${m.name} ${newBadge}</span><span class="v-u">${m.uid}</span></div><small style="color:#666; font-size:9px; margin-bottom:4px;">${dateStr}</small><div style="display:flex; gap:10px; font-size:9px; border-top:1px dashed #333; padding-top:4px; margin-top:2px;"><span style="color:#aaa;">Target: <b style="color:#fff;">${target}</b></span><span style="color:#aaa;">Capai: <b style="color:var(--gold);">${actual}</b></span><span style="color:#aaa;">Sisa: <b style="color:${gap > 0 ? '#ff4444' : '#00ff00'};">${gap}</b></span></div></div></div>`;
        });
    } else { body.innerHTML = '<div class="v-empty">Belum ada anggota.</div>'; }
    modal.style.display = 'flex';
}
window.closeVipModal = function() { document.getElementById('vipModal').style.display = 'none'; }

function calculateMyRank(currentTeamSize, directDownlineCount, uid) {
    const rankTiers = [{ name: "V.I.P 9", level: 9, min: 3501, reqVip: 2, reqLevelName: "V.I.P 2" },{ name: "V.I.P 8", level: 8, min: 1601, reqVip: 2, reqLevelName: "V.I.P 2" },{ name: "V.I.P 7", level: 7, min: 901, reqVip: 2, reqLevelName: "V.I.P 2" },{ name: "V.I.P 6", level: 6, min: 501, reqVip: 2, reqLevelName: "V.I.P 2" },{ name: "V.I.P 5", level: 5, min: 351, reqVip: 2, reqLevelName: "V.I.P 2" },{ name: "V.I.P 4", level: 4, min: 201, reqVip: 2, reqLevelName: "V.I.P 2" },{ name: "V.I.P 3", level: 3, min: 101, reqVip: 2, reqLevelName: "V.I.P 2" },{ name: "V.I.P 2", level: 2, min: 31, reqVip: 2, reqLevelName: "V.I.P 1" },{ name: "V.I.P 1", level: 1, min: 5, reqVip: 0 }];
    const curLevel = getRankLevel(uid); 
    const curRank = rankTiers.find(r => r.level === curLevel) || { name: "MEMBER", level: 0 };
    const tm = [globalData.find(m => m.uid === uid), ...getDownlinesRecursive(uid)];
    const v2 = countSpecificVipInTeam(tm, 2), v1 = countSpecificVipInTeam(tm, 1);
    let gap = 0, next = rankTiers.find(r => r.level === curLevel + 1), sg = "";
    if (curLevel === 9) { sg = "Top Level"; } 
    else if (next) {
        let cv = (next.level >= 3) ? v2 : v1; if (cv < next.reqVip) sg = `Tambahan ${next.reqVip - cv} @${next.reqLevelName} dalam Tim`; else sg = `Menuju ${next.name}`;
        gap = (next.level === 1) ? next.min - directDownlineCount : next.min - currentTeamSize;
    }
    document.getElementById('rankName').innerText = curRank.name;
    const rg = document.getElementById('rankNextGoal'); rg.innerText = sg; rg.style.color = sg.includes("Tambahan") ? '#ff4444' : '#ccc';
    document.getElementById('nextLevelGap').innerText = Math.max(0, gap);
}

function initList(){window.sortData=a=>{sortState.col===a?sortState.dir='asc'===sortState.dir?'desc':'asc':(sortState.col=a,sortState.dir='asc'),renderTable()},renderTable()}function renderTable(){const a=document.getElementById('membersTableBody'),{col:b,dir:c}=sortState,d=[...myTeamData].sort((a,d)=>{let e=a[b],f=d[b];return'joinDate'===b?'asc'===c?e-f:f-e:(e=e.toLowerCase(),f=f.toLowerCase(),'asc'===c?e<f?-1:1:e>f?1:-1)});let e='';d.forEach((a,b)=>{const c=a.joinDate,d=`${String(c.getDate()).padStart(2,'0')}/${String(c.getMonth()+1).padStart(2,'0')}/${c.getFullYear()}`,f=a.upline?a.upline:'-';e+=`<tr><td class="col-no">${b+1}</td><td class="col-name">${a.name}</td><td class="col-uid">${a.uid}</td><td class="col-ref">${f}</td><td class="col-date">${d}</td></tr>`}),a.innerHTML=e}

// NETWORK TREE: TAMPILAN ORIGINAL + FITUR BINTANG + [UPDATE] TANGGAL FULL (DD-MM-YY)
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
        // [UPDATE] FORMAT TANGGAL: DD-MM-YY
        const c=`${String(b.getDate()).padStart(2,'0')}-${String(b.getMonth()+1).padStart(2,'0')}-${String(b.getFullYear()).slice(-2)}`;
        const d=getTotalGroupCount(a.uid), e=globalData.filter(b=>b.upline===a.uid).length>=5;
        const rank = getRankLevel(a.uid); let starStr = ""; if(rank > 0) { starStr = "⭐".repeat(rank) + " "; }
        return { key:a.uid, label:`${starStr}${a.uid} / ${a.name} / ${c}`, strokeColor:e?"#ffd700":"#ffffff",strokeWidth:e?2:1 }
    });
    const e=myTeamData.filter(a=>a.upline&&""!==a.upline).map(a=>({from:a.upline,to:a.uid}));
    c.model=new go.GraphLinksModel(d,e);
    const f=c.findNodeForKey(a);f&&(c.centerRect(f.actualBounds),f.isSelected=!0),window.downloadNetworkImage=function(){const a=c.makeImage({scale:2,background:"#000",maxSize:new go.Size(Infinity,Infinity),padding:new go.Margin(50)}),b=document.createElement("a");b.href=a.src,b.download="jaringan_dvteam.png",document.body.appendChild(b),b.click(),document.body.removeChild(b)}
};

function getMonthName(a){return["JAN","FEB","MAR","APR","MEI","JUN","JUL","AGU","SEP","OKT","NOV","DES"][a]}

// REPORT GROWTH 50%
function openAchieverModal() {
    const modal = document.getElementById('achieverModal'), body = document.getElementById('achieverBody'), title = document.getElementById('achieverTitle'), btnDl = document.getElementById('btnDlAchiever');
    modal.style.display = 'flex'; body.innerHTML = '<div class="v-empty">Sedang menghitung data...</div>'; btnDl.style.display = 'none'; achieverTxtContent = "";
    
    const now = new Date(), d = now.getDate(), m = now.getMonth(), y = now.getFullYear();
    let startP, endP, plabel = "";
    if (d >= 16 && d <= 30) { startP = new Date(y, m, 1); endP = new Date(y, m, 15, 23, 59, 59); plabel = `PERIODE 1 (${getMonthName(m)} ${y})`; } 
    else { let targetM = m; let targetY = y; if (d <= 15) { targetM = m - 1; if (targetM < 0) { targetM = 11; targetY--; } } startP = new Date(targetY, targetM, 16); endP = new Date(targetY, targetM + 1, 0, 23, 59, 59); plabel = `PERIODE 2 (${getMonthName(targetM)} ${targetY})`; }

    title.innerText = `REPORT GROWTH - ${plabel}`; achieverTxtContent = `REPORT GROWTH 50%\n${plabel}\n================\n\n`;

    const cachedSuccess = globalAchievers.filter(a => a.period === plabel);
    const cachedFailure = globalFailures.filter(a => a.period === plabel);

    if (cachedSuccess.length > 0 && cachedFailure.length > 0) {
        let successList = cachedSuccess.map(c => { const member = globalData.find(m => m.uid === c.uid); return { name: member ? member.name : "Unknown", uid: c.uid, target: c.target, actual: c.actual, rank: c.rank, status: 'success' }; });
        let failureList = cachedFailure.map(c => { const member = globalData.find(m => m.uid === c.uid); return { name: member ? member.name : "Unknown", uid: c.uid, target: c.target, actual: c.actual, rank: c.rank, status: 'fail' }; });
        renderAchieverList(successList, failureList, body, btnDl);
    } else {
        setTimeout(() => {
            let successList = []; let failureList = [];
            myTeamData.forEach(mem => {
                if (new Date(mem.joinDate) > endP) return;
                const dls = getDownlinesRecursive(mem.uid);
                const base = dls.filter(dl => new Date(dl.joinDate) < startP).length + 1;
                const grow = dls.filter(dl => { const jd = new Date(dl.joinDate); return jd >= startP && jd <= endP; }).length;
                const target = Math.floor(base / 2);
                const rank = getHistoricalRankLevel(mem.uid, endP);
                if (target > 0 && rank >= 1) {
                    if (grow >= target) { successList.push({name: mem.name, uid: mem.uid, target, actual: grow, rank, status: 'success'}); checkAndSaveAchiever(mem.uid, plabel, target, grow, rank); } 
                    else { failureList.push({name: mem.name, uid: mem.uid, target, actual: grow, rank, status: 'fail'}); checkAndSaveFailure(mem.uid, plabel, target, grow, rank); }
                }
            });
            renderAchieverList(successList, failureList, body, btnDl);
        }, 100);
    }
}

function renderAchieverList(successList, failureList, body, btnDl) {
    successList.sort((a,b) => b.actual - a.actual); failureList.sort((a,b) => b.actual - a.actual);
    btnDl.style.display = 'block'; let html = ''; const myUid = sessionStorage.getItem('userUid');

    if (successList.length > 0) {
        html += `<div style="padding:10px 15px; background:#112211; color:#00ff00; font-weight:bold; border-bottom:1px solid #333;">🏆 PERAIH TARGET (SUKSES)</div>`; achieverTxtContent += `[ SUKSES MENCAPAI TARGET ]\n`;
        successList.forEach((a,i) => { const displayName = (a.uid === myUid) ? a.name + " (ANDA)" : a.name; html += `<div class="achiever-item" style="border-left:3px solid #00ff00;"><div class="achiever-top"><span class="v-n">${i+1}. ${displayName} <small style="color:var(--gold)">(VIP ${a.rank})</small></span><span class="v-u">${a.uid}</span></div><div class="achiever-stats"><span>Target: <b class="val-target">${a.target}</b></span><span>Capaian: <b class="val-actual" style="color:#00ff00;">${a.actual}</b></span></div></div>`; achieverTxtContent += `${i+1}. ${a.name} (${a.uid}) - VIP ${a.rank} | Target: ${a.target} | Actual: ${a.actual}\n`; }); achieverTxtContent += `\n`;
    }

    if (failureList.length > 0) {
        html += `<div style="padding:10px 15px; background:#221111; color:#ff4444; font-weight:bold; border-bottom:1px solid #333; margin-top:10px;">⚠️ BELUM TERCAPAI</div>`; achieverTxtContent += `[ BELUM TERCAPAI ]\n`;
        failureList.forEach((a,i) => { const displayName = (a.uid === myUid) ? a.name + " (ANDA)" : a.name; const gap = a.target - a.actual; html += `<div class="achiever-item" style="border-left:3px solid #ff4444;"><div class="achiever-top"><span class="v-n">${i+1}. ${displayName} <small style="color:#666">(VIP ${a.rank})</small></span><span class="v-u">${a.uid}</span></div><div class="achiever-stats"><span>Target: <b class="val-target">${a.target}</b></span><span>Capaian: <b style="color:#ff4444;">${a.actual}</b> (Kurang ${gap})</span></div></div>`; achieverTxtContent += `${i+1}. ${a.name} (${a.uid}) - VIP ${a.rank} | Target: ${a.target} | Actual: ${a.actual} (Kurang ${gap})\n`; });
    }

    if (successList.length === 0 && failureList.length === 0) { html = '<div class="v-empty">Belum ada data VIP untuk periode ini.</div>'; }
    body.innerHTML = html;
}

function downloadAchieverData() { if(!achieverTxtContent) return; const blob=new Blob([achieverTxtContent],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='laporan_growth_50_persen.txt'; a.click(); }
function closeAchieverModal() { document.getElementById('achieverModal').style.display = 'none'; }

let intervalId; 
function startCountdown(targetDate) {
    if (intervalId) clearInterval(intervalId);
    function updateTimer() {
        const now = new Date().getTime(); const distance = targetDate.getTime() - now;
        if (distance < 0) { clearInterval(intervalId); document.getElementById("cdDays").textContent="00"; document.getElementById("cdHours").textContent="00"; document.getElementById("cdMin").textContent="00"; document.getElementById("cdSec").textContent="00"; return; }
        const days = Math.floor(distance / (1000 * 60 * 60 * 24)); const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)); const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        document.getElementById("cdDays").textContent=days<10?"0"+days:days; document.getElementById("cdHours").textContent=hours<10?"0"+hours:hours; document.getElementById("cdMin").textContent=minutes<10?"0"+minutes:minutes; document.getElementById("cdSec").textContent=seconds<10?"0"+seconds:seconds;
    }
    updateTimer(); intervalId = setInterval(updateTimer, 1000);
}

const wordBank = { openings: ["🔥 SAYA SIAP BERTEMPUR!", "⚠️ PERINGATAN KERAS!", "🚀 JANGAN LENGAH!", "🦁 BANGKITLAH PEMENANG!", "💎 MENTAL JUTAWAN!", "⚡ UPDATE PENTING!", "🏆 MATA TERTUJU PADA PIALA!", "⚔️ SAATNYA SERANGAN BALIK!"], conditions: ["Hari ini musuhmu sedang bekerja keras,", "Target tidak akan menunggu kamu siap,", "Kemiskinan sedang mengintip di depan pintu,", "Orang lain sudah berlari dua kali lebih cepat,", "Jika kamu diam sekarang, kamu akan tertinggal selamanya,", "Dunia tidak peduli dengan alasanmu,", "Ingat janji yang kamu ucapkan pada dirimu sendiri,"], actions: ["maka HANCURKAN rasa malasmu sekarang!", "segera RAPATKAN BARISAN dan kejar ketertinggalan!", "buktikan kamu bukan PENGECUT!", "ubah keringatmu menjadi EMAS!", "berhenti mengeluh dan MULAI BERGERAK!", "tunjukkan siapa RAJA di arena ini!", "jangan pulang sebelum MENANG!"], closings: ["PASTI BISA!", "GASPOLL!", "TUNTASKAN!", "REBUT!", "SEKARANG!", "JANGAN NYERAH!", "LEDAKKAN!"] };
function generateDynamicQuote() { const r = (arr) => arr[Math.floor(Math.random() * arr.length)]; return `"${r(wordBank.openings)} ${r(wordBank.conditions)} ${r(wordBank.actions)} ${r(wordBank.closings)}"`; }
function showMotivation() { if (!sessionStorage.getItem('isLoggedIn')) return; const modal = document.getElementById('motivationModal'); const textEl = document.getElementById('dailyMotivation'); if (modal && textEl) { textEl.innerText = generateDynamicQuote(); modal.style.display = 'flex'; } }
window.closeMotivation = function() { const modal = document.getElementById('motivationModal'); if (modal) { modal.style.opacity = '0'; setTimeout(() => { modal.style.display = 'none'; modal.style.opacity = '1'; }, 300); } }

const groupWords = { headers: ["🔥 UPDATE MEMBARA", "🚀 INFO PENTING TIM", "⚠️ SIAGA SATU", "🏆 LAPORAN PERTEMPURAN", "⚡ KABAR DARI GARIS DEPAN"], intros: ["Keberhasilan tim bukan dinilai dari seberapa cepat kita berlari, tapi seberapa kuat kita saling menggandeng.", "Jangan biarkan mimpi mati hanya karena malas. INGAT ALASAN KITA MEMULAI!", "Pemenang bukan orang yang tak pernah gagal, tapi yang tak pernah menyerah.", "Satu orang bisa berjalan cepat, tapi satu tim bisa berjalan jauh.", "Badai ini akan membuat kita makin kuat! Jangan jadi penonton.", "Fokus pada solusi, bukan keluhan. Kita adalah tim pemenang!", "Waktu tidak bisa diputar ulang. Apa yang kita tanam hari ini, kita panen nanti."], alerts: ["Tetap fokus pada pertumbuhan 50%", "Jangan kasih kendor, kejar target 50%", "Rapatkan barisan, fokus angka 50%", "Genjot lagi semangatnya, sasar 50%", "Jangan tidur nyenyak sebelum tembus 50%"], closings: ["Gow .. Gaaaaass sampai tembus..!! 💪🏻", "Ayo buktikan kita bisa..!! 🚀", "Salam satu komando..!! 🔥", "Jangan pulang sebelum menang..!! ⚔️", "Hancurkan rasa malas, gasspoll..!! 💎"] };
window.openShareModal = function() { generateShareText(); document.getElementById('shareModal').style.display = 'flex'; }
window.generateShareText = function() { const txtArea = document.getElementById('shareText'); const r = (arr) => arr[Math.floor(Math.random() * arr.length)]; const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']; const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']; const now = new Date(); const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`; const finalTxt = `${r(groupWords.headers)} \nDVTEAM NP 🔥\n\n` + `📅 ${dateStr}\n` + `👥 Target 50%: *${globalTarget} Anggota*\n\n` + `"${r(groupWords.intros)}"\n\n` + `🚀 ${r(groupWords.alerts)} = sisa ${currentGap} anggota lagi..!! 🏆\n` + `${r(groupWords.closings)}\n` + `#DVTeamNP #SatuVisi #SatuMisi #SatuKomando`; txtArea.value = finalTxt; }
window.copyShareText = function() { const txtArea = document.getElementById('shareText'); txtArea.select(); txtArea.setSelectionRange(0, 99999); navigator.clipboard.writeText(txtArea.value).then(() => { alert("✅ Teks berhasil disalin! Silakan tempel di Grup WhatsApp."); }); }
window.closeShareModal = function() { document.getElementById('shareModal').style.display = 'none'; }
