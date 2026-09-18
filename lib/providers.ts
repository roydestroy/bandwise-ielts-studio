import {z} from 'zod';
export const providerIds=['openai','gemini','claude','qwen'] as const;
export type ProviderId=typeof providerIds[number];
export const providers={
 openai:{name:'OpenAI',textModel:'gpt-4.1',audioModel:'gpt-audio',audio:true,pdf:true,audioTokens:16000,help:'https://platform.openai.com/api-keys'},
 gemini:{name:'Gemini',textModel:'gemini-2.5-flash',audioModel:'gemini-2.5-flash',audio:true,pdf:true,audioTokens:65536,help:'https://aistudio.google.com/apikey'},
 claude:{name:'Claude',textModel:'claude-sonnet-5',audioModel:'',audio:false,pdf:true,audioTokens:6500,help:'https://platform.claude.com/settings/keys'},
 qwen:{name:'Qwen',textModel:'qwen3.5-omni-plus',audioModel:'qwen3.5-omni-plus',audio:true,pdf:true,audioTokens:6500,help:'https://www.alibabacloud.com/help/en/model-studio/get-api-key'}
} as const;
const model=z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9._:-]+$/,'Use a model ID, not a URL.');
export const providerConfigSchema=z.object({provider:z.enum(providerIds),textModel:model,audioModel:z.string().trim().max(120).regex(/^[a-zA-Z0-9._:-]*$/),region:z.enum(['ap-southeast-1','cn-beijing']).default('ap-southeast-1'),workspace:z.string().trim().max(80).regex(/^[a-zA-Z0-9-]*$/).default('')}).superRefine((v,ctx)=>{if(v.provider==='qwen'&&!v.workspace)ctx.addIssue({code:'custom',path:['workspace'],message:'Enter your Alibaba Cloud workspace ID.'});if(v.provider==='claude'&&v.audioModel)ctx.addIssue({code:'custom',path:['audioModel'],message:'Claude does not support direct audio in this integration.'});if(v.provider!=='claude'&&!v.audioModel)ctx.addIssue({code:'custom',path:['audioModel'],message:'Enter an audio-capable model ID.'});if(v.provider==='qwen'&&!v.audioModel.includes('omni'))ctx.addIssue({code:'custom',path:['audioModel'],message:'Choose a Qwen Omni model for speaking.'});});
export type ProviderConfig=z.infer<typeof providerConfigSchema>;
export type ProviderConnection=ProviderConfig&{key:string};
export type ConnectionSummary=ProviderConfig&{configured:boolean;testedAt:string|null;source:'saved'|'site'|'none'};
export type ProviderState={connections:ConnectionSummary[];writing:ProviderId|'none';speaking:ProviderId|'none';vaultReady:boolean};
export type AIAvailability={writing:boolean;speaking:boolean;writingName:string;speakingName:string;writingProvider:ProviderId|'none';speakingProvider:ProviderId|'none';writingPdf:boolean};
