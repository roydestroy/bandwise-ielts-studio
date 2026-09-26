import {z} from 'zod';
import {percentile} from './pilot-stats.ts';

// The pilot survey: the four Van Westendorp price questions (euros a month) and hours saved a week.
const price=z.number().min(0).max(1000).nullable();
export const feedbackSchema=z.object({tooCheap:price,bargain:price,expensive:price,tooExpensive:price,hoursSaved:z.number().min(0).max(80).nullable(),comments:z.string().trim().max(3000)})
  .refine(f=>{const p=[f.tooCheap,f.bargain,f.expensive,f.tooExpensive].filter((x):x is number=>x!==null);return p.every((x,i)=>i===0||x>=p[i-1])},{message:'Each price should be at least the one before it: too cheap, then a bargain, then expensive, then too expensive.'});
export type Feedback=z.infer<typeof feedbackSchema>;
export type FeedbackRow=Feedback&{owner:string;email:string;updatedAt:string};

export type FeedbackSummary={responses:number;tooCheap:number|null;bargain:number|null;expensive:number|null;tooExpensive:number|null;hoursSaved:number|null};
// Medians of each answer, ignoring questions a teacher skipped. "Bargain" to "expensive" is roughly the range
// teachers would accept.
export function summariseFeedback(rows:Feedback[]):FeedbackSummary{
  const median=(k:keyof Omit<Feedback,'comments'>)=>{const v=rows.map(r=>r[k]).filter((x):x is number=>x!==null);return v.length?percentile(v,.5):null;};
  return {responses:rows.length,tooCheap:median('tooCheap'),bargain:median('bargain'),expensive:median('expensive'),tooExpensive:median('tooExpensive'),hoursSaved:median('hoursSaved')};
}
