const supabaseUrl = 'https://hysjbwysizpczgcsqvuv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5c2pid3lzaXpwY3pnY3NxdnV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MjA2MTYsImV4cCI6MjA3OTQ5NjYxNn0.sLSfXMn9htsinETKUJ5IAsZ2l774rfeaNNmB7mVQcR4';
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

let globalData=[], myTeamData=[], sortState={col:'joinDate',dir:'asc'};
// Simpan Data Nama VIP
let vipLists = {1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};

document.addEventListener('DOMContentLoaded',async()=>{const a=window.location.pathname,b=sessionStorage.getItem('isLoggedIn');if(!b&&!a.includes('index.html')){window.location.href='index.html';return}if(b)await loadData();if(a.includes('index.html'))document.getElementById('loginButton').addEventListener('click',doLogin);else if(a.includes('dashboard.html'))renderDashboard();else if(a.includes('list.html')){prepareMyTeamData();initList()}else if(a.includes('network.html')){prepareMyTeamData();initNetwork()}});

async function loadData(){try{const{data:a,error:b}=await db.from('members').select('*');if(b)throw b;globalData=a.map(a=>({uid:String(a.UID||a.uid).trim(),name:(a.Nama||a.nama||a.name||'-').trim(),upline:a.Upline||a.upline?String(a.Upline||a.upline).trim():"",joinDate:new Date(a.TanggalBergabung||a.tanggalbergabung||a.joinDate)}))}catch(a){console.error(a)}}

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
    
    // Hitung & Simpan List VIP
    const g=[b,...d];
    countVipStats(g);
    
    const h=new Date,i=h.getDate(),j=h.getMonth(),k=h.getFullYear();let l,m,n,o=!1;31===i?(l=new Date(k,j+1,1),m=new Date(k,j,30,23,59,59),n="PERIODE 1 (BLN DEPAN)"):i<=15?(l=new Date(k,j,1),m=new Date(k,j,0,23,59,59),n=`PERIODE 1 (${getMonthName(j)})`):(l=new Date(k,j,16),m=new Date(k,j,15,23,59,59),n=`PERIODE 2 (${getMonthName(j)})`,o=!0),document.getElementById('currentPeriodLabel').innerText=n;const p=g.filter(a=>a.joinDate<=m).length,q=g.filter(a=>{let b=new Date(a.joinDate);return b.setHours(0,0,0,0),b>=l}).length,r=Math.ceil(p/2);let s=r-q;s<0&&(s=0),document.getElementById('prevPeriodCount').innerText=p,document.getElementById('targetCount').innerText=r,document.getElementById('newMemberCount').innerText=q,document.getElementById('gapCount').innerText=s,renderChart(g,k,j,o)
}

function renderChart(a,b,c,d){const e=document.getElementById('growthChart').getContext('2d'),f=new Date(b,c,1),g=new Date(b,c,15,23,59,59),h=new Date(b,c,16),i=new Date(b,c,30,23,59,59),j=a.filter(a=>a.joinDate>=f&&a.joinDate<=g).length,k=a.filter(a=>a.joinDate>=h&&a.joinDate<=i).length,l=d?'#333':'#D4AF37',m=d?'#D4AF37':'#333';window.myChart&&window.myChart.destroy(),window.myChart=new Chart(e,{type:'bar',data:{labels:['P1','P2'],datasets:[{label:'Growth',data:[j,k],backgroundColor:[l,m],borderColor:'#D4AF37',borderWidth:1}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{y:{beginAtZero:!0,grid:{color:'#333'},ticks:{display:!1}},x:{grid:{display:!1},ticks:{color:'#888',fontSize:9}}},plugins:{legend:{display:!1}}}})}

// FUNGSI KHUSUS UNTUK MENGHITUNG JUMLAH VIP TERTENTU DALAM TIM
function countSpecificVipInTeam(teamMembers, targetLevel) {
    let count = 0;
    // Iterasi melalui semua anggota tim (kecuali diri sendiri, yang merupakan elemen pertama)
    for (let i = 1; i < teamMembers.length; i++) {
        // Cek rank level downline tersebut
        // Menggunakan getRankLevel (rekursif) karena level downline juga perlu dihitung rank-nya
        const downlineRank = getRankLevel(teamMembers[i].uid); 
        if (downlineRank >= targetLevel) {
            count++;
        }
    }
    return count;
}


// FUNGSI UTAMA UNTUK CEK RANK DENGAN SYARAT STRUKTUR BARU
function getRankLevel(a){
    // Pastikan ini tidak menyebabkan rekursi tak terbatas (sudah diatasi dengan rekursi terkelola)
    const teamMembers = [globalData.find(member => member.uid === a), ...getDownlinesRecursive(a)];
    const totalMembers = teamMembers.length;
    const directDownlinesCount = globalData.filter(b=>b.upline===a).length;
    
    // Hitung jumlah V.I.P 2 dan V.I.P 1 dalam tim (bukan direct downline)
    const vip2InTeam = countSpecificVipInTeam(teamMembers, 2); 
    const vip1InTeam = countSpecificVipInTeam(teamMembers, 1);

    // KETENTUAN BARU (Reversed order untuk prioritas)
    const rankTiers = [
        { level: 9, min: 3501, reqVip: 2, reqLevel: 2 }, 
        { level: 8, min: 1601, reqVip: 2, reqLevel: 2 }, 
        { level: 7, min: 901, reqVip: 2, reqLevel: 2 }, 
        { level: 6, min: 501, reqVip: 2, reqLevel: 2 }, 
        { level: 5, min: 351, reqVip: 2, reqLevel: 2 }, 
        { level: 4, min: 201, reqVip: 2, reqLevel: 2 }, 
        { level: 3, min: 101, reqVip: 2, reqLevel: 2 }, 
        { level: 2, min: 31, reqVip: 2, reqLevel: 1 }, 
    ];

    for(const tier of rankTiers) {
        if (totalMembers >= tier.min) {
            let currentVips = 0;
            if (tier.level >= 3) {
                // VIP 3 ke atas memerlukan 2x VIP 2 dalam tim
                currentVips = vip2InTeam;
            } else if (tier.level === 2) {
                // VIP 2 memerlukan 2x VIP 1 dalam tim
                currentVips = vip1InTeam;
            }
            
            // Cek apakah syarat struktur terpenuhi
            if (currentVips >= tier.reqVip) {
                return tier.level;
            }
        }
    }
    
    // Pengecekan V.I.P 1 (Hanya butuh Direct Downline Count)
    if (directDownlinesCount >= 5) return 1;
    
    return 0; // MEMBER
}

function countVipStats(a){
    let b={1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0};
    vipLists = {1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};
    a.forEach(a=>{
        let c=getRankLevel(a.uid);
        if(c>=1&&c<=9){
            b[c]++;
            vipLists[c].push(a);
        }
    });
    for(let a=1;a<=9;a++){const c=document.getElementById(`cVIP${a}`);c&&(c.innerText=b[a])}
}

// FUNGSI MODAL POPUP
window.openVipModal = function(level) {
    const modal = document.getElementById('vipModal');
    const body = document.getElementById('modalBody');
    const title = document.getElementById('modalTitle');
    title.innerText = `DAFTAR V.I.P ${level}`;
    body.innerHTML = ''; 
    const list = vipLists[level];
    if (list && list.length > 0) {
        list.forEach(m => {
            body.innerHTML += `<div class="v-item"><span class="v-n">${m.name}</span><span class="v-u">${m.uid}</span></div>`;
        });
    } else {
        body.innerHTML = '<div class="v-empty">Belum ada anggota.</div>';
    }
    modal.style.display = 'flex';
}

window.closeVipModal = function() {
    document.getElementById('vipModal').style.display = 'none';
}

// --- BAGIAN YANG DIPERBAIKI: calculateMyRank ---
function calculateMyRank(currentTeamSize, directDownlineCount, uid) {
    const rankTiers = [
        { name: "V.I.P 9", level: 9, min: 3501, max: Infinity, reqVip: 2, reqLevel: 2, reqLevelName: "V.I.P 2" }, 
        { name: "V.I.P 8", level: 8, min: 1601, max: 3500, reqVip: 2, reqLevel: 2, reqLevelName: "V.I.P 2" }, 
        { name: "V.I.P 7", level: 7, min: 901, max: 1600, reqVip: 2, reqLevel: 2, reqLevelName: "V.I.P 2" }, 
        { name: "V.I.P 6", level: 6, min: 501, max: 900, reqVip: 2, reqLevel: 2, reqLevelName: "V.I.P 2" }, 
        { name: "V.I.P 5", level: 5, min: 351, max: 500, reqVip: 2, reqLevel: 2, reqLevelName: "V.I.P 2" }, 
        { name: "V.I.P 4", level: 4, min: 201, max: 350, reqVip: 2, reqLevel: 2, reqLevelName: "V.I.P 2" }, 
        { name: "V.I.P 3", level: 3, min: 101, max: 200, reqVip: 2, reqLevel: 2, reqLevelName: "V.I.P 2" }, 
        { name: "V.I.P 2", level: 2, min: 31, max: 100, reqVip: 2, reqLevel: 1, reqLevelName: "V.I.P 1" },
        { name: "V.I.P 1", level: 1, min: 5, max: 30, isDirect: true, reqVip: 0 } 
    ];
    
    const currentRankLevel = getRankLevel(uid); 
    const currentRank = rankTiers.find(r => r.level === currentRankLevel) || { name: "MEMBER", min: 0, level: 0 };
    
    const teamMembers = [globalData.find(member => member.uid === uid), ...getDownlinesRecursive(uid)];
    const vip2InTeam = countSpecificVipInTeam(teamMembers, 2);
    const vip1InTeam = countSpecificVipInTeam(teamMembers, 1);
    
    let nextGapValue = 0;
    let nextGoalText = "";
    let descHtml = "";
    
    let nextRank = rankTiers.find(r => r.level === currentRankLevel + 1);
    let structureGapText = null; // Variable untuk menampung teks kekurangan struktur

    // 1. Logika Status Saat Ini (rankNextGoal) - Prioritas Kekurangan Struktur
    if (currentRankLevel === 9) {
        structureGapText = "Top Level";
    } else if (nextRank) {
        let requiredVips = nextRank.reqVip;
        let currentVips = 0;
        let reqLevelName = nextRank.reqLevelName;

        if (nextRank.level >= 3) {
            currentVips = vip2InTeam;
        } else if (nextRank.level === 2) {
            currentVips = vip1InTeam;
        }
        
        if (currentVips < requiredVips) {
            // Kekurangan Struktur
            let structureGap = requiredVips - currentVips;
            structureGapText = `Tambahan ${structureGap} @${reqLevelName} dalam Tim`;
        } else if (currentRankLevel === 0) {
            // Status VIP 1 jika syarat struktur/jumlah anggota belum terpenuhi
            structureGapText = `Direct Downline lagi`;
        } else {
             // Syarat Struktur Terpenuhi, tampilkan Target Rank
            structureGapText = `Menuju ${nextRank.name}`;
        }
    } else {
        structureGapText = currentRankLevel === 0 ? "Direct Downline lagi" : "Memuat...";
    }
    
    // 2. Logika Target Next (nextLevelGap dan next-desc) - Prioritas Pertumbuhan Anggota Total
    if (currentRankLevel === 9) {
        nextGapValue = 0;
        nextGoalText = "Menuju Level Maksimal";
        descHtml = "Maksimal";
    } else if (nextRank) {
        
        // Khusus V.I.P 1, gunakan Direct Downline Count
        if (nextRank.level === 1) {
             nextGapValue = nextRank.min - directDownlineCount;
             nextGoalText = "Menuju V.I.P 1";
             descHtml = `Direct Downline lagi<br><span style="color:#D4AF37;font-weight:bold;">Menuju V.I.P 1</span>`;
        } else {
            // Untuk V.I.P 2 ke atas (menuju V.I.P 3, dll.)
            let requiredTeamSize = nextRank.min;
            nextGapValue = requiredTeamSize - currentTeamSize;
            nextGoalText = `Menuju ${nextRank.name}`;
            descHtml = `Anggota Tim lagi<br><span style="color:#D4AF37;font-weight:bold;">Menuju ${nextRank.name}</span>`;
        }
        
    } else if (currentRankLevel === 0) {
        // Fallback untuk Member ke VIP 1
        let nextRankVip1 = rankTiers.find(r => r.level === 1);
        nextGapValue = nextRankVip1.min - directDownlineCount;
        nextGoalText = "Menuju V.I.P 1";
        descHtml = `Direct Downline lagi<br><span style="color:#D4AF37;font-weight:bold;">Menuju V.I.P 1</span>`;
    }

    // Set nilai pada elemen Dashboard
    document.getElementById('rankName').innerText = currentRank.name;
    document.getElementById('rankNextGoal').innerText = structureGapText; // STATUS SAAT INI (Kekurangan Struktur)
    
    // Warna teks Status Saat Ini (jika ada kekurangan, beri warna merah)
    if (structureGapText && structureGapText.includes("Tambahan")) {
        document.getElementById('rankNextGoal').style.color = '#ff4444'; 
    } else {
        document.getElementById('rankNextGoal').style.color = '#ccc'; 
    }
    
    // TARGET NEXT (Pertumbuhan Anggota Tim)
    document.getElementById('nextLevelGap').innerText = Math.max(0, nextGapValue); 
    const descElement = document.querySelector('.next-desc');
    if (descElement) descElement.innerHTML = descHtml;
}
// ------------------------------

function initList(){window.sortData=a=>{sortState.col===a?sortState.dir='asc'===sortState.dir?'desc':'asc':(sortState.col=a,sortState.dir='asc'),renderTable()},renderTable()}function renderTable(){const a=document.getElementById('membersTableBody'),{col:b,dir:c}=sortState,d=[...myTeamData].sort((a,d)=>{let e=a[b],f=d[b];return'joinDate'===b?'asc'===c?e-f:f-e:(e=e.toLowerCase(),f=f.toLowerCase(),'asc'===c?e<f?-1:1:e>f?1:-1)});let e='';d.forEach((a,b)=>{const c=a.joinDate,d=`${String(c.getDate()).padStart(2,'0')}/${String(c.getMonth()+1).padStart(2,'0')}/${c.getFullYear()}`,f=a.upline?a.upline:'-';e+=`<tr><td class="col-no">${b+1}</td><td class="col-name">${a.name}</td><td class="col-uid">${a.uid}</td><td class="col-ref">${f}</td><td class="col-date">${d}</td></tr>`}),a.innerHTML=e}

function initNetwork(){const a=sessionStorage.getItem('userUid'),b=go.GraphObject.make,c=b(go.Diagram,"networkDiagram",{padding:new go.Margin(150),scrollMode:go.Diagram.InfiniteScroll,layout:b(go.TreeLayout,{angle:0,layerSpacing:60,nodeSpacing:10}),undoManager:{isEnabled:!0},initialContentAlignment:go.Spot.Center,minScale:.1,maxScale:2});c.nodeTemplate=b(go.Node,"Horizontal",{selectionObjectName:"PANEL"},b(go.Panel,"Auto",{name:"PANEL"},b(go.Shape,"RoundedRectangle",{fill:"#000",strokeWidth:1},new go.Binding("stroke","strokeColor"),new go.Binding("strokeWidth","strokeWidth")),b(go.TextBlock,{margin:new go.Margin(2,6,2,6),stroke:"#fff",font:"11px sans-serif",textAlign:"center",maxLines:1,overflow:go.TextBlock.OverflowEllipsis},new go.Binding("text","label"))),b("TreeExpanderButton",{width:14,height:14,alignment:go.Spot.Right,margin:new go.Margin(0,0,0,4),"ButtonBorder.fill":"#222","ButtonBorder.stroke":"#D4AF37","ButtonIcon.stroke":"white"})),c.linkTemplate=b(go.Link,{routing:go.Link.Orthogonal,corner:5},b(go.Shape,{strokeWidth:1,stroke:"white"}));const d=myTeamData.map(a=>{const b=a.joinDate,c=`${String(b.getDate()).padStart(2,'0')}-${String(b.getMonth()+1).padStart(2,'0')}`,d=getTotalGroupCount(a.uid),e=globalData.filter(b=>b.upline===a.uid).length>=5;return{key:a.uid,label:`${a.uid} / ${a.name} / ${c}`,strokeColor:e?"#ffd700":"#ffffff",strokeWidth:e?2:1}}),e=myTeamData.filter(a=>a.upline&&""!==a.upline).map(a=>({from:a.upline,to:a.uid}));c.model=new go.GraphLinksModel(d,e);const f=c.findNodeForKey(a);f&&(c.centerRect(f.actualBounds),f.isSelected=!0),window.downloadNetworkImage=function(){const a=c.makeImage({scale:2,background:"#000",maxSize:new go.Size(Infinity,Infinity),padding:new go.Margin(50)}),b=document.createElement("a");b.href=a.src,b.download="jaringan_dvteam.png",document.body.appendChild(b),b.click(),document.body.removeChild(b)}};

function getMonthName(a){return["JAN","FEB","MAR","APR","MEI","JUN","JUL","AGU","SEP","OKT","NOV","DES"][a]}
