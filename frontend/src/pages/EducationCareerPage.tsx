import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { allPaths, type CareerPath } from '@/data/education/careerPaths'
import { loadPublishedCareers } from '@/lib/educationApi'

export default function EducationCareerPage(){
 const {slug}=useParams(); const [path,setPath]=useState<CareerPath|null>(allPaths.find(x=>x.id===slug)||null)
 useEffect(()=>{void loadPublishedCareers().then(rows=>{const db=rows?.find(x=>x.id===slug);if(db)setPath({...allPaths.find(x=>x.id===slug),...db,steps:allPaths.find(x=>x.id===slug)?.steps??[]} as CareerPath)})},[slug])
 if(!path)return <main style={{padding:40}}><h1>Career not found</h1><Link to="/education">← Education</Link></main>
 return <main className="education-page"><section className="edu-hero"><span className="edu-eyebrow">CAREER PATH</span><h1>{path.icon} {path.name}</h1><p>{path.description}</p><div className="edu-hero-stats"><span>{path.duration}</span><span>{path.eligibility}</span><span>{path.difficulty}</span><span>{path.scope} scope</span></div></section><section className="edu-content-grid"><article className="edu-panel"><h2>Roadmap</h2>{path.steps.length?<div className="edu-roadmap">{path.steps.map((s,i)=><div key={s.id}><b>{i+1}</b><h3>{s.title}</h3><p>{s.description}</p><small>{s.duration} · {s.eligibility}</small></div>)}</div>:<p>Detailed roadmap is being maintained by the Education CMS.</p>}</article><aside className="edu-panel"><h2>What to explore</h2><h3>Exams</h3><p>{path.exams.join(' · ')}</p><h3>Skills</h3><p>{path.keySkills.join(' · ')}</p><h3>Roles</h3><p>{path.jobRoles.join(' · ')}</p><h3>Next steps</h3><p>{path.nextSteps.join(' · ')}</p><Link className="edu-primary-btn" to="/jobs">Find matching government jobs →</Link></aside></section></main>
}
