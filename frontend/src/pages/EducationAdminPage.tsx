import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStoredAdminKey, setStoredAdminKey, type EducationCollection, fetchEducationCollection, fetchEducationOverview, createEducationRecord, updateEducationRecord, deleteEducationRecord, fetchEducationQuestions, createEducationQuestion, updateEducationQuestion, deleteEducationQuestion, recountEducationTest } from '@/lib/adminApi'
import '@/styles/education-admin.css'

const collections: {key: EducationCollection; label: string; starter: Record<string, unknown>}[] = [
 {key:'careers',label:'Careers',starter:{id:'new-career',name:'New Career',stage:'after12th',description:'',duration:'',eligibility:'',difficulty:'Moderate',avg_starting_salary:'',scope:'Medium',icon:'🎓',exams:[],top_colleges:[],key_skills:[],job_roles:[],next_steps:[],is_published:false,verified:false}},
 {key:'resources',label:'Resources',starter:{title:'New Resource',kind:'official',provider:'',description:'',source_url:'',file_url:'',exam:'',subject:'',stage:'',is_published:false,verified:false}},
 {key:'tests',label:'Mock Tests',starter:{id:'new-test',title:'New Mock Test',exam:'',subject:'',duration_minutes:30,total_questions:0,total_marks:0,stages:[],is_published:false}},
 {key:'colleges',label:'Colleges',starter:{name:'New College',city:'',state:'',type:'',website:'',official_website:'',courses:[],entrance_exams:[],is_published:false,verified:false}},
 {key:'scholarships',label:'Scholarships',starter:{name:'New Scholarship',provider:'',eligibility:'',qualification:'',state:'',amount:'',deadline:null,official_url:'',is_published:false,verified:false}},
]

function pretty(value: unknown) { return JSON.stringify(value, null, 2) }

export default function EducationAdminPage() {
 const [key,setKey] = useState(getStoredAdminKey())
 const [active,setActive] = useState<EducationCollection>('careers')
 const [overview,setOverview] = useState<Record<string,{total:number;published:number}>>({})
 const [rows,setRows] = useState<Record<string,unknown>[]>([])
 const [selected,setSelected] = useState<Record<string,unknown>|null>(null)
 const [editor,setEditor] = useState('')
 const [search,setSearch] = useState('')
 const [message,setMessage] = useState('')
 const [questions,setQuestions] = useState<Record<string,unknown>[]>([])
 const [questionEditor,setQuestionEditor] = useState('')
 const current = collections.find(x=>x.key===active)!
 const selectedId = selected?.id == null ? '' : String(selected.id)

 const load = useCallback(async () => {
  if(!key) return
  try { setOverview(await fetchEducationOverview(key)); const r=await fetchEducationCollection(active,key,search); setRows(r.items); setMessage('Loaded') } catch(e) { setMessage(e instanceof Error?e.message:'Failed') }
 }, [active, key, search])
 useEffect(()=>{ if(key) void load() },[key, load])
 const editRow=(row:Record<string,unknown>)=>{setSelected(row);setEditor(pretty(row));setMessage('Editing record')}
 const save = async () => {
  try { const data=JSON.parse(editor); const result=selected?.id ? await updateEducationRecord(active,String(selected.id),data,key) : await createEducationRecord(active,data,key); setSelected(result); setEditor(pretty(result)); setMessage('Saved successfully'); await load() } catch(e){setMessage(e instanceof Error?e.message:'Invalid JSON or save failed')}
 }
 const remove = async()=>{if(!selected?.id || !window.confirm('Delete this record?')) return; try {await deleteEducationRecord(active,String(selected.id),key);setSelected(null);setEditor('');setMessage('Deleted');await load()}catch(e){setMessage(e instanceof Error?e.message:'Delete failed')}}
 const loadQuestions = useCallback(async(testId=selectedId)=>{if(active!=='tests'||!testId)return; const r=await fetchEducationQuestions(testId,key);setQuestions(r.items)}, [active, key, selectedId])
 const addQuestion = async()=>{if(!selectedId)return;try{const data=JSON.parse(questionEditor);if (data.id) await updateEducationQuestion(String(data.id), data, key); else await createEducationQuestion(selectedId,data,key);setQuestionEditor('');await loadQuestions(selectedId);await recountEducationTest(selectedId,key);setMessage(data.id ? 'Question updated' : 'Question added')}catch(e){setMessage(e instanceof Error?e.message:'Question save failed')}}
 useEffect(()=>{if(active==='tests'&&selectedId)void loadQuestions(selectedId);else setQuestions([])},[selectedId,active,loadQuestions])
 if(!key) return <main className="edu-admin-shell"><section className="edu-admin-login"><span>LIVEGOVTJOBS ADMIN</span><h1>Education CMS</h1><p>Enter the server-side admin API key. It is kept in memory only and is never saved to the database.</p><input type="password" placeholder="Admin API key" onChange={e=>setKey(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){setStoredAdminKey((e.target as HTMLInputElement).value);setKey((e.target as HTMLInputElement).value)}}}/><button onClick={()=>{setStoredAdminKey(key);void load()}}>Open CMS</button><Link to="/admin">← Back to admin</Link></section></main>
 return <main className="edu-admin-shell">
  <header className="edu-admin-header"><div><span>EDUCATION CMS</span><h1>Education database management</h1><p>Manage published content, draft content and mock-test questions from one protected console.</p></div><div className="edu-admin-actions"><button onClick={()=>void load()}>Refresh</button><button onClick={()=>{setStoredAdminKey('');setKey('')}}>Lock</button></div></header>
  <section className="edu-admin-stats">{collections.map(c=><button key={c.key} onClick={()=>{setActive(c.key);setSelected(null);setEditor('')}} className={active===c.key?'active':''}><strong>{overview[c.key]?.total??0}</strong><span>{c.label}</span><small>{overview[c.key]?.published??0} published</small></button>)}</section>
  <section className="edu-admin-workspace">
   <aside className="edu-admin-list"><div className="edu-admin-list-head"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${current.label.toLowerCase()}…`} /><button onClick={()=>{setSelected(null);setEditor(pretty(current.starter))}}>+ New</button></div>{rows.map((row,i)=><button className={selected?.id===row.id?'selected':''} key={String(row.id??i)} onClick={()=>editRow(row)}><strong>{String(row.name??row.title??row.id??'Untitled')}</strong><span>{row.is_published?'Published':'Draft'}{row.verified?' · Verified':''}</span></button>)}</aside>
   <section className="edu-admin-editor"><div className="edu-admin-editor-head"><div><span>{selected?.id?'EDIT':'CREATE'}</span><h2>{current.label}</h2></div><div>{selected?.id&&<button className="danger" onClick={()=>void remove()}>Delete</button>}<button onClick={()=>void save()}>Save</button></div></div><textarea value={editor} onChange={e=>setEditor(e.target.value)} spellCheck={false} placeholder="JSON record" />{message&&<p className="edu-admin-message">{message}</p>}
    {active==='tests'&&selected?.id&&<div className="edu-admin-questions"><div className="edu-admin-editor-head"><div><span>QUESTION BANK</span><h3>{questions.length} questions</h3></div><button onClick={()=>setQuestionEditor(pretty({question_text:'New question',options:['Option A','Option B','Option C','Option D'],correct_index:0,explanation:'',subject:selected.subject??'',difficulty:'Medium',marks:4,negative_marks:0,sort_order:questions.length,is_published:true}))}>+ New question</button></div>{questionEditor&&<><textarea value={questionEditor} onChange={e=>setQuestionEditor(e.target.value)} spellCheck={false}/><button onClick={()=>void addQuestion()}>Save question</button></>}{questions.map(q=><article key={String(q.id)}><strong>{String(q.question_text)}</strong><span>{String(q.difficulty??'Medium')} · {String(q.marks??4)} marks · {q.is_published?'Published':'Draft'}</span><div><button onClick={()=>setQuestionEditor(pretty(q))}>Edit</button><button className="danger" onClick={async()=>{if(window.confirm('Delete question?')){await deleteEducationQuestion(String(q.id),key);await loadQuestions()}}}>Delete</button></div></article>)}</div>}
   </section>
  </section>
 </main>
}
