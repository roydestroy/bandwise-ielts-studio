import type {ProviderId} from './providers';

// Token counts for one provider call, as reported by the provider. Audio input is counted apart from other
// input because several providers price it differently. Output includes any reasoning ("thinking") tokens,
// which are billed as output.
// `platform` marks a call made on Bandwise's own key, which a plan will have to pay for.
export type Usage={provider:ProviderId;model:string;kind:'text'|'audio';inputTokens:number;audioTokens:number;outputTokens:number;platform?:true};

// The parts of each provider's usage block that are read here. Every field is optional: providers omit them.
type OpenAIStyleUsage={input_tokens?:number;output_tokens?:number;prompt_tokens?:number;completion_tokens?:number;prompt_tokens_details?:{audio_tokens?:number}};
type GeminiUsage={promptTokenCount?:number;candidatesTokenCount?:number;thoughtsTokenCount?:number;promptTokensDetails?:{modality?:string;tokenCount?:number}[]};
type ClaudeUsage={input_tokens?:number;output_tokens?:number;cache_creation_input_tokens?:number;cache_read_input_tokens?:number};

const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>0?Math.round(v):0;
const usage=(provider:ProviderId,model:string,audio:boolean,input:number,audioIn:number,output:number):Usage=>({provider,model,kind:audio?'audio':'text',inputTokens:Math.max(0,input-audioIn),audioTokens:audioIn,outputTokens:output});

// Each reader takes the provider's own usage block and returns null when the response carried none.
// OpenAI Responses API (writing), and Chat Completions with audio input (speaking).
export function openaiUsage(d:{usage?:OpenAIStyleUsage}|null|undefined,model:string,audio:boolean):Usage|null{
  const u=d?.usage;if(!u)return null;
  if(u.input_tokens!==undefined)return usage('openai',model,audio,n(u.input_tokens),0,n(u.output_tokens));
  return usage('openai',model,audio,n(u.prompt_tokens),n(u.prompt_tokens_details?.audio_tokens),n(u.completion_tokens));
}
// Gemini counts thinking tokens separately from the answer; both are billed as output.
export function geminiUsage(d:{usageMetadata?:GeminiUsage}|null|undefined,model:string,audio:boolean):Usage|null{
  const u=d?.usageMetadata;if(!u)return null;
  const audioIn=(Array.isArray(u.promptTokensDetails)?u.promptTokensDetails:[]).filter(x=>x?.modality==='AUDIO').reduce((s,x)=>s+n(x.tokenCount),0);
  return usage('gemini',model,audio,n(u.promptTokenCount),audioIn,n(u.candidatesTokenCount)+n(u.thoughtsTokenCount));
}
export function claudeUsage(d:{usage?:ClaudeUsage}|null|undefined,model:string):Usage|null{
  const u=d?.usage;if(!u)return null;
  return usage('claude',model,false,n(u.input_tokens)+n(u.cache_creation_input_tokens)+n(u.cache_read_input_tokens),0,n(u.output_tokens));
}
// Qwen streams its answer and sends usage in the last chunk when asked to (stream_options.include_usage).
export function qwenUsage(u:OpenAIStyleUsage|null|undefined,model:string,audio:boolean):Usage|null{
  if(!u)return null;
  return usage('qwen',model,audio,n(u.prompt_tokens),n(u.prompt_tokens_details?.audio_tokens),n(u.completion_tokens));
}

// Published list prices in US dollars per million tokens, checked 2026-09-26 (see docs/SUBSCRIPTION_PLAN.md).
// A model is matched by exact ID or ID prefix followed by "-", longest key first. `null` marks a model whose
// price hasn't been checked, so it isn't priced as its shorter namesake (gemini-2.5-flash-lite is not
// gemini-2.5-flash). `audio` omitted means audio input costs the same as other input; `audio:null` means
// the audio price is unknown. Unpriced calls still record their tokens.
type Price={input:number;output:number;audio?:number|null};
const geminiFlash37=(at:Date):Price=>at<new Date('2027-01-01T00:00:00Z')?{input:.75,output:3.75}:{input:1.5,output:7.5};
const prices:Record<string,Price|((at:Date)=>Price)|null>={
  'gemini-3.8-flash':geminiFlash37,'gemini-3.7-flash':geminiFlash37,
  'gemini-3.5-flash-lite':{input:.3,output:2.5},'gemini-3.5-flash':{input:1.5,output:9},
  'gemini-3.1-pro':{input:2,output:12},
  'gemini-2.5-flash-lite':null,'gemini-2.5-flash-image':null,'gemini-2.5-flash':{input:.3,output:2.5,audio:1},
  'gemini-2.5-pro':{input:1.25,output:10},
  'claude-fable-5-1':{input:10,output:50},'claude-opus-5-5':{input:4,output:20},'claude-sonnet-5':{input:2,output:10},'claude-haiku-4-5':{input:1,output:5},
  'gpt-4.1-mini':null,'gpt-4.1-nano':null,'gpt-4.1':{input:2,output:8},
  'gpt-audio-mini':null,'gpt-audio':{input:2.5,output:10,audio:null},
};
const keys=Object.keys(prices).sort((a,b)=>b.length-a.length);
export function priceFor(model:string,at=new Date()):Price|null{
  const key=keys.find(k=>model===k||model.startsWith(k+'-'));
  const p=key?prices[key]:null;
  return typeof p==='function'?p(at):p??null;
}
// Estimated cost in US dollars, or null when the model's price (or its audio price) is unknown.
export function estimateCost(u:Usage,at=new Date()):number|null{
  const p=priceFor(u.model,at);if(!p)return null;
  const audioPrice=p.audio===undefined?p.input:p.audio;
  if(u.audioTokens&&audioPrice===null)return null;
  return (u.inputTokens*p.input+u.audioTokens*(audioPrice??0)+u.outputTokens*p.output)/1e6;
}
