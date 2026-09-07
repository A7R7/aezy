// Adapted for Aezy; OpenCodex MIT attribution in LICENSE.opencodex.
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from "react";
export const API_BASE="/aezy/observability";
export function aezyFetch(input: RequestInfo | URL, init: RequestInit = {}) {const headers=new Headers(init.headers); headers.set("X-Aezy-Client","web"); return window.fetch(input,{...init,headers,credentials:"same-origin",signal:init.signal??AbortSignal.timeout(10000)});}
export function useStableEvent<T extends (...args:any[])=>any>(fn:T):T {const ref=useRef(fn);useLayoutEffect(()=>{ref.current=fn});return useCallback(((...args:any[])=>ref.current(...args)) as T,[]);}
export type Surface={id:string;label:string};
export function useSurfaces(){const [surfaces,setSurfaces]=useState<Surface[]>([]);useEffect(()=>{const c=new AbortController();const read=()=>{void aezyFetch(API_BASE+"/api/surfaces",{signal:AbortSignal.any([c.signal,AbortSignal.timeout(10000)])}).then(r=>{if(!r.ok)throw Error("surfaces unavailable");return r.json()}).then(setSurfaces).catch(()=>{})};read();const timer=setInterval(read,10000);return()=>{c.abort();clearInterval(timer)}},[]);return surfaces;}
export function surfaceLabel(id:string,surfaces:Surface[]){return id==="all"?"All":surfaces.find(s=>s.id===id)?.label??id;}
