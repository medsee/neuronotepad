import { useState, useEffect, useRef, useCallback } from "react";

const SUBJECTS = ["Anatomiya","Fiziologiya","Nevrologiya","Biokimyo","Farmakologiya","Patologiya","Mikrobiologiya","Immunologiya"];
const COLORS = ["#6366f1","#22d3ee","#10b981","#f59e0b","#ef4444","#ec4899","#8b5cf6","#14b8a6"];

function getStore(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function setStore(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const INITIAL_NOTES = [];

export default function App() {
  const [notes, setNotes] = useState(() => getStore("nn_notes", INITIAL_NOTES));
  const [view, setView] = useState("home"); // home | editor | detail | subjects | flashcards | stats
  const [activeNote, setActiveNote] = useState(null);
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterColor, setFilterColor] = useState("all");
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [customSubjects, setCustomSubjects] = useState(() => getStore("nn_subjects", []));
  const [toast, setToast] = useState(null);
  const [flashIdx, setFlashIdx] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);
  const [darkMode] = useState(true);
  const fileRef = useRef();
  const editorRef = useRef();

  const allSubjects = [...SUBJECTS, ...customSubjects];

  useEffect(() => { setStore("nn_notes", notes); }, [notes]);
  useEffect(() => { setStore("nn_subjects", customSubjects); }, [customSubjects]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // ---- NOTE CRUD ----
  const createNote = () => {
    const note = {
      id: uid(), title: "", content: "", subject: allSubjects[0], color: COLORS[0],
      images: [], tags: [], createdAt: Date.now(), updatedAt: Date.now(),
      pinned: false, starred: false
    };
    setNotes(p => [note, ...p]);
    setActiveNote(note);
    setView("editor");
  };

  const saveNote = (updated) => {
    const n = { ...updated, updatedAt: Date.now() };
    setNotes(p => p.map(x => x.id === n.id ? n : x));
    setActiveNote(n);
    showToast("Saqlandi ✓");
  };

  const deleteNote = (id) => {
    setNotes(p => p.filter(x => x.id !== id));
    setView("home");
    showToast("O'chirildi", "error");
  };

  const togglePin = (id) => setNotes(p => p.map(x => x.id === id ? {...x, pinned: !x.pinned} : x));
  const toggleStar = (id) => setNotes(p => p.map(x => x.id === id ? {...x, starred: !x.starred} : x));

  // ---- IMAGE UPLOAD ----
  const handleImage = (e, note, setNote) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = { id: uid(), url: ev.target.result, name: file.name, size: file.size, addedAt: Date.now() };
        setNote(p => ({ ...p, images: [...(p.images||[]), img] }));
      };
      reader.readAsDataURL(file);
    });
  };

  // ---- FILTER ----
  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    const matchSearch = !q || n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q) || n.subject?.toLowerCase().includes(q) || (n.tags||[]).some(t => t.toLowerCase().includes(q));
    const matchSubject = filterSubject === "all" || n.subject === filterSubject;
    const matchColor = filterColor === "all" || n.color === filterColor;
    return matchSearch && matchSubject && matchColor;
  });

  const pinned = filtered.filter(n => n.pinned);
  const rest = filtered.filter(n => !n.pinned).sort((a,b) => b.updatedAt - a.updatedAt);

  // ---- STATS ----
  const subjectCounts = allSubjects.map(s => ({ s, c: notes.filter(n => n.subject === s).length })).filter(x => x.c > 0);
  const totalImages = notes.reduce((a, n) => a + (n.images||[]).length, 0);
  const totalWords = notes.reduce((a, n) => a + (n.content||"").split(/\s+/).filter(Boolean).length, 0);
  const starred = notes.filter(n => n.starred);

  // ---- FLASHCARDS ----
  const flashNotes = notes.filter(n => n.content && n.title);

  const fmt = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString("uz-UZ", { day:"2-digit", month:"short", year:"numeric" });
  };

  const s = {
    app: { fontFamily:"'DM Sans',system-ui,sans-serif", background:"#080c14", color:"#e2e8f0", minHeight:"100vh", display:"flex", flexDirection:"column" },
    topbar: { background:"#0d1321", borderBottom:"1px solid #1e2d42", padding:"0 20px", height:"58px", display:"flex", alignItems:"center", gap:"12px", position:"sticky", top:0, zIndex:50 },
    logo: { fontFamily:"'Syne',system-ui,sans-serif", fontSize:"20px", fontWeight:800, color:"#fff", display:"flex", alignItems:"center", gap:"6px", cursor:"pointer" },
    logoDot: { width:"8px", height:"8px", background:"#6366f1", borderRadius:"50%", display:"inline-block" },
    navBtn: (active) => ({ background: active ? "rgba(99,102,241,0.15)" : "transparent", color: active ? "#a5b4fc" : "#64748b", border:"none", borderRadius:"8px", padding:"6px 14px", fontSize:"13px", cursor:"pointer", fontWeight: active ? 600 : 400, transition:"all .2s" }),
    searchWrap: { flex:1, maxWidth:"340px", position:"relative" },
    searchInput: { width:"100%", background:"#111827", border:"1px solid #1e2d42", borderRadius:"10px", padding:"7px 14px 7px 36px", fontSize:"13px", color:"#e2e8f0", outline:"none", fontFamily:"inherit" },
    searchIcon: { position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", fontSize:"14px", color:"#475569" },
    btn: (color="#6366f1") => ({ background:color, border:"none", borderRadius:"10px", padding:"9px 18px", fontSize:"13px", color:"#fff", cursor:"pointer", fontWeight:600, fontFamily:"inherit", display:"flex", alignItems:"center", gap:"6px", transition:"opacity .2s" }),
    ghostBtn: { background:"transparent", border:"1px solid #1e2d42", borderRadius:"10px", padding:"8px 16px", fontSize:"13px", color:"#94a3b8", cursor:"pointer", fontFamily:"inherit", transition:"all .2s" },
    main: { padding:"24px 20px", flex:1, maxWidth:"1100px", width:"100%", margin:"0 auto" },
    sectionTitle: { fontFamily:"'Syne',system-ui,sans-serif", fontSize:"13px", fontWeight:700, color:"#475569", letterSpacing:"1px", marginBottom:"12px", textTransform:"uppercase" },
    noteCard: (color) => ({ background:"#0d1321", border:`1px solid ${color}33`, borderRadius:"14px", padding:"16px", cursor:"pointer", transition:"all .2s", borderLeft:`3px solid ${color}`, position:"relative" }),
    noteTitle: { fontFamily:"'Syne',system-ui,sans-serif", fontSize:"15px", fontWeight:700, color:"#f1f5f9", marginBottom:"4px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
    notePreview: { fontSize:"12px", color:"#64748b", lineHeight:"1.6", marginBottom:"10px", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" },
    noteMeta: { display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" },
    tag: (color="#6366f1") => ({ background:`${color}20`, color:color, borderRadius:"6px", padding:"2px 8px", fontSize:"11px", fontWeight:500 }),
    grid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"14px", marginBottom:"24px" },
    editorWrap: { display:"grid", gridTemplateColumns:"1fr 320px", gap:"20px", height:"calc(100vh - 140px)" },
    editorMain: { background:"#0d1321", borderRadius:"16px", border:"1px solid #1e2d42", display:"flex", flexDirection:"column", overflow:"hidden" },
    editorSide: { display:"flex", flexDirection:"column", gap:"14px", overflowY:"auto" },
    sideCard: { background:"#0d1321", border:"1px solid #1e2d42", borderRadius:"12px", padding:"16px" },
    label: { fontSize:"12px", color:"#64748b", marginBottom:"6px", display:"block", fontWeight:500 },
    input: { width:"100%", background:"#111827", border:"1px solid #1e2d42", borderRadius:"8px", padding:"8px 12px", fontSize:"13px", color:"#e2e8f0", outline:"none", fontFamily:"inherit" },
    textarea: { width:"100%", background:"transparent", border:"none", outline:"none", fontSize:"14px", color:"#e2e8f0", fontFamily:"inherit", lineHeight:"1.8", resize:"none", flex:1 },
    imgThumb: { width:"80px", height:"64px", borderRadius:"8px", objectFit:"cover", border:"1px solid #1e2d42" },
    statCard: { background:"#0d1321", border:"1px solid #1e2d42", borderRadius:"12px", padding:"18px", textAlign:"center" },
    statVal: { fontFamily:"'Syne',system-ui,sans-serif", fontSize:"28px", fontWeight:800, color:"#f1f5f9" },
    statLabel: { fontSize:"12px", color:"#64748b", marginTop:"4px" },
    toast: (type) => ({ position:"fixed", bottom:"24px", right:"24px", background: type==="error" ? "#ef4444" : "#10b981", color:"#fff", borderRadius:"12px", padding:"12px 20px", fontSize:"13px", fontWeight:600, zIndex:999, animation:"fadeUp .3s ease", boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }),
    flash: { background:"#0d1321", border:"1px solid #1e2d42", borderRadius:"20px", padding:"40px", textAlign:"center", cursor:"pointer", minHeight:"220px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", userSelect:"none", transition:"transform .1s" },
    badge: (color) => ({ background:`${color}20`, color:color, borderRadius:"20px", padding:"4px 12px", fontSize:"12px", fontWeight:600 }),
    colorDot: (c, active) => ({ width:"22px", height:"22px", borderRadius:"50%", background:c, cursor:"pointer", border: active ? "3px solid #fff" : "2px solid transparent", transition:"border .15s" }),
  };

  // ============ EDITOR COMPONENT ============
  function Editor({ initial }) {
    const [note, setNote] = useState({ ...initial });
    const [tagInput, setTagInput] = useState("");
    const [newSubj, setNewSubj] = useState("");
    const imgRef = useRef();

    const addTag = (e) => {
      if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
        e.preventDefault();
        setNote(p => ({ ...p, tags: [...new Set([...(p.tags||[]), tagInput.trim()])] }));
        setTagInput("");
      }
    };
    const removeTag = (t) => setNote(p => ({ ...p, tags: (p.tags||[]).filter(x => x !== t) }));
    const removeImg = (id) => setNote(p => ({ ...p, images: (p.images||[]).filter(i => i.id !== id) }));

    return (
      <div style={{ display:"flex", flexDirection:"column", height:"100%", gap:"0" }}>
        {/* Toolbar */}
        <div style={{ padding:"14px 20px", borderBottom:"1px solid #1e2d42", display:"flex", alignItems:"center", gap:"10px" }}>
          <button style={s.ghostBtn} onClick={() => { setView("home"); }}>← Orqaga</button>
          <input
            value={note.title}
            onChange={e => setNote(p => ({...p, title: e.target.value}))}
            placeholder="Mavzu nomi..."
            style={{ ...s.input, flex:1, fontSize:"16px", fontWeight:700, fontFamily:"'Syne',system-ui,sans-serif", background:"transparent", border:"none", padding:"0" }}
          />
          <button style={s.btn(note.color)} onClick={() => saveNote(note)}>💾 Saqlash</button>
          <button style={{ ...s.ghostBtn, color:"#ef4444", borderColor:"#ef444433" }} onClick={() => { if(confirm("O'chirilsinmi?")) deleteNote(note.id); }}>🗑</button>
        </div>
        <div style={s.editorWrap}>
          {/* Left: content */}
          <div style={s.editorMain}>
            <textarea
              style={{ ...s.textarea, padding:"20px", flex:1 }}
              placeholder="Dars konspektini shu yerga yozing...\n\n• Asosiy fikrlar\n• Formulalar\n• Misollar\n\nMarkdown qo'llash mumkin"
              value={note.content}
              onChange={e => setNote(p => ({...p, content: e.target.value}))}
              rows={20}
            />
            {/* Image preview in editor */}
            {(note.images||[]).length > 0 && (
              <div style={{ padding:"12px 16px", borderTop:"1px solid #1e2d42", display:"flex", gap:"10px", flexWrap:"wrap" }}>
                {note.images.map(img => (
                  <div key={img.id} style={{ position:"relative" }}>
                    <img src={img.url} alt={img.name} style={s.imgThumb} />
                    <button onClick={() => removeImg(img.id)} style={{ position:"absolute", top:"-6px", right:"-6px", background:"#ef4444", border:"none", borderRadius:"50%", width:"18px", height:"18px", color:"#fff", fontSize:"10px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Right: settings */}
          <div style={s.editorSide}>
            {/* Subject */}
            <div style={s.sideCard}>
              <span style={s.label}>📚 Fan / Mavzu</span>
              <select value={note.subject} onChange={e => setNote(p=>({...p,subject:e.target.value}))} style={{ ...s.input, marginBottom:"8px" }}>
                {allSubjects.map(s2 => <option key={s2} value={s2}>{s2}</option>)}
              </select>
              {!showNewSubject
                ? <button style={{ ...s.ghostBtn, fontSize:"12px", width:"100%" }} onClick={() => setShowNewSubject(true)}>+ Yangi fan qo'shish</button>
                : <div style={{ display:"flex", gap:"6px" }}>
                    <input value={newSubj} onChange={e=>setNewSubj(e.target.value)} placeholder="Fan nomi..." style={{ ...s.input, flex:1, fontSize:"12px" }} />
                    <button style={s.btn()} onClick={() => {
                      if(newSubj.trim()) { setCustomSubjects(p=>[...p,newSubj.trim()]); setNote(p=>({...p,subject:newSubj.trim()})); setNewSubj(""); setShowNewSubject(false); }
                    }}>+</button>
                  </div>
              }
            </div>
            {/* Color */}
            <div style={s.sideCard}>
              <span style={s.label}>🎨 Rang</span>
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                {COLORS.map(c => <div key={c} style={s.colorDot(c, note.color===c)} onClick={() => setNote(p=>({...p,color:c}))} />)}
              </div>
            </div>
            {/* Tags */}
            <div style={s.sideCard}>
              <span style={s.label}>🏷 Teglar</span>
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder="Teg yozing + Enter"
                style={{ ...s.input, marginBottom:"8px" }}
              />
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                {(note.tags||[]).map(t => (
                  <span key={t} style={{ ...s.tag(note.color), cursor:"pointer" }} onClick={() => removeTag(t)}>{t} ×</span>
                ))}
              </div>
            </div>
            {/* Images */}
            <div style={s.sideCard}>
              <span style={s.label}>📸 Rasm yuklash</span>
              <input ref={imgRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={e => handleImage(e, note, setNote)} />
              <button style={{ ...s.btn(note.color), width:"100%", justifyContent:"center" }} onClick={() => imgRef.current.click()}>
                📷 Rasm tanlash
              </button>
              <p style={{ fontSize:"11px", color:"#475569", marginTop:"6px", textAlign:"center" }}>Dars yozuvlari, diagrammalar, sxemalar</p>
            </div>
            {/* Options */}
            <div style={s.sideCard}>
              <span style={s.label}>⚙️ Sozlamalar</span>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                <label style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"13px", cursor:"pointer", color:"#94a3b8" }}>
                  <input type="checkbox" checked={note.pinned||false} onChange={e=>setNote(p=>({...p,pinned:e.target.checked}))} />
                  📌 Yuqoriga pin
                </label>
                <label style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"13px", cursor:"pointer", color:"#94a3b8" }}>
                  <input type="checkbox" checked={note.starred||false} onChange={e=>setNote(p=>({...p,starred:e.target.checked}))} />
                  ⭐ Sevimlilar
                </label>
              </div>
            </div>
            <div style={{ fontSize:"11px", color:"#334155", textAlign:"center" }}>
              Oxirgi saqlangan: {fmt(note.updatedAt)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ NOTE DETAIL ============
  function NoteDetail({ note }) {
    const n = notes.find(x => x.id === note.id) || note;
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"20px" }}>
          <button style={s.ghostBtn} onClick={() => setView("home")}>← Orqaga</button>
          <div style={{ flex:1 }}>
            <h1 style={{ fontFamily:"'Syne',system-ui,sans-serif", fontSize:"22px", fontWeight:800, color:n.color }}>{n.title || "Nomsiz"}</h1>
            <div style={{ display:"flex", gap:"8px", marginTop:"4px", flexWrap:"wrap" }}>
              <span style={s.tag(n.color)}>{n.subject}</span>
              {(n.tags||[]).map(t => <span key={t} style={s.tag("#64748b")}>{t}</span>)}
              <span style={{ fontSize:"11px", color:"#475569" }}>{fmt(n.updatedAt)}</span>
            </div>
          </div>
          <button style={s.btn(n.color)} onClick={() => { setActiveNote(n); setView("editor"); }}>✏️ Tahrirlash</button>
          <button onClick={() => toggleStar(n.id)} style={{ ...s.ghostBtn, color: n.starred ? "#f59e0b" : "#64748b" }}>{n.starred ? "⭐" : "☆"}</button>
        </div>
        {/* Content */}
        <div style={{ background:"#0d1321", border:`1px solid ${n.color}33`, borderRadius:"16px", padding:"28px", marginBottom:"16px", minHeight:"200px", borderLeft:`4px solid ${n.color}` }}>
          <pre style={{ fontFamily:"'DM Sans',system-ui,sans-serif", fontSize:"14px", color:"#cbd5e1", lineHeight:"1.9", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{n.content || <span style={{color:"#334155"}}>Kontent yo'q</span>}</pre>
        </div>
        {/* Images */}
        {(n.images||[]).length > 0 && (
          <div>
            <div style={s.sectionTitle}>Rasmlar ({n.images.length})</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"12px" }}>
              {n.images.map(img => (
                <div key={img.id} style={{ borderRadius:"10px", overflow:"hidden", border:"1px solid #1e2d42" }}>
                  <img src={img.url} alt={img.name} style={{ width:"100%", height:"140px", objectFit:"cover", display:"block" }} />
                  <div style={{ padding:"6px 10px", fontSize:"11px", color:"#475569", background:"#0d1321" }}>{img.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============ HOME VIEW ============
  function HomeView() {
    return (
      <div>
        {/* Filters */}
        <div style={{ display:"flex", gap:"10px", marginBottom:"20px", flexWrap:"wrap", alignItems:"center" }}>
          <div style={s.searchWrap}>
            <span style={s.searchIcon}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Qidirish — mavzu, teg, matn..." style={s.searchInput} />
          </div>
          <select value={filterSubject} onChange={e=>setFilterSubject(e.target.value)} style={{ ...s.input, width:"auto", minWidth:"140px" }}>
            <option value="all">Barcha fanlar</option>
            {allSubjects.map(s2 => <option key={s2} value={s2}>{s2}</option>)}
          </select>
          <div style={{ display:"flex", gap:"6px" }}>
            {["all",...COLORS].map(c => (
              <div key={c} onClick={() => setFilterColor(c)} style={{
                width:"22px", height:"22px", borderRadius:"50%",
                background: c==="all" ? "#334155" : c,
                cursor:"pointer",
                border: filterColor===c ? "3px solid #fff" : "2px solid transparent",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"10px", color:"#fff"
              }}>{c==="all"?"✕":""}</div>
            ))}
          </div>
          <button style={s.btn()} onClick={createNote}>+ Yangi konspekt</button>
        </div>

        {/* Empty */}
        {notes.length === 0 && (
          <div style={{ textAlign:"center", padding:"80px 20px" }}>
            <div style={{ fontSize:"56px", marginBottom:"16px" }}>📓</div>
            <div style={{ fontFamily:"'Syne',system-ui,sans-serif", fontSize:"20px", fontWeight:700, color:"#475569", marginBottom:"8px" }}>Hech qanday konspekt yo'q</div>
            <div style={{ fontSize:"14px", color:"#334155", marginBottom:"20px" }}>Birinchi konspektingizni yarating</div>
            <button style={s.btn()} onClick={createNote}>📝 Konspekt yaratish</button>
          </div>
        )}

        {/* Pinned */}
        {pinned.length > 0 && (
          <div style={{ marginBottom:"24px" }}>
            <div style={s.sectionTitle}>📌 Pinlangan</div>
            <div style={s.grid}>
              {pinned.map(n => <NoteCard key={n.id} note={n} />)}
            </div>
          </div>
        )}

        {/* Starred quick row */}
        {starred.length > 0 && filterSubject==="all" && !search && (
          <div style={{ marginBottom:"24px" }}>
            <div style={s.sectionTitle}>⭐ Sevimlilar</div>
            <div style={s.grid}>
              {starred.slice(0,3).map(n => <NoteCard key={n.id} note={n} />)}
            </div>
          </div>
        )}

        {/* All */}
        {rest.length > 0 && (
          <div>
            <div style={s.sectionTitle}>📚 Barcha konspektlar ({rest.length})</div>
            <div style={s.grid}>
              {rest.map(n => <NoteCard key={n.id} note={n} />)}
            </div>
          </div>
        )}

        {notes.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px", color:"#475569" }}>"{search}" bo'yicha natija topilmadi</div>
        )}
      </div>
    );
  }

  function NoteCard({ note: n }) {
    return (
      <div style={s.noteCard(n.color)} onClick={() => { setActiveNote(n); setView("detail"); }}>
        {n.pinned && <span style={{ position:"absolute", top:"10px", right:"10px", fontSize:"12px" }}>📌</span>}
        {n.starred && <span style={{ position:"absolute", top:"10px", right: n.pinned ? "28px" : "10px", fontSize:"12px" }}>⭐</span>}
        <div style={s.noteTitle}>{n.title || "Nomsiz"}</div>
        <div style={s.notePreview}>{n.content || "Kontent yo'q..."}</div>
        <div style={s.noteMeta}>
          <span style={s.tag(n.color)}>{n.subject}</span>
          {(n.images||[]).length > 0 && <span style={s.tag("#64748b")}>📸 {n.images.length}</span>}
          {(n.tags||[]).slice(0,2).map(t => <span key={t} style={s.tag("#334155")}>{t}</span>)}
        </div>
        <div style={{ fontSize:"11px", color:"#334155", marginTop:"8px" }}>{fmt(n.updatedAt)}</div>
      </div>
    );
  }

  // ============ STATS VIEW ============
  function StatsView() {
    return (
      <div>
        <h2 style={{ fontFamily:"'Syne',system-ui,sans-serif", fontSize:"22px", fontWeight:800, marginBottom:"20px" }}>📊 Statistika</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:"14px", marginBottom:"28px" }}>
          {[
            { val: notes.length, label: "Jami konspekt", icon:"📓" },
            { val: totalImages, label: "Jami rasm", icon:"📸" },
            { val: totalWords, label: "Jami so'z", icon:"📝" },
            { val: starred.length, label: "Sevimlilar", icon:"⭐" },
            { val: allSubjects.length, label: "Fanlar", icon:"📚" },
            { val: notes.filter(n=>n.pinned).length, label: "Pinlangan", icon:"📌" },
          ].map((item, i) => (
            <div key={i} style={s.statCard}>
              <div style={{ fontSize:"24px", marginBottom:"8px" }}>{item.icon}</div>
              <div style={s.statVal}>{item.val}</div>
              <div style={s.statLabel}>{item.label}</div>
            </div>
          ))}
        </div>
        <div style={s.sectionTitle}>Fanlarga ko'ra</div>
        <div style={{ background:"#0d1321", border:"1px solid #1e2d42", borderRadius:"14px", padding:"20px" }}>
          {subjectCounts.length === 0
            ? <div style={{ color:"#475569", textAlign:"center" }}>Hali konspekt yo'q</div>
            : subjectCounts.map(({ s: subj, c }, i) => {
                const color = COLORS[i % COLORS.length];
                const pct = Math.round((c / notes.length) * 100);
                return (
                  <div key={subj} style={{ marginBottom:"14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:"13px", marginBottom:"5px" }}>
                      <span style={{ color:"#cbd5e1" }}>{subj}</span>
                      <span style={{ color }}>{c} ta ({pct}%)</span>
                    </div>
                    <div style={{ height:"6px", background:"#1e2d42", borderRadius:"6px", overflow:"hidden" }}>
                      <div style={{ height:"100%", background:color, width:`${pct}%`, borderRadius:"6px", transition:"width .4s" }} />
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>
    );
  }

  // ============ FLASHCARDS VIEW ============
  function FlashcardsView() {
    if (flashNotes.length === 0) return (
      <div style={{ textAlign:"center", padding:"80px" }}>
        <div style={{ fontSize:"48px", marginBottom:"16px" }}>🃏</div>
        <div style={{ color:"#475569", fontSize:"16px" }}>Flashcard uchun kamida 1 ta konspekt kerak</div>
      </div>
    );
    const n = flashNotes[flashIdx % flashNotes.length];
    return (
      <div style={{ maxWidth:"600px", margin:"0 auto" }}>
        <h2 style={{ fontFamily:"'Syne',system-ui,sans-serif", fontSize:"20px", fontWeight:800, marginBottom:"20px", textAlign:"center" }}>🃏 Flashcards</h2>
        <div style={{ fontSize:"13px", color:"#64748b", textAlign:"center", marginBottom:"16px" }}>
          {flashIdx % flashNotes.length + 1} / {flashNotes.length}
        </div>
        <div style={{ ...s.flash, borderLeft:`4px solid ${n.color}`, cursor:"pointer" }} onClick={() => setFlashFlipped(p=>!p)}>
          {!flashFlipped
            ? <>
                <div style={{ fontSize:"13px", color:"#64748b", marginBottom:"12px" }}>{n.subject}</div>
                <div style={{ fontFamily:"'Syne',system-ui,sans-serif", fontSize:"20px", fontWeight:700, color:"#f1f5f9" }}>{n.title}</div>
                <div style={{ fontSize:"12px", color:"#334155", marginTop:"16px" }}>👆 Bosish orqali javobni ko'ring</div>
              </>
            : <>
                <div style={{ fontSize:"11px", color:n.color, marginBottom:"12px", fontWeight:600, letterSpacing:"1px" }}>JAVOB</div>
                <div style={{ fontSize:"13px", color:"#94a3b8", lineHeight:"1.8", textAlign:"left" }}>{n.content?.slice(0,300)}{n.content?.length>300?"...":""}</div>
              </>
          }
        </div>
        <div style={{ display:"flex", gap:"12px", justifyContent:"center", marginTop:"20px" }}>
          <button style={s.ghostBtn} onClick={() => { setFlashFlipped(false); setFlashIdx(p => (p - 1 + flashNotes.length) % flashNotes.length); }}>← Oldingi</button>
          <button style={s.btn(n.color)} onClick={() => { setFlashFlipped(false); setFlashIdx(p => (p + 1) % flashNotes.length); }}>Keyingi →</button>
        </div>
        <div style={{ marginTop:"16px", display:"flex", justifyContent:"center", gap:"8px", flexWrap:"wrap" }}>
          {flashNotes.map((_, i) => (
            <div key={i} onClick={() => { setFlashIdx(i); setFlashFlipped(false); }} style={{ width:"8px", height:"8px", borderRadius:"50%", background: i === flashIdx % flashNotes.length ? "#6366f1" : "#1e2d42", cursor:"pointer" }} />
          ))}
        </div>
      </div>
    );
  }

  // ============ EXPORT ============
  const exportNotes = () => {
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="neuronotepad_backup.json"; a.click();
    showToast("Eksport qilindi ✓");
  };

  const importNotes = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (Array.isArray(imported)) { setNotes(p => [...imported, ...p]); showToast(`${imported.length} ta konspekt yuklandi`); }
      } catch { showToast("Fayl noto'g'ri format", "error"); }
    };
    reader.readAsText(file);
  };

  const importRef = useRef();

  // ============ RENDER ============
  return (
    <div style={s.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0d1321; } ::-webkit-scrollbar-thumb { background: #1e2d42; border-radius: 3px; }
        input::placeholder, textarea::placeholder { color: #334155; }
        select option { background: #0d1321; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        button:hover { opacity: 0.85; }
      `}</style>

      {/* TOPBAR */}
      <div style={s.topbar}>
        <div style={s.logo} onClick={() => setView("home")}>
          <span style={s.logoDot}></span>NeurоNotepad
        </div>
        <div style={{ display:"flex", gap:"6px", marginLeft:"8px" }}>
          {[["home","🏠 Bosh sahifa"],["flashcards","🃏 Flashcards"],["stats","📊 Statistika"]].map(([v,l]) => (
            <button key={v} style={s.navBtn(view===v)} onClick={() => setView(v)}>{l}</button>
          ))}
        </div>
        <div style={{ flex:1 }}></div>
        <button style={s.ghostBtn} onClick={exportNotes} title="Eksport">⬇ Eksport</button>
        <input ref={importRef} type="file" accept=".json" style={{ display:"none" }} onChange={importNotes} />
        <button style={s.ghostBtn} onClick={() => importRef.current.click()} title="Import">⬆ Import</button>
        <button style={s.btn()} onClick={createNote}>+ Yangi</button>
      </div>

      {/* MAIN */}
      <div style={s.main}>
        {view === "home" && <HomeView />}
        {view === "editor" && activeNote && <Editor initial={activeNote} />}
        {view === "detail" && activeNote && <NoteDetail note={activeNote} />}
        {view === "stats" && <StatsView />}
        {view === "flashcards" && <FlashcardsView />}
      </div>

      {/* TOAST */}
      {toast && <div style={s.toast(toast.type)}>{toast.msg}</div>}
    </div>
  );
}
