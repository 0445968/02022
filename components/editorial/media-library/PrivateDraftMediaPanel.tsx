'use client';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Eye, RefreshCw, UploadCloud, XCircle } from 'lucide-react';

type Review={reviewedBy:string|null;rightsNotes:string|null;licenseName:string|null;credit:string|null;licenseExpiresAt:string|null};
type Draft={
  id:string;fileName:string;mimeType:string;fileSizeBytes:number;
  state:'pending'|'publishing'|'published'|'rejected'|'failed';
  createdAt:string;reviewedAt:string|null;rightsStatus:string|null;
  reviewReason:string|null;publishedMediaId:string|null;review:Review|null;
};
const choices=[['owned','Owned'],['staff_created','Staff-created'],['licensed','Licensed'],['public_domain','Public domain'],['creative_commons','Creative Commons']];
const field='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground';
const button='inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50';

export function PrivateDraftMediaPanel({canReview}:{canReview:boolean}){
  const [drafts,setDrafts]=useState<Draft[]>([]);
  const [file,setFile]=useState<File|null>(null);
  const [selected,setSelected]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const [rightsStatus,setRightsStatus]=useState('owned');
  const [rightsNotes,setRightsNotes]=useState('');
  const [credit,setCredit]=useState('');
  const [licenseName,setLicenseName]=useState('');
  const [altText,setAltText]=useState('');
  const [title,setTitle]=useState('');
  const [confirmRights,setConfirmRights]=useState(false);
  const [reason,setReason]=useState('');

  const refresh=useCallback(async()=>{
    const response=await fetch('/api/media/drafts',{cache:'no-store'});
    const data=await response.json() as {drafts?:Draft[];error?:string};
    if(!response.ok)throw new Error(data.error??'Unable to list drafts');
    setDrafts(data.drafts??[]);
  },[]);
  useEffect(()=>{
    let active=true;
    void refresh().catch((e:unknown)=>{if(active)setError(e instanceof Error?e.message:'Draft list unavailable');});
    return ()=>{active=false;};
  },[refresh]);

  async function upload(){
    if(!file)return;
    setBusy(true);setError(null);setNotice(null);
    try{
      const form=new FormData();form.append('file',file);
      const response=await fetch('/api/media/drafts',{method:'POST',body:form});
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error??'Upload failed');
      await refresh();setFile(null);setNotice('Media uploaded privately for review.');
    }catch(e){setError(e instanceof Error?e.message:'Upload failed');}
    finally{setBusy(false);}
  }
  async function preview(id:string){
    setBusy(true);setError(null);
    try{
      const response=await fetch(`/api/media/drafts/${id}/preview`,{cache:'no-store'});
      const data=await response.json() as {error?:string;signedUrl?:string};
      if(!response.ok||!data.signedUrl)throw new Error(data.error??'Preview failed');
      window.open(data.signedUrl,'_blank','noopener,noreferrer');
    }catch(e){setError(e instanceof Error?e.message:'Preview failed');}
    finally{setBusy(false);}
  }
  function choose(d:Draft){
    setSelected(d.id);setRightsStatus(d.rightsStatus??'owned');
    setRightsNotes(d.review?.rightsNotes??'');setCredit(d.review?.credit??'');
    setLicenseName(d.review?.licenseName??'');setAltText('');setTitle('');
    setReason('');setConfirmRights(false);setError(null);
  }
  async function act(id:string,kind:'approve'|'reject'){
    setBusy(true);setError(null);setNotice(null);
    try{
      const payload=kind==='reject'?{reason}:{
        rightsStatus,rightsNotes,licenseName,credit,altText,title,
        licenseExpiresAt:null,confirmRights
      };
      const response=await fetch(`/api/media/drafts/${id}/${kind}`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
      });
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error??'Review failed');
      await refresh();setSelected(null);
      setNotice(kind==='approve'?'Public media approved.':'Draft rejected; private original retained.');
      if(kind==='approve')window.location.reload();
    }catch(e){setError(e instanceof Error?e.message:'Review failed');}
    finally{setBusy(false);}
  }
  const current=drafts.find(d=>d.id===selected);
  return <section id="ct-private-draft-panel" aria-label="Private media drafts"
    className="mb-6 rounded-xl border border-border bg-background p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">Private media drafts</h2>
        <p className="mt-1 text-sm text-muted-foreground">Secure uploads and rights review before publication.</p>
      </div>
      <button className={button} type="button" disabled={busy}
        onClick={()=>void refresh().catch((e:unknown)=>setError(e instanceof Error?e.message:'Refresh failed'))}>
        <RefreshCw size={16}/> Refresh
      </button>
    </div>
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <label htmlFor="ct-private-upload" className="text-sm">Private image</label>
      <input id="ct-private-upload" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="max-w-full text-sm" onChange={e=>setFile(e.target.files?.[0]??null)}/>
      <button type="button" className={button} disabled={!file||busy} onClick={()=>void upload()}>
        <UploadCloud size={16}/> Upload privately
      </button>
    </div>
    {error&&<p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
    {notice&&<p role="status" className="mb-3 text-sm">{notice}</p>}
    <div className="space-y-2">
      {drafts.length===0&&<p className="text-sm text-muted-foreground">No private drafts available.</p>}
      {drafts.map(d=><div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{d.fileName}</p>
          <p className="text-xs text-muted-foreground">{d.state} · {(d.fileSizeBytes/1024).toFixed(0)} KB</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={button} disabled={busy} onClick={()=>void preview(d.id)}>
            <Eye size={15}/> Preview
          </button>
          {canReview&&(d.state==='pending'||d.state==='failed')&&
            <button type="button" className={button} disabled={busy} onClick={()=>choose(d)}>Review</button>}
          {d.state==='published'&&<span className="flex items-center gap-1 text-sm"><CheckCircle2 size={16}/> Approved</span>}
        </div>
      </div>)}
    </div>
    {canReview&&current&&(current.state==='pending'||current.state==='failed')&&<div className="mt-5 space-y-3 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">Review {current.fileName}</h3>
      <p className="text-xs text-muted-foreground">
        Publication will copy the verified original into the public bucket. Retried rights must match the original decision.
      </p>
      <label className="block text-sm">Rights category
        <select className={field} value={rightsStatus} onChange={e=>setRightsStatus(e.target.value)}>
          {choices.map(([v,label])=><option key={v} value={v}>{label}</option>)}
        </select>
      </label>
      <label className="block text-sm">Rights evidence / review notes
        <textarea className={field} rows={2} value={rightsNotes} onChange={e=>setRightsNotes(e.target.value)}/>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">License name
          <input className={field} value={licenseName} onChange={e=>setLicenseName(e.target.value)}/>
        </label>
        <label className="block text-sm">Credit / attribution
          <input className={field} value={credit} onChange={e=>setCredit(e.target.value)}/>
        </label>
        <label className="block text-sm">Alternative text
          <input className={field} value={altText} onChange={e=>setAltText(e.target.value)}/>
        </label>
        <label className="block text-sm">Public title
          <input className={field} value={title} onChange={e=>setTitle(e.target.value)}/>
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={confirmRights} onChange={e=>setConfirmRights(e.target.checked)}/>
        I verified this image has permission for public distribution.
      </label>
      <button type="button" className={button} disabled={busy||!confirmRights||rightsNotes.trim().length<10}
        onClick={()=>void act(current.id,'approve')}>
        <CheckCircle2 size={16}/> {current.state==='failed'?'Retry promotion':'Approve and publish media'}
      </button>
      {current.state==='pending'&&<div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 text-sm">Rejection reason
          <input className={field} value={reason} onChange={e=>setReason(e.target.value)}/>
        </label>
        <button type="button" className={button} disabled={busy||reason.trim().length<8}
          onClick={()=>void act(current.id,'reject')}><XCircle size={16}/> Reject</button>
      </div>}
    </div>}
  </section>;
}
