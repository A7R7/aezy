// Adapted for Aezy; OpenCodex MIT attribution in LICENSE.opencodex.
import { en } from "./en";
export type Locale = string;
export type TFn = (key: string, vars?: Record<string, string | number>) => string;
export const LOCALES = [{code:"en",htmlLang:"en"}];
export function useI18n() { return {locale:"en",t:((key,vars)=>{let text=(en as Record<string,string>)[key] ?? key; for(const [k,v] of Object.entries(vars??{}))text=text.split("{"+k+"}").join(String(v));return text;}) as TFn};}
