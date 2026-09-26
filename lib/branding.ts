import {z} from 'zod';

// A teacher's own branding for the reports students receive: the printable practice report and the
// emailed progress report. Bandwise stays as a small "Made with Bandwise" line.
export type Branding={name:string;color:string;contact:string;logoId:string|null};
// What reports need: the logo as a URL. Email needs an absolute one, print a same-site path.
export type ReportBrand={name:string;color:string;contact:string;logoUrl:string|null};

export const DEFAULT_BRAND_COLOR='#145e50';
export const LOGO_MAX_BYTES=500*1024;
export const LOGO_TYPES=['image/png','image/jpeg'] as const;

// WCAG relative luminance of a #rrggbb colour.
function luminance(hex:string){
  const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);
  return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];
}
// The colour is used for headings on white and behind white text, so it must be readable on white.
export const contrastWithWhite=(hex:string)=>1.05/(luminance(hex)+0.05);

export const brandingSchema=z.object({
  name:z.string().trim().min(1,'Enter the name to show on reports.').max(80,'Keep the name under 80 characters.'),
  color:z.string().trim().toLowerCase().regex(/^#[0-9a-f]{6}$/,'Choose a colour.').refine(c=>contrastWithWhite(c)>=4.5,'That colour is too light to read on white. Choose a darker shade.'),
  contact:z.string().trim().max(120,'Keep the contact line under 120 characters.').default(''),
});

// Identify an uploaded logo by its bytes, not the name or type the browser claims. Only PNG and JPEG:
// every email client shows them, and unlike SVG they cannot carry scripts.
export function logoType(bytes:Uint8Array):typeof LOGO_TYPES[number]|null{
  if(bytes.length>=8&&[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((b,i)=>bytes[i]===b))return 'image/png';
  if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg';
  return null;
}
export const logoPath=(id:string)=>'/brand/'+id;
export function reportBrand(b:Branding|null,origin=''):ReportBrand|null{
  return b?{name:b.name,color:b.color,contact:b.contact,logoUrl:b.logoId?origin+logoPath(b.logoId):null}:null;
}
