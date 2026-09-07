// Adapted for Aezy; OpenCodex MIT attribution in LICENSE.opencodex.
import type { ReactNode, CSSProperties } from "react";
import {IconCheck,IconAlert} from "./icons";
export function Switch({on,mixed=false,onClick,disabled,label}: {on:boolean;mixed?:boolean;onClick:()=>void;disabled?:boolean;label?:string}) {return <button type="button" className={`switch${on?" on":""}`} onClick={onClick} disabled={disabled} aria-pressed={mixed?"mixed":on} aria-label={label}><span className="knob"/></button>}
export function Notice({tone,children}:{tone:"ok"|"warn"|"err";children:ReactNode}) {return <div className={`notice notice-${tone}`} role={tone==="err"?"alert":"status"}>{tone==="ok"?<IconCheck/>:<IconAlert/>}<span>{children}</span></div>}
export function EmptyState({icon,title,children,className,style}:{icon?:ReactNode;title:ReactNode;children?:ReactNode;className?:string;style?:CSSProperties}) {return <div className={`empty ${className??""}`} style={style}>{icon}<div className="title">{title}</div>{children&&<div className="sub">{children}</div>}</div>}
