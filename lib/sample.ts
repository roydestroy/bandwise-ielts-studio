import type {Assessment,AssessmentResult} from './ielts';

// A ready-made student with one AI-marked essay, so a new teacher can see the review and report flow in a
// minute without uploading anything or spending AI credits. `sample` keeps it out of the accuracy report.
export const SAMPLE_STUDENT={name:'Sample student (Eleni)',target:7,minBand:6,track:'Academic'} as const;

const prompt='Some people believe that university students should pay the full cost of their studies. Others think that university education should be free for everyone. Discuss both views and give your own opinion.';

const essay=`In many countries, the question of who should pay for university education is widely debated. Some people argue that students should cover the full cost themselves, while others believe that higher education should be free. In my opinion, university should be mostly funded by the government, although students can contribute a small part.

On the one hand, there are reasons why students should pay for their studies. Firstly, a university degree brings personal benefits, such as a higher salary and better job opportunities. Therefore, it seems fair that the person who gets these advantages also pays for them. Secondly, when students pay fees, they may take their studies more seriously and not waste time. For example, in the UK many students work part-time to pay their fees, and they often become more responsible.

On the other hand, free university education has many advantages for the society. If education is free, students from poor families can also study, and this makes the society more equal. Moreover, the country needs doctors, engineers and teachers, and all people benefit from their work, not only the graduates. For this reason, the government should invest in education like it invests in roads and hospitals.

In conclusion, although students get personal benefits from a degree, I believe that the society gains more when education is available for everyone. The best solution is that the government pays most of the cost and students pay a small fee which depends on their family income.`;

const result:AssessmentResult={
  criteria:[
    {name:'Task response',band:6.5,evidence:'Both views are discussed and a clear opinion is given in the introduction and conclusion. Ideas are relevant and supported (higher salaries, taking studies seriously, equal access, public benefit), though the UK example is general and some points could be developed further.',advice:'Extend each main idea with one more step of explanation or a more specific example, e.g. what happens to access when fees rise.'},
    {name:'Coherence and cohesion',band:6.5,evidence:'Clear four-paragraph structure with a logical progression. Linking is accurate but mechanical in places (“Firstly”, “Secondly”, “On the one hand”, “Moreover”, “For this reason”).',advice:'Vary cohesion beyond sentence-initial linkers: use referencing (“this approach”, “such fees”) and link ideas within sentences.'},
    {name:'Lexical resource',band:6,evidence:'Adequate range for the topic (“personal benefits”, “job opportunities”, “invest in education”) with generally accurate collocation. Some repetition (“society”, “pay”) and a few less natural phrases (“the society”, “not waste time”).',advice:'Build a topic set of alternatives, e.g. tuition fees / fund / subsidise / graduates / access to higher education, and avoid “the” before general “society”.'},
    {name:'Grammatical range and accuracy',band:6.5,evidence:'A mix of simple and complex sentences, including conditionals and relative clauses, mostly error-free. Errors are minor (article use with “the society”) and do not reduce clarity.',advice:'Add a few more complex structures (concessive clauses, passive forms) while keeping accuracy.'},
  ],
  summary:'A clear, well-organised response that answers every part of the question. To move from 6.5 to 7, develop ideas with more specific support and use a wider, more precise range of vocabulary and cohesive devices.',
  strengths:['Every part of the question is answered, with a clear position throughout.','Logical paragraphing with one central idea per body paragraph.','Mostly accurate grammar with some complex sentences.'],
  priorities:['Develop each supporting point with a specific example or consequence.','Replace repeated words with precise topic vocabulary.','Use less mechanical linking between ideas.'],
  limitations:['This is a sample assessment created by Bandwise, not a real student’s work.'],
};

export function sampleAssessment(id:string,studentId:string,at:string):Assessment&{sample:true}{
  return {id,student_id:studentId,task:'Writing Task 2',track:SAMPLE_STUDENT.track,title:'Sample: university fees essay',book:null,test:null,prompt,transcript:essay,assets:[],
    result,teacher_result:null,notes:'This is a sample. Check the AI’s bands, change any you disagree with, then tick “I reviewed…” and choose “Save reviewed assessment” to see the student report.',
    status:'Needs review',confirmed:true,created_at:at,version:1,model:'Sample (no AI used)',sample:true};
}
