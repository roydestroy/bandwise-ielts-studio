"use client";
import {useState} from 'react';
import {Upload} from 'lucide-react';

export default function UploadField({label,accept,limit,files,onChange,disabled=false}:{label:string;accept:string;limit:number;files:File[];onChange:(files:File[])=>void;disabled?:boolean}){
  const [dragging,setDragging]=useState(false);
  const [error,setError]=useState('');
  function add(incoming:File[]){
    if(disabled)return;
    const next=[...files,...incoming];
    if(next.length>limit){setError(`Choose up to ${limit} ${limit===1?'file':'files'}. Remove a file before adding another.`);return;}
    if(incoming.some(file=>!accept.split(',').includes(file.type))){setError('Unsupported file format. Use one of the formats listed above.');return;}
    if(next.reduce((total,file)=>total+file.size,0)>20*1024*1024){setError('Keep total uploads under 20 MB.');return;}
    setError('');onChange(next);
  }
  return <div className="upload-field"><label className={`dropzone${dragging?' dragging':''}`} onDragOver={e=>{e.preventDefault();if(!disabled)setDragging(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDragging(false)}} onDrop={e=>{e.preventDefault();setDragging(false);add(Array.from(e.dataTransfer.files))}}>
    <Upload size={27}/><strong>{dragging?'Drop files here':label}</strong><span>Drag and drop, or click to choose</span><span>{accept.startsWith('audio')?'MP3 or WAV · One recording':`JPG, PNG, WEBP or PDF · Up to ${limit} files in page order`}</span>
    <input aria-label={label} type="file" accept={accept} multiple={limit>1} disabled={disabled} onChange={e=>{add(Array.from(e.target.files||[]));e.target.value=''}}/>
  </label>{files.length>0&&<ol className="upload-files" aria-label={`${label} selected files`}>{files.map((file,index)=><li key={index}><span>{index+1}. {file.name}</span><button type="button" disabled={disabled} aria-label={`Remove ${file.name}`} onClick={()=>{onChange(files.filter((_,i)=>i!==index));setError('')}}>Remove</button></li>)}</ol>}{error&&<p className="notice error" role="alert">{error}</p>}</div>;
}
