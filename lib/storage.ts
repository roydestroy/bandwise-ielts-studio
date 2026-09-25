import {env} from 'cloudflare:workers';
import {linkConfig} from './r2-links';
export function database(){if(!env.DB)throw new Error('Student storage is temporarily unavailable. Please try again.');return env.DB;}
export function bucket(){if(!env.BUCKET)throw new Error('File storage is temporarily unavailable. Please try again.');return env.BUCKET;}
// Signed R2 download links for AI providers, or null when the R2 API credentials are not set (see README).
export function links(){return linkConfig(env);}
// Remove uploaded files together with anything stored under them, such as a PDF's rendered pages.
export async function deleteFiles(keys:string[]){const store=bucket();const nested=await Promise.all(keys.map(async key=>(await store.list({prefix:key+'/'})).objects.map(o=>o.key)));const all=[...keys,...nested.flat()];for(let i=0;i<all.length;i+=1000)await store.delete(all.slice(i,i+1000));}
