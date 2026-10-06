import { afterDegreePaths, afterPGPaths, afterTenthPaths, afterTwelfthPaths, mockTests } from '../frontend/src/data/education/careerPaths'
import { extraMockTests } from '../frontend/src/data/education/originalMocks'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) throw new Error('Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before running this seed.')

async function upsert(table: string, rows: unknown[], conflict = 'id') {
  if (!rows.length) return
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?on_conflict=${conflict}`, {
    method: 'POST',
    headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  })
  if (!response.ok) throw new Error(`${table}: ${response.status} ${await response.text()}`)
}

const careers = [...afterTenthPaths, ...afterTwelfthPaths, ...afterDegreePaths, ...afterPGPaths].map((p) => ({id:p.id,name:p.name,stage:p.stage,description:p.description,duration:p.duration,eligibility:p.eligibility,difficulty:p.difficulty,avg_starting_salary:p.avgStartingSalary,scope:p.scope,icon:p.icon,exams:p.exams,top_colleges:p.topColleges,key_skills:p.keySkills,job_roles:p.jobRoles,next_steps:p.nextSteps,source_url:p.salarySourceUrl??null,verified:Boolean(p.salarySourceUrl),is_published:true}))
const allTests = [...mockTests, ...extraMockTests]
const tests = allTests.map((t) => ({id:t.id,title:t.title,exam:t.exam,subject:t.subject,duration_minutes:t.duration,total_questions:t.questions.length,total_marks:t.totalMarks,stages:t.stages,is_published:true}))
const questions = allTests.flatMap((t) => t.questions.map((q,i) => ({external_id:`${t.id}:${i+1}`,test_id:t.id,question_text:q.question,options:q.options,correct_index:q.correctAnswer,explanation:q.explanation,subject:q.subject,difficulty:q.difficulty,marks:4,negative_marks:0,sort_order:i,is_published:true})))
const resources = [
 {title:'NCERT Textbooks',kind:'official',provider:'NCERT',description:'Official school textbooks and learning resources.',source_url:'https://ncert.nic.in/textbook.php',stage:'school',verified:false,is_published:true},
 {title:'National Testing Agency',kind:'official',provider:'NTA',description:'Official examination notices and candidate resources.',source_url:'https://exams.nta.ac.in/',exam:'Entrance Exams',verified:false,is_published:true},
 {title:'UPSC Examinations',kind:'official',provider:'UPSC',description:'Official examination notifications and candidate information.',source_url:'https://upsc.gov.in/',exam:'UPSC',verified:false,is_published:true},
 {title:'DGT / ITI',kind:'official',provider:'Directorate General of Training',description:'Official vocational training and trade information.',source_url:'https://www.dgt.gov.in/',stage:'after10th',verified:false,is_published:true},
 {title:'National Scholarship Portal',kind:'official',provider:'Government of India',description:'Government scholarship application and information portal.',source_url:'https://scholarships.gov.in/',verified:false,is_published:true},
]
await upsert('education_careers', careers)
await upsert('education_mock_tests', tests)
await upsert('education_questions', questions, 'external_id')
await upsert('education_resources', resources)
console.log(`Seeded ${careers.length} careers, ${tests.length} mock tests, ${questions.length} questions and ${resources.length} resource links.`)
