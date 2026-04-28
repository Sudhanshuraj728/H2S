import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Shield, Upload, Bell, BarChart2, LogOut, Eye, AlertTriangle,
  CheckCircle, Clock, Fingerprint, Lock, Zap, Globe, X, Plus,
  RefreshCw, TrendingUp, Database, Layers, ChevronRight,
  Image, FileVideo, Scan,
  User, Home, Activity, Target, Radio, CheckSquare,
  AlertOctagon, HelpCircle, Search
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts"
import {
  authAPI, assetsAPI, detectionsAPI, alertsAPI,
  clearTokens, getToken, saveUser, getSavedUser
} from "../api.js"

/* ─── Helpers ─── */
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024, sizes = ['B','KB','MB','GB','TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}
const timeAgo = (dateStr) => {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
const generateHash = (file) => {
  const str = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`
  let hash = 0
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash }
  return Math.abs(hash).toString(16).padStart(12, '0')
}

const CT = ({active,payload,label}) => {
  if(!active||!payload?.length) return null
  return (
    <div style={{background:'#080810',border:'1px solid rgba(184,169,232,.2)',borderRadius:8,padding:'10px 14px',fontFamily:'Poppins',fontSize:13}}>
      <p style={{color:'#7a95b0',marginBottom:6,fontSize:11,fontFamily:'Space Mono'}}>{label}</p>
      {payload.map((p,i)=><p key={i} style={{color:p.color,fontWeight:600}}>{p.name}: {p.value}</p>)}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════════════════════════════════ */
function Sidebar({page,setPage,onLogout,user,alertCount}) {
  const brandLogo = '/Gemini_Generated_Image_pszjk6pszjk6pszj.png'
  const navItems = [
    {id:'dashboard', icon:<Home size={16}/>,  label:'Dashboard'},
    {id:'upload',    icon:<Upload size={16}/>, label:'Upload & Protect'},
    {id:'library',   icon:<Database size={16}/>,label:'Asset Library'},
    {id:'alerts',    icon:<Bell size={16}/>,    label:'Alert Center', badge:alertCount||0},
    {id:'analytics', icon:<BarChart2 size={16}/>,label:'Analytics'},
  ]
  const userName = user ? `${user.firstName||''} ${user.lastName||''}`.trim() || 'User' : 'User'
  const userEmail = user?.email || '—'
  const userInitial = (user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()

  const handleLogout = async () => {
    try { await authAPI.logout() } catch(e) {}
    clearTokens(); onLogout()
  }

  return (
    <div style={{width:220,background:'var(--bg1)',borderRight:'1px solid var(--bdr)',display:'flex',flexDirection:'column',height:'100vh',position:'sticky',top:0,flexShrink:0}}>
      <div style={{padding:'20px 16px 16px',borderBottom:'1px solid var(--bdr)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <img
            src={brandLogo}
            alt="TRAQ logo"
            style={{width:36,height:36,borderRadius:9,objectFit:'cover',boxShadow:'0 0 14px rgba(184,169,232,.3)',flexShrink:0}}
          />
          <div>
            <div style={{fontFamily:'Poppins, sans-serif',fontWeight:800,fontSize:15,letterSpacing:'-0.01em'}}>TRAQ</div>
            <div style={{fontSize:10,color:'var(--t3)',fontFamily:'Space Mono'}}>ASSET PROTECTION</div>
          </div>
        </div>
      </div>
      <nav style={{flex:1,padding:'14px 10px',overflow:'auto'}}>
        <div style={{fontSize:10,fontFamily:'Space Mono',color:'var(--t3)',padding:'0 6px',marginBottom:8,letterSpacing:'.08em'}}>NAVIGATION</div>
        {navItems.map(item=>(
          <div key={item.id} className={'nav-item'+(page===item.id?' act':'')} onClick={()=>setPage(item.id)}>
            <span style={{color:page===item.id?'var(--c)':'var(--t3)'}}>{item.icon}</span>
            <span style={{flex:1}}>{item.label}</span>
            {item.badge>0&&<span style={{background:'var(--rv)',color:'var(--r)',fontSize:10,fontWeight:700,fontFamily:'Space Mono',padding:'1px 7px',borderRadius:10,border:'1px solid rgba(255,51,102,.2)'}}>{item.badge}</span>}
          </div>
        ))}
        <div style={{fontSize:10,fontFamily:'Space Mono',color:'var(--t3)',padding:'16px 6px 8px',letterSpacing:'.08em'}}>SYSTEM</div>
        <div className={'nav-item'+(page==='help'?' act':'')} onClick={()=>setPage('help')}>
          <span style={{color:'var(--t3)'}}><HelpCircle size={16}/></span> Help
        </div>
      </nav>
      <div style={{padding:'12px',borderTop:'1px solid var(--bdr)'}}>
        <div style={{background:'var(--bg2)',borderRadius:10,padding:'10px 12px',display:'flex',alignItems:'center',gap:10,border:'1px solid var(--bdr)'}}>
          <div style={{width:32,height:32,borderRadius:8,flexShrink:0,background:'#b8a9e8',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Poppins',fontWeight:700,fontSize:13,color:'white'}}>{userInitial}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{userName}</div>
            <div style={{fontSize:11,color:'var(--t3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{userEmail}</div>
          </div>
          <button className="btn-g" style={{padding:6,flexShrink:0}} onClick={handleLogout} title="Logout"><LogOut size={14}/></button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════════════════ */
function Dashboard({setPage}) {
  const [assetStats,setAssetStats] = useState(null)
  const [detStats,setDetStats] = useState(null)
  const [alertStats,setAlertStats] = useState(null)
  const [openAlerts,setOpenAlerts] = useState([])
  const [loading,setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const [aR,dR,alR,oaR] = await Promise.allSettled([assetsAPI.getStats(),detectionsAPI.getStats(),alertsAPI.getStats(),alertsAPI.getOpen(4)])
    if(aR.status==='fulfilled') setAssetStats(aR.value.data||aR.value)
    if(dR.status==='fulfilled') setDetStats(dR.value.data||dR.value)
    if(alR.status==='fulfilled') setAlertStats(alR.value.data||alR.value)
    if(oaR.status==='fulfilled') setOpenAlerts((oaR.value.data||oaR.value)?.alerts||[])
    setLoading(false)
  }
  useEffect(()=>{fetchData()},[])

  const totalAssets = assetStats?.totalAssets||0
  const flaggedAssets = assetStats?.flaggedAssets||0
  const totalDetections = detStats?.summary?.totalDetections||0
  const openAlertCount = alertStats?.summary?.open||0
  const platformData = (detStats?.byPlatform||[]).map(p=>({platform:p._id||p.platform,violations:p.count||0}))

  const stats = [
    {label:'Total Assets',value:String(totalAssets),change:'Protected',dir:1,color:'cyan',Icon:Database},
    {label:'Open Alerts',value:String(openAlertCount),change:openAlertCount>0?'Needs attention':'All clear',dir:openAlertCount>0?-1:1,color:'o',Icon:AlertOctagon},
    {label:'Detections',value:String(totalDetections),change:'Total found',dir:-1,color:'v',Icon:Scan},
    {label:'Flagged Assets',value:String(flaggedAssets),change:flaggedAssets>0?'Review needed':'None',dir:flaggedAssets>0?-1:1,color:'g',Icon:Target},
  ]

  return (
    <div style={{padding:'28px 32px',maxWidth:1200}} className="fu">
      <div style={{marginBottom:28,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <h1 style={{fontFamily:'Poppins',fontWeight:800,fontSize:28,letterSpacing:'-0.02em'}}>Dashboard</h1>
          <p style={{color:'var(--t2)',fontSize:14,marginTop:4}}>Overview of your digital asset protection status.</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button className="btn-g" onClick={fetchData}><RefreshCw size={14}/> Refresh</button>
          <button className="btn-p" onClick={()=>setPage('upload')}><Plus size={14}/> Protect New Asset</button>
        </div>
      </div>

      {openAlertCount>0&&(
        <div className="fu1" style={{background:'var(--rv)',border:'1px solid rgba(255,51,102,.3)',borderRadius:11,padding:'12px 18px',marginBottom:24,display:'flex',alignItems:'center',gap:12}}>
          <AlertTriangle size={18} color="var(--r)"/>
          <span style={{color:'var(--r)',fontWeight:600,fontSize:14}}>{openAlertCount} open alert{openAlertCount>1?'s':''} need your attention</span>
          <button className="btn-g" style={{marginLeft:'auto',color:'var(--r)',background:'rgba(255,51,102,.1)'}} onClick={()=>setPage('alerts')}>View Alerts <ChevronRight size={13}/></button>
        </div>
      )}

      <div className="fu2" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
        {stats.map((s,i)=>(
          <div key={i} className={`card stat-top-${s.color}`} style={{position:'relative',overflow:'hidden'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
              <span style={{fontSize:12,color:'var(--t2)',fontWeight:500}}>{s.label}</span>
              <div style={{width:32,height:32,borderRadius:8,background:s.color==='cyan'?'var(--cv)':s.color==='v'?'var(--vv)':s.color==='g'?'var(--gv)':'var(--ov)',display:'flex',alignItems:'center',justifyContent:'center',color:s.color==='cyan'?'var(--c)':s.color==='v'?'var(--v)':s.color==='g'?'var(--g)':'var(--o)'}}>
                <s.Icon size={15}/>
              </div>
            </div>
            <div style={{fontFamily:'Poppins',fontWeight:800,fontSize:30,letterSpacing:'-0.02em'}}>{loading?'—':s.value}</div>
            <div style={{fontSize:12,marginTop:6,color:s.dir===1?'var(--g)':'var(--r)',display:'flex',alignItems:'center',gap:4}}>{s.change}</div>
          </div>
        ))}
      </div>

      <div className="fu3" style={{display:'grid',gridTemplateColumns:platformData.length>0?'1fr 1fr':'1fr',gap:14}}>
        {platformData.length>0&&(
          <div className="card">
            <div style={{fontFamily:'Poppins',fontWeight:700,fontSize:15,marginBottom:16}}>Platform Violations</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={platformData} layout="vertical" margin={{top:0,right:0,left:10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,.04)"/>
                <XAxis type="number" tick={{fill:'#3a5168',fontSize:11,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="platform" tick={{fill:'#7a95b0',fontSize:12}} axisLine={false} tickLine={false} width={80}/>
                <Tooltip content={<CT/>}/><Bar dataKey="violations" name="Violations" fill="#b8a9e8" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <div style={{fontFamily:'Poppins',fontWeight:700,fontSize:15}}>Recent Alerts</div>
            <button className="btn-g" style={{fontSize:12}} onClick={()=>setPage('alerts')}>View All <ChevronRight size={12}/></button>
          </div>
          {loading?<p style={{color:'var(--t3)',fontSize:13}}>Loading...</p>:
           openAlerts.length>0?openAlerts.slice(0,4).map((a,i)=>(
            <div key={a._id||i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:i<Math.min(openAlerts.length,4)-1?'1px solid var(--bdr)':'none'}}>
              <div style={{width:36,height:36,borderRadius:8,flexShrink:0,background:a.severity==='high'||a.severity==='critical'?'var(--rv)':a.severity==='medium'?'var(--ov)':'var(--cv)',display:'flex',alignItems:'center',justifyContent:'center',color:a.severity==='high'||a.severity==='critical'?'var(--r)':a.severity==='medium'?'var(--o)':'var(--c)'}}><AlertTriangle size={16}/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.title||'Alert'}</div>
                <div style={{fontSize:12,color:'var(--t2)'}}>{a.platform||'—'} · {timeAgo(a.createdAt)}</div>
              </div>
              <span className={`badge ${a.severity==='high'||a.severity==='critical'?'badge-r':a.severity==='medium'?'badge-o':'badge-c'}`}>{a.severity||'—'}</span>
            </div>
          )):<p style={{color:'var(--t3)',fontSize:13}}>No open alerts — all clear! 🎉</p>}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   UPLOAD PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
function UploadPage({setPage}) {
  const [step,setStep] = useState(0)
  const [dragging,setDragging] = useState(false)
  const [progress,setProgress] = useState(0)
  const [file,setFile] = useState(null)
  const [title,setTitle] = useState('')
  const [fileType,setFileType] = useState('image')
  const [description,setDescription] = useState('')
  const [error,setError] = useState('')
  const [createdAsset,setCreatedAsset] = useState(null)
  const [dupResult,setDupResult] = useState(null)

  const resetAll = () => { setStep(0);setProgress(0);setFile(null);setTitle('');setDescription('');setCreatedAsset(null);setDupResult(null);setError('') }

  const startUpload = async () => {
    if(!file) return; setError(''); setDupResult(null); setStep(1)
    let p=0
    const iv=setInterval(()=>{p+=Math.random()*8+2;if(p>=100){clearInterval(iv);setProgress(100)}else setProgress(Math.min(p,99))},180)
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || file.name.replace(/\.[^.]+$/, ''));
      formData.append("description", description || '');
      formData.append("fileType", fileType || 'image');
      
      const res = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`
        },
        body: formData
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || data.error || 'Upload failed');
      
      clearInterval(iv); setProgress(100); 
      setCreatedAsset(data);
      
      const isDup = data.isDuplicate || data.status === "match" || data.status === "duplicate" ||
        ['identical','strong','partial'].includes(data?.best_match?.match_status);

      if (isDup) {
        const matchedName = data?.matchedFilename || data?.best_match?.matched_filename || 'existing protected asset';
        const confidence = Number(data?.confidence ?? data?.best_match?.combined_similarity_percentage ?? 0);
        let matchType = data?.matchType || (data?.isCropDetected ? 'Cropped' : data?.isContrastDetected ? 'Transformed' : data?.transformedMatchDetected ? 'Transformed' : 'Original');
        
        if (matchType === 'Original' && confidence < 95 && data?.best_match?.match_status === 'partial') {
           matchType = 'Partial';
        }

        // Build specific alert message based on matchType
        const typeLabel = matchType === 'Original' ? 'Exact Copy' : matchType === 'Cropped' ? 'Cropped Copy' : matchType === 'Partial' ? 'Partial Match' : 'Transformed Copy';
        const typeEmoji = matchType === 'Original' ? '🔴' : matchType === 'Cropped' ? '✂️' : matchType === 'Partial' ? '⚠️' : '🔄';
        
        setError({
          isMatch: true,
          emoji: typeEmoji,
          label: typeLabel,
          matchedName,
          confidence: confidence.toFixed(1),
          matchType
        });
        
        setDupResult({ matchedName, confidence, matchStatus: data?.best_match?.match_status || (confidence >= 95 ? 'identical' : 'partial'), isTransformed: !!data?.transformedMatchDetected });
        setStep(0);
      } else {
        setError('');
        setTimeout(()=>setStep(3),600);
      }
    } catch(err) { clearInterval(iv); setProgress(0); setStep(0); setError(err.message||'Upload failed') }
  }

  const guessFileType = (f) => {
    if(!f) return 'image'
    const ext = f.name.split('.').pop().toLowerCase()
    if(['mp4','mkv','avi','mov','webm'].includes(ext)) return 'video'
    if(['mp3','wav','ogg','flac','aac'].includes(ext)) return 'audio'
    if(['pdf','doc','docx','txt','xls','xlsx'].includes(ext)) return 'document'
    return 'image'
  }
  const onFileSelected = (f) => { setError(''); setDupResult(null); setFile(f); setFileType(guessFileType(f)); if(!title) setTitle(f.name.replace(/\.[^.]+$/,'')) }

  const steps=['Upload Asset','Fingerprinting','Registering','Registered']
  const fingerSteps=[{label:'Analyzing file structure',done:progress>20},{label:'Generating cryptographic hash',done:progress>40},{label:'Creating digital fingerprint',done:progress>60},{label:'Registering asset in database',done:progress>80},{label:'Protection activated',done:progress>=100}]

  const statusColor = dupResult?.matchStatus === 'identical' ? 'var(--r)' : '#ff9f1c'

  return (
    <div style={{padding:'28px 32px',maxWidth:900}} className="fu">
      <div style={{marginBottom:28}}>
        <h1 style={{fontFamily:'Poppins',fontWeight:800,fontSize:28,letterSpacing:'-0.02em'}}>Upload & Protect</h1>
        <p style={{color:'var(--t2)',fontSize:14,marginTop:4}}>Add a new asset to your protection vault.</p>
      </div>
      {error && typeof error === 'string' && <div className="error-msg" style={{marginBottom:16,whiteSpace:'pre-line',lineHeight:'1.6'}}><AlertTriangle size={14}/>{error}</div>}
      
      {error && typeof error === 'object' && error.isMatch && (
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--r)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 36,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          boxShadow: '0 8px 32px rgba(255, 51, 102, 0.15)',
          animation: 'fadeIn 0.4s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--rv)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0, boxShadow: '0 0 20px rgba(255,51,102,.2)' }}>
              {error.emoji}
            </div>
            <div>
              <h2 style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 26, color: 'var(--r)', margin: 0, letterSpacing: '-0.02em' }}>
                {error.label} Detected!
              </h2>
              <p style={{ color: 'var(--t2)', fontSize: 15, marginTop: 4 }}>
                This asset was <strong style={{color: 'var(--r)'}}>NOT registered</strong> — it already exists in your vault.
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280, background: 'var(--bg1)', borderRadius: 12, padding: 20, border: '1px solid var(--bdr)' }}>
               <div style={{ fontSize: 12, fontFamily: 'Space Mono', color: 'var(--t3)', marginBottom: 8, letterSpacing: '.05em' }}>MATCHED ASSET NAME</div>
               <div style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 24, color: 'var(--c)', wordBreak: 'break-word', lineHeight: 1.2 }}>
                 {error.matchedName}
               </div>
               
               <div style={{ display: 'flex', gap: 24, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--bdr)' }}>
                 <div>
                   <div style={{ fontSize: 11, fontFamily: 'Space Mono', color: 'var(--t3)', marginBottom: 4 }}>CONFIDENCE</div>
                   <div style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 24, color: 'var(--g)' }}>{error.confidence}%</div>
                 </div>
                 <div>
                   <div style={{ fontSize: 11, fontFamily: 'Space Mono', color: 'var(--t3)', marginBottom: 4 }}>MATCH TYPE</div>
                   <div style={{ fontFamily: 'Poppins', fontWeight: 800, fontSize: 20, color: 'var(--o)', marginTop: 4 }}>{error.matchType}</div>
                 </div>
               </div>
            </div>
            
            {file && file.type.startsWith('image/') && (
              <div style={{ flex: 1, minWidth: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#080810', borderRadius: 12, border: '1px dashed var(--bdr)', overflow: 'hidden', padding: 12, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(2, 12, 24, 0.8)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: 8, fontSize: 10, fontFamily: 'Space Mono', color: 'var(--t2)', border: '1px solid var(--bdr)' }}>UPLOADED IMAGE</div>
                <img src={URL.createObjectURL(file)} alt="Matched preview" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8 }} />
              </div>
            )}
            {file && file.type.startsWith('video/') && (
              <div style={{ flex: 1, minWidth: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#080810', borderRadius: 12, border: '1px dashed var(--bdr)', overflow: 'hidden', padding: 12, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(2, 12, 24, 0.8)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: 8, fontSize: 10, fontFamily: 'Space Mono', color: 'var(--t2)', border: '1px solid var(--bdr)' }}>UPLOADED VIDEO</div>
                <video src={URL.createObjectURL(file)} controls style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8 }} />
              </div>
            )}
          </div>
          
          <div style={{display:'flex',gap:12,justifyContent:'center', marginTop: 12}}>
            <button className="btn-g" onClick={resetAll}><Plus size={14}/> Upload Different File</button>
            <button className="btn-p" onClick={()=>setPage('alerts')}><Bell size={14}/> View Alerts</button>
          </div>
        </div>
      )}

      {/* Step indicator - hidden when showing dup result */}
      {!dupResult && (
        <div className="fu1" style={{display:'flex',alignItems:'center',gap:0,marginBottom:36}}>
          {steps.map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',flex:i<steps.length-1?1:'auto'}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:i<=step?'linear-gradient(135deg,var(--c),#b8a9e8)':'var(--bg3)',border:i===step?'2px solid var(--c)':'2px solid var(--bdr)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,fontFamily:'Space Mono',color:i<=step?'#020c18':'var(--t3)',transition:'all .4s',boxShadow:i===step?'0 0 14px rgba(184,169,232,.4)':'none'}}>
                  {i<step?<CheckCircle size={14} color="#020c18"/>:i+1}
                </div>
                <span style={{fontSize:11,color:i<=step?'var(--c)':'var(--t3)',whiteSpace:'nowrap',fontFamily:'Space Mono'}}>{s}</span>
              </div>
              {i<steps.length-1&&<div style={{flex:1,height:2,margin:'0 8px',marginTop:-18,background:i<step?'linear-gradient(90deg,var(--c),var(--v))':'var(--bdr)',transition:'all .4s',borderRadius:1}}/>}
            </div>
          ))}
        </div>
      )}

      {step===0&&(
        <div className="fu2">
          <div className={`drop-zone${dragging?' over':''}`}
            onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)}
            onDrop={e=>{e.preventDefault();setDragging(false);onFileSelected(e.dataTransfer.files[0])}}>
            <div style={{animation:'float 4s ease-in-out infinite'}}>
              <div style={{width:72,height:72,background:'var(--cv)',border:'2px solid var(--cb)',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}><Upload size={32} color="var(--c)"/></div>
            </div>
            <h3 style={{fontFamily:'Poppins',fontWeight:700,fontSize:20,marginBottom:8}}>{file?file.name:'Drop your media file here'}</h3>
            <p style={{color:'var(--t2)',fontSize:14,marginBottom:20}}>{file?`${formatBytes(file.size)} · Ready`:'Images, videos, audio, documents'}</p>
            <label style={{cursor:'pointer'}}><input type="file" style={{display:'none'}} onChange={e=>onFileSelected(e.target.files[0])}/><span className="btn-s"><Plus size={14}/> Browse Files</span></label>
          </div>
          {file&&(
            <div style={{marginTop:20,display:'flex',gap:14}}>
              <div className="card" style={{flex:1}}>
                <div style={{fontSize:11,fontFamily:'Space Mono',color:'var(--t3)',marginBottom:12}}>ASSET DETAILS</div>
                <input className="input" placeholder="Asset title" style={{marginBottom:10}} value={title} onChange={e=>setTitle(e.target.value)}/>
                <select className="input" style={{marginBottom:10}} value={fileType} onChange={e=>setFileType(e.target.value)}>
                  <option value="image">Image / Photo</option><option value="video">Video</option><option value="audio">Audio</option><option value="document">Document</option>
                </select>
                <input className="input" placeholder="Description (optional)" value={description} onChange={e=>setDescription(e.target.value)}/>
              </div>
              <div className="card" style={{flex:1}}>
                <div style={{fontSize:11,fontFamily:'Space Mono',color:'var(--t3)',marginBottom:12}}>PROTECTION INFO</div>
                {['Cryptographic Fingerprint','Platform Registration','Violation Monitoring','Detection Tracking'].map((o,i)=>(
                  <label key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<3?'1px solid var(--bdr)':'none'}}>
                    <div style={{width:18,height:18,borderRadius:5,background:'var(--cv)',border:'1px solid var(--cb)',display:'flex',alignItems:'center',justifyContent:'center'}}><CheckSquare size={11} color="var(--c)"/></div>
                    <span style={{fontSize:14}}>{o}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {file&&<button className="btn-p" style={{marginTop:20,width:'100%',justifyContent:'center',padding:14}} onClick={startUpload}><Lock size={15}/> Begin Protection Process</button>}
        </div>
      )}

      {step===1&&(
        <div className="fu2">
          <div className="card" style={{textAlign:'center',padding:'40px 32px'}}>
            <div style={{position:'relative',width:160,height:160,margin:'0 auto 28px'}}>
              {[0,1,2].map(i=><div key={i} style={{position:'absolute',inset:i*20,borderRadius:'50%',border:'1px solid rgba(184,169,232,.2)',animation:`ping 2s ${i*0.5}s ease-out infinite`}}/>)}
              <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'2px solid var(--cb)',overflow:'hidden'}}><div style={{position:'absolute',top:'50%',left:'50%',width:'50%',height:'50%',background:'conic-gradient(from 0deg,transparent 270deg,rgba(184,169,232,.4) 360deg)',transformOrigin:'0% 0%',animation:'spin 2s linear infinite'}}/></div>
              <div style={{position:'absolute',inset:'50%',transform:'translate(-50%,-50%)',width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,var(--c),#b8a9e8)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 20px rgba(184,169,232,.5)'}}><Fingerprint size={18} color="#020c18"/></div>
            </div>
            <h3 style={{fontFamily:'Poppins',fontWeight:700,fontSize:22,marginBottom:8}}>Registering Asset</h3>
            <p style={{color:'var(--t2)',fontSize:14,marginBottom:28}}>Creating fingerprint and registering...</p>
            <div style={{textAlign:'left',marginBottom:24}}>
              {fingerSteps.map((fs,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',background:fs.done?'var(--gv)':i===fingerSteps.filter(f=>f.done).length?'var(--cv)':'transparent',borderRadius:9,marginBottom:6,border:fs.done?'1px solid var(--gb)':i===fingerSteps.filter(f=>f.done).length?'1px solid var(--cb)':'1px solid transparent'}}>
                  {fs.done?<CheckCircle size={16} color="var(--g)"/>:i===fingerSteps.filter(f=>f.done).length?<div style={{width:16,height:16,border:'2px solid var(--c)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>:<Clock size={16} color="var(--t3)"/>}
                  <span style={{fontSize:14,color:fs.done?'var(--g)':i===fingerSteps.filter(f=>f.done).length?'var(--c)':'var(--t3)'}}>{fs.label}</span>
                  {fs.done&&<span style={{marginLeft:'auto',fontSize:11,fontFamily:'Space Mono',color:'var(--g)'}}>DONE</span>}
                </div>
              ))}
            </div>
            <div style={{background:'var(--bg2)',borderRadius:8,padding:'12px 16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:13,color:'var(--t2)'}}>Processing...</span>
                <span style={{fontSize:13,fontFamily:'Space Mono',color:'var(--c)'}}>{Math.round(progress)}%</span>
              </div>
              <div style={{height:6,background:'var(--bg3)',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:3,background:'linear-gradient(90deg,var(--c),var(--v))',width:`${progress}%`,transition:'width .3s'}}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {!dupResult && step>=2&&(
        <div className="fu2">
          <div className="card" style={{textAlign:'center',padding:'48px 40px'}}>
            <div style={{width:80,height:80,background:'var(--gv)',border:'2px solid var(--gb)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',animation:'glow 2s ease-in-out infinite'}}><CheckCircle size={40} color="var(--g)"/></div>
            <h2 style={{fontFamily:'Poppins',fontWeight:800,fontSize:26,marginBottom:10}}>Asset Successfully Protected!</h2>
            <p style={{color:'var(--t2)',fontSize:15,marginBottom:32}}>Your asset has been fingerprinted and registered.</p>
            <div style={{display:'flex',gap:12,justifyContent:'center'}}>
              <button className="btn-p" onClick={resetAll}><Plus size={14}/> Protect Another</button>
              <button className="btn-s" onClick={()=>setPage('library')}><Eye size={14}/> View in Library</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ASSET LIBRARY
   ═══════════════════════════════════════════════════════════════════════════ */
function AssetLibrary({setPage}) {
  const [assets,setAssets] = useState([])
  const [loading,setLoading] = useState(true)
  const [filter,setFilter] = useState('all')
  const [statusFilter,setStatusFilter] = useState('all')
  const [search,setSearch] = useState('')
  const [pagination,setPagination] = useState({total:0,page:1,pages:1})

  const fetchAssets = async (pg=1) => {
    setLoading(true)
    try {
      const params = [`page=${pg}`,`limit=20`]; if(statusFilter!=='all') params.push(`status=${statusFilter}`)
      const res = await assetsAPI.getAll(params.join('&')); const data = res.data||res
      setAssets(data.assets||data||[]); if(data.pagination) setPagination(data.pagination)
    } catch(e) { console.error(e) }
    setLoading(false)
  }
  useEffect(()=>{fetchAssets()},[statusFilter])

  const filtered = assets.filter(a=>{
    if(filter!=='all'&&a.fileType!==filter) return false
    if(search&&!a.title?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const typeIcon=(t)=>t==='video'?<FileVideo size={20}/>:t==='image'?<Image size={20}/>:t==='audio'?<Radio size={20}/>:<Layers size={20}/>
  const typeColor=(t)=>t==='video'?'#b8a9e8':t==='image'?'#b8a9e8':t==='audio'?'#b8a9e8':'#b8a9e8'
  const handleDelete = async (id) => { if(!confirm('Delete this asset?')) return; try { await assetsAPI.delete(id); setAssets(p=>p.filter(a=>(a._id||a.id)!==id)) } catch(e) { alert(e.message) } }

  return (
    <div style={{padding:'28px 32px',maxWidth:1200}} className="fu">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:'Poppins',fontWeight:800,fontSize:28,letterSpacing:'-0.02em'}}>Asset Library</h1>
          <p style={{color:'var(--t2)',fontSize:14,marginTop:4}}>{pagination.total||assets.length} assets in your vault</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button className="btn-g" onClick={()=>fetchAssets()}><RefreshCw size={14}/> Refresh</button>
          <button className="btn-p" onClick={()=>setPage('upload')}><Plus size={14}/> Add Asset</button>
        </div>
      </div>
      <div className="fu1" style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--t3)'}}/>
          <input className="input" placeholder="Search assets..." style={{paddingLeft:36}} value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div style={{display:'flex',gap:6}}>
          {['all','image','video','audio','document'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:'9px 16px',borderRadius:8,border:'1px solid var(--bdr)',background:filter===f?'var(--cv)':'transparent',color:filter===f?'var(--c)':'var(--t2)',fontFamily:'Poppins',fontSize:13,fontWeight:500,cursor:'pointer',borderColor:filter===f?'var(--cb)':'var(--bdr)'}}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
          ))}
        </div>
      </div>
      {loading?(
        <div className="card" style={{textAlign:'center',padding:40}}>
          <div style={{width:24,height:24,border:'2px solid var(--c)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 12px'}}/>
          <p style={{color:'var(--t2)'}}>Loading assets...</p>
        </div>
      ):filtered.length===0?(
        <div className="card" style={{textAlign:'center',padding:40}}>
          <Database size={32} color="var(--t3)" style={{margin:'0 auto 12px'}}/>
          <p style={{color:'var(--t2)',fontSize:15}}>No assets found</p>
          <button className="btn-p" style={{marginTop:16}} onClick={()=>setPage('upload')}><Plus size={14}/> Upload Your First Asset</button>
        </div>
      ):(
        <div className="fu2" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:14}}>
          {filtered.map(a=>{const id=a._id||a.id; const color=typeColor(a.fileType); const hasThumbnail=a.fileUrl&&(a.fileType==='image'||a.fileType==='video'); return(
            <div key={id} className="card" style={{cursor:'pointer',padding:0,overflow:'hidden'}}>
              <div style={{height:130,background:hasThumbnail?'#020c18':`linear-gradient(135deg,${color}20,${color}08)`,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',borderBottom:'1px solid var(--bdr)',overflow:'hidden'}}>
                {hasThumbnail&&a.fileType==='image'?<img src={a.fileUrl} alt={a.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:hasThumbnail&&a.fileType==='video'?<video src={a.fileUrl} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{color,opacity:.7}}>{typeIcon(a.fileType)}</div>}
                <div style={{position:'absolute',top:10,right:10}}><span className={`badge ${a.status==='active'?'badge-g':a.status==='flagged'?'badge-r':'badge-o'}`}>{a.status}</span></div>
                {a.detectionCount>0&&<div style={{position:'absolute',top:10,left:10}}><span className="badge badge-r"><AlertTriangle size={9}/>{a.detectionCount}</span></div>}
              </div>
              <div style={{padding:'14px 16px'}}>
                <div style={{fontWeight:600,fontSize:14,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.title||a.filename||'Untitled'}</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{color:'var(--t2)',fontSize:12}}>{formatBytes(a.fileSize)} · {formatDate(a.createdAt)}</span>
                  <button className="btn-g" style={{padding:'4px 8px',fontSize:12,color:'var(--r)'}} onClick={()=>handleDelete(id)} title="Delete"><X size={13}/></button>
                </div>
                {(a.ahash || a.phash || a.dhash) && (
                  <div style={{marginTop:10,paddingTop:8,borderTop:'1px solid var(--bdr)',display:'grid',gridTemplateColumns:'1fr',gap:4}}>
                    <div style={{fontSize:10,fontFamily:'Space Mono',color:'var(--t3)',letterSpacing:'.04em'}}>HASHES</div>
                    <div style={{fontSize:11,color:'var(--t2)',fontFamily:'Space Mono'}}>aHash: {a.ahash || '—'}</div>
                    <div style={{fontSize:11,color:'var(--t2)',fontFamily:'Space Mono'}}>pHash: {a.phash || '—'}</div>
                    <div style={{fontSize:11,color:'var(--t2)',fontFamily:'Space Mono'}}>dHash: {a.dhash || '—'}</div>
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ALERTS PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

/* Metric chip for alert detail panel */
function MetricChip({label, value, unit = '', highlight = false}) {
  const displayVal = typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(4)) : (value ?? '—')
  const isHigh = typeof value === 'number' && value >= 0.7
  const isMed = typeof value === 'number' && value >= 0.4 && value < 0.7
  const chipColor = highlight
    ? 'var(--c)'
    : isHigh ? 'var(--g)' : isMed ? 'var(--o)' : 'var(--t2)'
  return (
    <div style={{background:'var(--bg2)',border:'1px solid var(--bdr)',borderRadius:9,padding:'10px 12px',minWidth:0}}>
      <div style={{fontSize:10,fontFamily:'Space Mono',color:'var(--t3)',marginBottom:6,letterSpacing:'.04em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}} title={label}>{label}</div>
      <div style={{fontFamily:'Poppins',fontWeight:700,fontSize:16,color:chipColor}}>{displayVal}{unit && <span style={{fontSize:11,fontWeight:500,color:'var(--t3)',marginLeft:2}}>{unit}</span>}</div>
    </div>
  )
}

/* Status badge for match_status */
function MatchStatusBadge({status}) {
  const map = {identical:'badge-g',strong:'badge-c',partial:'badge-o',weak:'badge-r',no_match:'badge-r'}
  return <span className={`badge ${map[status]||'badge-o'}`} style={{fontSize:12,padding:'3px 10px',textTransform:'capitalize'}}>{status?.replace('_',' ')||'—'}</span>
}

function AlertsPage() {
  const [alerts,setAlerts] = useState([])
  const [loading,setLoading] = useState(true)
  const [filter,setFilter] = useState('all')
  const [alertStats,setAlertStats] = useState(null)
  const [expandedAlerts,setExpandedAlerts] = useState({})

  const toggleExpand = (id) => setExpandedAlerts(prev => ({...prev, [id]: !prev[id]}))

  const fetchAlerts = async () => {
    setLoading(true)
    const params = filter!=='all'?(['open','acknowledged','in_progress','resolved','closed'].includes(filter)?`status=${filter}`:`severity=${filter}`):''
    const [aR,sR] = await Promise.allSettled([alertsAPI.getAll(params),alertsAPI.getStats()])
    if(aR.status==='fulfilled'){const d=aR.value.data||aR.value;setAlerts(d.alerts||d||[])}
    if(sR.status==='fulfilled') setAlertStats(sR.value.data||sR.value)
    setLoading(false)
  }
  useEffect(()=>{fetchAlerts()},[filter])

  const handleTakedown=async(id)=>{try{await alertsAPI.recordDMCA(id,{dmcaSent:true,copyrightReportFiled:true});fetchAlerts()}catch(e){alert(e.message)}}
  const handleAck=async(id)=>{try{await alertsAPI.updateStatus(id,{status:'acknowledged'});fetchAlerts()}catch(e){alert(e.message)}}
  const handleClose=async(id)=>{try{await alertsAPI.close(id,{closureReason:'Resolved'});fetchAlerts()}catch(e){alert(e.message)}}
  const summary=alertStats?.summary||{}

  return (
    <div style={{padding:'28px 32px',maxWidth:1000}} className="fu">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
        <div>
          <h1 style={{fontFamily:'Poppins',fontWeight:800,fontSize:28,letterSpacing:'-0.02em'}}>Alert Center</h1>
          <p style={{color:'var(--t2)',fontSize:14,marginTop:4}}>Manage violation alerts and takedown actions.</p>
        </div>
        <button className="btn-g" onClick={fetchAlerts}><RefreshCw size={14}/> Refresh</button>
      </div>
      <div className="fu1" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[{label:'Open',value:summary.open||0,color:'r',icon:<Bell size={16}/>},{label:'In Progress',value:summary.inProgress||0,color:'o',icon:<Activity size={16}/>},{label:'Resolved',value:summary.resolved||0,color:'c',icon:<Eye size={16}/>},{label:'Closed',value:summary.closed||0,color:'g',icon:<CheckCircle size={16}/>}].map((s,i)=>(
          <div key={i} className="card" style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:38,height:38,borderRadius:9,flexShrink:0,background:s.color==='r'?'var(--rv)':s.color==='o'?'var(--ov)':s.color==='c'?'var(--cv)':'var(--gv)',display:'flex',alignItems:'center',justifyContent:'center',color:s.color==='r'?'var(--r)':s.color==='o'?'var(--o)':s.color==='c'?'var(--c)':'var(--g)'}}>{s.icon}</div>
            <div><div style={{fontFamily:'Poppins',fontWeight:800,fontSize:22}}>{loading?'—':s.value}</div><div style={{fontSize:12,color:'var(--t2)'}}>{s.label}</div></div>
          </div>
        ))}
      </div>
      <div className="fu2" style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
        {['all','open','acknowledged','in_progress','resolved','closed','high','critical'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'7px 14px',borderRadius:8,border:'1px solid var(--bdr)',fontSize:12,fontWeight:500,background:filter===f?'var(--cv)':'transparent',color:filter===f?'var(--c)':'var(--t2)',borderColor:filter===f?'var(--cb)':'var(--bdr)',fontFamily:'Poppins',cursor:'pointer'}}>{f.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</button>
        ))}
      </div>
      {loading?(
        <div className="card" style={{textAlign:'center',padding:40}}><div style={{width:24,height:24,border:'2px solid var(--c)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 12px'}}/><p style={{color:'var(--t2)'}}>Loading...</p></div>
      ):alerts.length===0?(
        <div className="card" style={{textAlign:'center',padding:40}}><CheckCircle size={32} color="var(--g)" style={{margin:'0 auto 12px'}}/><p style={{color:'var(--t2)'}}>No alerts — all clear!</p></div>
      ):(
        <div className="fu3" style={{display:'flex',flexDirection:'column',gap:10}}>
          {alerts.map(a=>{const id=a._id||a.id;const done=a.status==='resolved'||a.status==='closed';const mm=a.matchMetrics||{};const isExpanded=!!expandedAlerts[id];const hasMetrics=mm&&Object.keys(mm).length>0;return(
            <div key={id} className="card" style={{opacity:done?.6:1,padding:0,overflow:'hidden'}}>
              {/* Header row */}
              <div style={{display:'flex',alignItems:'center',gap:16,padding:'16px 20px',cursor:hasMetrics?'pointer':'default'}} onClick={()=>hasMetrics&&toggleExpand(id)}>
                <div style={{width:48,height:48,borderRadius:11,flexShrink:0,background:a.severity==='high'||a.severity==='critical'?'var(--rv)':a.severity==='medium'?'var(--ov)':'var(--cv)',display:'flex',alignItems:'center',justifyContent:'center',color:a.severity==='high'||a.severity==='critical'?'var(--r)':a.severity==='medium'?'var(--o)':'var(--c)'}}><AlertTriangle size={20}/></div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4,flexWrap:'wrap'}}>
                    <span style={{fontWeight:700,fontSize:14}}>{a.title||'Alert'}</span>
                    <span className={`badge ${a.severity==='high'||a.severity==='critical'?'badge-r':a.severity==='medium'?'badge-o':'badge-c'}`}>{a.severity}</span>
                    <span className={`badge ${a.status==='open'?'badge-v':done?'badge-g':'badge-o'}`}>{a.status?.replace('_',' ')}</span>
                    {mm.isCrop&&<span className="badge badge-o" style={{fontSize:10,fontWeight:700}}>✂️ CROP</span>}
                    {mm.isContrast&&<span className="badge badge-o" style={{fontSize:10,fontWeight:700}}>🎨 CONTRAST</span>}
                    {mm.transformationType&&mm.transformationType!=='none'&&!mm.isCrop&&!mm.isContrast&&<span className="badge badge-c" style={{fontSize:10,fontWeight:700}}>🔄 {mm.transformationType.replace('_',' ').toUpperCase()}</span>}
                  </div>
                  <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                    <span style={{fontSize:13,color:'var(--t2)',display:'flex',alignItems:'center',gap:5}}><Globe size={12}/>{a.platform||'—'}</span>
                    <span style={{fontSize:13,color:'var(--t2)',display:'flex',alignItems:'center',gap:5}}><Clock size={12}/>{timeAgo(a.createdAt)}</span>
                    {hasMetrics&&<span style={{fontSize:12,color:'var(--c)',display:'flex',alignItems:'center',gap:4}}><ChevronRight size={12} style={{transform:isExpanded?'rotate(90deg)':'rotate(0deg)',transition:'transform .2s'}}/> {isExpanded?'Hide':'Show'} Metrics</span>}
                  </div>
                </div>
                <div style={{display:'flex',gap:8,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                  {a.status==='open'&&<button className="btn-g" style={{padding:'8px 14px',fontSize:13}} onClick={()=>handleAck(id)}><Eye size={13}/> Review</button>}
                  {!done&&<button className="btn-p" style={{padding:'8px 14px',fontSize:13}} onClick={()=>handleTakedown(id)}><Zap size={13}/> Takedown</button>}
                  {a.status==='resolved'&&<button className="btn-g" style={{padding:'8px 14px',fontSize:13}} onClick={()=>handleClose(id)}><CheckCircle size={13}/> Close</button>}
                </div>
              </div>

              {/* Expandable match metrics detail panel */}
              {isExpanded&&hasMetrics&&(
                <div style={{borderTop:'1px solid var(--bdr)',padding:'16px 20px',background:'var(--bg1)',animation:'fadeIn .25s ease'}}>
                  {/* Source & matched info */}
                  <div style={{display:'flex',gap:20,marginBottom:16,flexWrap:'wrap'}}>
                    {a.sourceFileName&&<div style={{fontSize:13,color:'var(--t2)'}}><span style={{color:'var(--t3)',fontFamily:'Space Mono',fontSize:10,marginRight:6}}>SOURCE:</span>{a.sourceFileName}</div>}
                    {a.sourceType&&<div style={{fontSize:13,color:'var(--t2)'}}><span style={{color:'var(--t3)',fontFamily:'Space Mono',fontSize:10,marginRight:6}}>TYPE:</span>{a.sourceType}</div>}
                    {a.matchedPublicId&&<div style={{fontSize:13,color:'var(--t2)'}}><span style={{color:'var(--t3)',fontFamily:'Space Mono',fontSize:10,marginRight:6}}>MATCHED:</span>{a.matchedPublicId}</div>}
                    {a.matchedFilename&&<div style={{fontSize:13,color:'var(--t2)'}}><span style={{color:'var(--t3)',fontFamily:'Space Mono',fontSize:10,marginRight:6}}>FILE:</span>{a.matchedFilename}</div>}
                  </div>

                  {/* Hash Similarity Metrics */}
                  <div style={{fontSize:11,fontFamily:'Space Mono',color:'var(--t3)',marginBottom:10,letterSpacing:'.06em'}}>HASH SIMILARITY METRICS</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8,marginBottom:16}}>
                    <MetricChip label="Global Hash" value={mm.globalHashSimilarity} />
                    <MetricChip label="Colour" value={mm.colourSimilarity} />
                    <MetricChip label="Crop" value={mm.cropSimilarity} />
                    <MetricChip label="ORB" value={mm.orbSimilarity} />
                    <MetricChip label="Region" value={mm.regionSimilarity} />
                    <MetricChip label="aHash" value={mm.ahashSimilarity} />
                    <MetricChip label="pHash" value={mm.phashSimilarity} />
                    <MetricChip label="dHash" value={mm.dhashSimilarity} />
                  </div>

                  {/* Scenario Scores */}
                  <div style={{fontSize:11,fontFamily:'Space Mono',color:'var(--t3)',marginBottom:10,letterSpacing:'.06em'}}>SCENARIO MATCH SCORES</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:8,marginBottom:16}}>
                    <MetricChip label="Standard Match" value={mm.scenarioStandardMatch} unit="%" />
                    <MetricChip label="Crop Match" value={mm.scenarioCropMatch} unit="%" />
                    <MetricChip label="Region Match" value={mm.scenarioRegionMatch} unit="%" />
                    <MetricChip label="Structural Match" value={mm.scenarioStructuralMatch} unit="%" />
                    <MetricChip label="Heavy Transform" value={mm.scenarioHeavyTransformMatch} unit="%" />
                  </div>

                  {/* Combined Results */}
                  <div style={{fontSize:11,fontFamily:'Space Mono',color:'var(--t3)',marginBottom:10,letterSpacing:'.06em'}}>COMBINED RESULTS</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                    <MetricChip label="Combined Similarity" value={mm.combinedSimilarityPercentage} unit="%" highlight />
                    <MetricChip label="Score / 20" value={mm.similarityScoreOutOf20} unit="/20" highlight />
                    <div style={{background:'var(--bg2)',border:'1px solid var(--bdr)',borderRadius:9,padding:'10px 12px',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
                      <div style={{fontSize:10,fontFamily:'Space Mono',color:'var(--t3)',marginBottom:6,letterSpacing:'.04em'}}>MATCH STATUS</div>
                      <MatchStatusBadge status={mm.matchStatus}/>
                    </div>
                    <div style={{background:'var(--bg2)',border:'1px solid var(--bdr)',borderRadius:9,padding:'10px 12px',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
                      <div style={{fontSize:10,fontFamily:'Space Mono',color:'var(--t3)',marginBottom:6,letterSpacing:'.04em'}}>TRANSFORM TYPE</div>
                      <span className={`badge ${mm.isCrop?'badge-o':mm.isContrast?'badge-o':mm.transformationType==='exact'?'badge-r':'badge-c'}`} style={{fontSize:12,padding:'3px 10px',textTransform:'capitalize'}}>{mm.isCrop?'✂️ Crop':mm.isContrast?'🎨 Contrast':mm.transformationType?mm.transformationType.replace('_',' '):'None'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANALYTICS PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
function AnalyticsPage() {
  const [aS,setAS]=useState(null),[dS,setDS]=useState(null),[alS,setALS]=useState(null),[loading,setLoading]=useState(true)
  const [mediaDetections,setMediaDetections]=useState([])
  const [activeMedia,setActiveMedia]=useState(null)

  useEffect(()=>{
    (async()=>{
      setLoading(true)
      const [a,d,al,allDetections] = await Promise.allSettled([
        assetsAPI.getStats(),
        detectionsAPI.getStats(),
        alertsAPI.getStats(),
        detectionsAPI.getAll('page=1&limit=500'),
      ])
      if(a.status==='fulfilled') setAS(a.value.data||a.value)
      if(d.status==='fulfilled') setDS(d.value.data||d.value)
      if(al.status==='fulfilled') setALS(al.value.data||al.value)
      if(allDetections.status==='fulfilled') {
        const payload = allDetections.value.data || allDetections.value
        const detections = payload?.detections || []
        setMediaDetections(Array.isArray(detections) ? detections : [])
      }
      setLoading(false)
    })()
  },[])

  const getMediaName = (detection, index) => {
    const sourceName = detection?.sourceFileName
    if (sourceName) return sourceName
    const matchedName = detection?.matchedFilename
    if (matchedName) return matchedName
    const assetTitle = detection?.assetId?.title
    if (assetTitle) return assetTitle
    const fromUrl = detection?.detectedUrl?.split('/')?.pop()
    if (fromUrl) return fromUrl
    return `Media ${index + 1}`
  }

  const compactMediaName = (name, max = 26) => {
    if (!name) return 'Unnamed media'
    const cleaned = String(name).replace(/^\d+[_-]?/, '').trim()
    if (cleaned.length <= max) return cleaned
    return `${cleaned.slice(0, max - 1)}…`
  }

  const getSimilarityScoreOutOf20 = (detection) => {
    const candidates = [
      detection?.similarityScoreOutOf20,
      detection?.matchMetrics?.similarityScoreOutOf20,
    ]

    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined || candidate === '') continue
      const numeric = Number(candidate)
      if (Number.isFinite(numeric)) return numeric
    }

    return null
  }

  const mediaScoreLineData = [...mediaDetections]
    .sort((a,b)=>new Date(a?.detectionDate||a?.createdAt||0)-new Date(b?.detectionDate||b?.createdAt||0))
    .map((d,index)=>{
      const score = getSimilarityScoreOutOf20(d)
      if (score === null) return null

      const mediaName = getMediaName(d, index)
      return {
        mediaIndex: index + 1,
        mediaName,
        mediaLabel: `M${index + 1}`,
        mediaDisplayName: compactMediaName(mediaName),
        similarityScoreOutOf20: Number(score.toFixed(2)),
      }
    })
    .filter(Boolean)
    .slice(-12)

  const piePalette = ['#ff3366','#b8a9e8','#4dd4ac','#ffc857','#5aa9e6','#ff7f50','#9bdeac','#c88cff','#ff9f1c','#2ec4b6']
  const topPieItems = [...mediaScoreLineData]
    .sort((a,b)=>b.similarityScoreOutOf20-a.similarityScoreOutOf20)
    .slice(0,8)
  const remainingPieItems = [...mediaScoreLineData]
    .sort((a,b)=>b.similarityScoreOutOf20-a.similarityScoreOutOf20)
    .slice(8)
  const remainingTotal = remainingPieItems.reduce((sum, item) => sum + item.similarityScoreOutOf20, 0)

  const mediaScorePieData = topPieItems.map((entry, index) => ({
    name: entry.mediaDisplayName,
    fullName: entry.mediaName,
    value: Number(entry.similarityScoreOutOf20.toFixed(2)),
    fill: piePalette[index % piePalette.length],
  }))

  if (remainingTotal > 0) {
    mediaScorePieData.push({
      name: 'Others',
      fullName: `${remainingPieItems.length} more uploads`,
      value: Number(remainingTotal.toFixed(2)),
      fill: '#3a5168',
    })
  }

  return (
    <div style={{padding:'28px 32px',maxWidth:1200}} className="fu">
      <h1 style={{fontFamily:'Poppins',fontWeight:800,fontSize:28,letterSpacing:'-0.02em',marginBottom:4}}>Analytics & Reports</h1>
      <p style={{color:'var(--t2)',fontSize:14,marginBottom:24}}>Insights from your asset protection data.</p>
      <div className="fu1" style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:24}}>
        {[{l:'Total Assets',v:aS?.totalAssets||0},{l:'Flagged',v:aS?.flaggedAssets||0},{l:'Detections',v:dS?.summary?.totalDetections||0},{l:'Open Alerts',v:alS?.summary?.open||0},{l:'Resolved',v:alS?.summary?.resolved||0}].map((k,i)=>(
          <div key={i} className="card" style={{textAlign:'center',padding:'16px 12px'}}>
            <div style={{fontSize:11,color:'var(--t3)',fontFamily:'Space Mono',marginBottom:8}}>{k.l.toUpperCase()}</div>
            <div style={{fontFamily:'Poppins',fontWeight:800,fontSize:24}}>{loading?'—':k.v}</div>
          </div>
        ))}
      </div>
      <div className="fu2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        {mediaScoreLineData.length>0&&<div className="card" style={{gridColumn:'1 / -1'}}>
          <div style={{fontFamily:'Poppins',fontWeight:700,fontSize:15,marginBottom:16}}>Similarity Score / 20 by Uploaded Media</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={mediaScoreLineData} margin={{top:0,right:18,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false}/>
              <XAxis dataKey="mediaLabel" interval={0} height={46} tick={{fill:'#3a5168',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,20]} tick={{fill:'#3a5168',fontSize:11}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CT/>}/>
              <Line type="linear" dataKey="similarityScoreOutOf20" name="Similarity Score / 20" stroke="#ff3366" strokeWidth={2.2} activeDot={{r:5}} connectNulls={false} dot={(props)=>{const {cx,cy,payload}=props;const isActive=activeMedia===payload.mediaLabel;return <circle key={payload.mediaLabel} cx={cx} cy={cy} r={isActive?8:3} fill={isActive?'#fff':'#ff3366'} stroke={isActive?'#ff3366':'none'} strokeWidth={isActive?3:0}/>}}/>
            </LineChart>
          </ResponsiveContainer>
          <div style={{marginTop:10,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8}}>
            {mediaScoreLineData.map(item=>(
              <div key={item.mediaLabel} onClick={()=>setActiveMedia(activeMedia===item.mediaLabel?null:item.mediaLabel)} style={{cursor:'pointer',transition:'all .2s',fontSize:11,color:activeMedia===item.mediaLabel?'#fff':'var(--t2)',display:'flex',justifyContent:'space-between',gap:8,padding:'6px 8px',border:activeMedia===item.mediaLabel?'1px solid var(--c)':'1px solid var(--bdr)',borderRadius:8,background:activeMedia===item.mediaLabel?'var(--cv)':'var(--bg2)'}}>
                <span style={{fontFamily:'Space Mono',color:activeMedia===item.mediaLabel?'var(--c)':'var(--t3)'}}>{item.mediaLabel}</span>
                <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={item.mediaName}>{item.mediaDisplayName}</span>
                <span style={{fontFamily:'Space Mono',color:activeMedia===item.mediaLabel?'#fff':'var(--c)'}}>{item.similarityScoreOutOf20}</span>
              </div>
            ))}
          </div>
        </div>}
        {mediaScorePieData.length>0&&<div className="card" style={{gridColumn:'1 / -1'}}>
          <div style={{fontFamily:'Poppins',fontWeight:700,fontSize:15,marginBottom:16}}>Similarity Score Share by Uploaded Media</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={mediaScorePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="value" nameKey="name">
                {mediaScorePieData.map((entry,i)=><Cell key={i} fill={entry.fill}/>) }
              </Pie>
              <Tooltip content={<CT/>}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:8,marginTop:8}}>
            {mediaScorePieData.map((item, i)=>(
              <div key={`${item.name}-${i}`} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--t2)',padding:'6px 8px',border:'1px solid var(--bdr)',borderRadius:8,background:'var(--bg2)'}}>
                <span style={{width:10,height:10,borderRadius:'50%',background:item.fill,display:'inline-block',flexShrink:0}} />
                <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={item.fullName || item.name}>{item.name}</span>
                <span style={{marginLeft:'auto',fontFamily:'Space Mono',color:'var(--c)'}}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>}
      </div>
      {!loading&&mediaScoreLineData.length===0&&mediaScorePieData.length===0&&(
        <div className="card" style={{textAlign:'center',padding:40}}><BarChart2 size={32} color="var(--t3)" style={{margin:'0 auto 12px'}}/><p style={{color:'var(--t2)'}}>No analytics data yet.</p></div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD APP (Authenticated wrapper)
   ═══════════════════════════════════════════════════════════════════════════ */
export default function DashboardApp({ user, onLogout }) {
  const navigate = useNavigate()
  const [page,setPage] = useState('dashboard')
  const [alertCount,setAlertCount] = useState(0)

  useEffect(() => {
    const fetchAlertCount = async () => {
      try { const res = await alertsAPI.getStats(); setAlertCount((res.data||res)?.summary?.open||0) } catch {}
    }
    fetchAlertCount()
    const iv = setInterval(fetchAlertCount, 60000)
    return () => clearInterval(iv)
  }, [])

  const handleLogout = () => {
    onLogout()
    navigate("/")
  }

  const pageMap = {
    dashboard: <Dashboard setPage={setPage}/>,
    upload:    <UploadPage setPage={setPage}/>,
    library:   <AssetLibrary setPage={setPage}/>,
    alerts:    <AlertsPage/>,
    analytics: <AnalyticsPage/>,
    help:      (
      <div style={{padding:'28px 32px',maxWidth:1100}}>
        <div style={{marginBottom:24}}>
          <h2 style={{fontFamily:'Poppins',fontSize:30,fontWeight:800,letterSpacing:'-0.02em',marginBottom:8}}>Help & Support</h2>
          <p style={{color:'var(--t2)',fontSize:14,lineHeight:1.7}}>Complete documentation for operating the TRAQ platform at project handoff.</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14,marginBottom:14}}>
          <div className="card" style={{padding:18}}>
            <h3 style={{fontFamily:'Poppins',fontSize:16,fontWeight:700,marginBottom:10}}>System Overview</h3>
            <p style={{color:'var(--t2)',fontSize:13,lineHeight:1.7,marginBottom:10}}>TRAQ protects digital assets through upload fingerprinting, duplicate/match detection, and alert-based monitoring.</p>
            <ul style={{paddingLeft:16,color:'var(--t2)',fontSize:13,lineHeight:1.8,margin:0}}>
              <li>Frontend: React + Vite dashboard</li>
              <li>Backend: Node.js + Express APIs</li>
              <li>Engine: Python similarity and hashing pipeline</li>
              <li>Database: MongoDB Atlas/local MongoDB</li>
            </ul>
          </div>

          <div className="card" style={{padding:18}}>
            <h3 style={{fontFamily:'Poppins',fontSize:16,fontWeight:700,marginBottom:10}}>Start All Services</h3>
            <p style={{color:'var(--t2)',fontSize:13,lineHeight:1.7,marginBottom:10}}>Run each service in its own terminal from the project root.</p>
            <div style={{background:'var(--bg1)',border:'1px solid var(--bdr)',borderRadius:10,padding:'10px 12px',fontFamily:'Space Mono',fontSize:12,color:'#d7e6f7',lineHeight:1.7}}>
              cd backend && npm run dev<br/>
              cd frontend && npm run dev<br/>
              cd logic/detection_engine && python run_compare.py &lt;file_path&gt;
            </div>
          </div>

          <div className="card" style={{padding:18}}>
            <h3 style={{fontFamily:'Poppins',fontSize:16,fontWeight:700,marginBottom:10}}>Core Flows</h3>
            <ul style={{paddingLeft:16,color:'var(--t2)',fontSize:13,lineHeight:1.8,margin:0}}>
              <li>Upload & Protect: registers and fingerprints new assets</li>
              <li>Asset Library: view protected assets and metadata</li>
              <li>Alert Center: active detections with severity labels</li>
              <li>Analytics: volume trends and similarity insights</li>
            </ul>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:14}}>
          <div className="card" style={{padding:18}}>
            <h3 style={{fontFamily:'Poppins',fontSize:16,fontWeight:700,marginBottom:10}}>Troubleshooting</h3>
            <ul style={{paddingLeft:16,color:'var(--t2)',fontSize:13,lineHeight:1.8,margin:0}}>
              <li>If login fails, verify backend is running and token storage is enabled.</li>
              <li>If detection fails, install Python packages from requirements.txt.</li>
              <li>If MongoDB fails, ensure MONGODB_URI is valid and IP is whitelisted.</li>
              <li>If uploads fail, check max file limits and accepted file types.</li>
            </ul>
          </div>

          <div className="card" style={{padding:18}}>
            <h3 style={{fontFamily:'Poppins',fontSize:16,fontWeight:700,marginBottom:10}}>Release Checklist</h3>
            <ul style={{paddingLeft:16,color:'var(--t2)',fontSize:13,lineHeight:1.8,margin:0}}>
              <li>Confirm frontend and backend environment variables.</li>
              <li>Run smoke test: signup, signin, upload, alert creation.</li>
              <li>Verify duplicate detection using known matching files.</li>
              <li>Validate analytics cards and charts after sample scans.</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  }

  return (
    <div style={{display:'flex',minHeight:'100vh'}}>
      <Sidebar page={page} setPage={setPage} onLogout={handleLogout} user={user} alertCount={alertCount}/>
      <main style={{flex:1,overflowY:'auto',background:'var(--bg0)'}}>
        {pageMap[page]||pageMap.dashboard}
      </main>
    </div>
  )
}
