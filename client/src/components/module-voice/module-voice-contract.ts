export const MODULE_VOICE_ORIGINS:Record<string,string>={command_centre:'https://dcs-command-suite-production.up.railway.app',recruitment_compliance:'https://dcs-recruitment-compliance-production.up.railway.app',fleet_management:'https://dcs-fleet-production.up.railway.app',amazon_management:'https://dcs-logistics-portal-production.up.railway.app',roster_control:'https://dcs-roster-hardened-production.up.railway.app',engage:'https://dcs-engage-production.up.railway.app',driver_portal:'https://dcs-driver-portal-production.up.railway.app',management_portal:'https://dcs-management-portal-v2-production.up.railway.app',platform_intelligence:'https://dcs-platform-intelligence-production.up.railway.app',business_development:'https://front-end-production-a29d.up.railway.app',same_day:'https://dcs-sameday-production.up.railway.app'};
export const WORKSPACE_ACTION_KINDS=['workspace.run','workspace.help','workspace.back','workspace.scroll','workspace.read'] as const;
export type WorkspaceTool={id:string;label:string;kind:'read'|'view'|'review'};
export type WorkspaceArgs={search?:string;date?:string;week?:number;contract?:string;site?:string};
export type WorkspaceAction={kind:'workspace.run';toolId:string;args:WorkspaceArgs}|{kind:'workspace.help'|'workspace.back'|'workspace.read'}|{kind:'workspace.scroll';direction:'up'|'down'};
export function validWorkspaceTools(v:unknown):v is WorkspaceTool[]{return Array.isArray(v)&&v.length<=50&&new Set(v.map(x=>x?.id)).size===v.length&&v.every(t=>t&&Object.keys(t).length===3&&typeof t.id==='string'&&/^[a-z][a-z0-9_.-]{0,63}$/.test(t.id)&&typeof t.label==='string'&&t.label.length>0&&t.label.length<=100&&['read','view','review'].includes(t.kind));}
export function validWorkspaceAction(v:any):v is WorkspaceAction{
 if(!v||typeof v!=='object'||Array.isArray(v))return false;
 if(['workspace.help','workspace.back','workspace.read'].includes(v.kind))return Object.keys(v).length===1;
 if(v.kind==='workspace.scroll')return Object.keys(v).length===2&&(v.direction==='up'||v.direction==='down');
 if(v.kind!=='workspace.run'||Object.keys(v).length!==3||typeof v.toolId!=='string'||!/^[a-z][a-z0-9_.-]{0,63}$/.test(v.toolId)||!v.args||typeof v.args!=='object'||Array.isArray(v.args)||Object.keys(v.args).some(k=>!['search','date','week','contract','site'].includes(k)))return false;
 const a=v.args;return (a.search===undefined||typeof a.search==='string'&&a.search.trim().length>0&&a.search.length<=200)&&(a.date===undefined||typeof a.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(a.date)&&Number.isFinite(Date.parse(a.date))&&new Date(a.date).toISOString().slice(0,10)===a.date)&&(a.week===undefined||Number.isInteger(a.week)&&a.week>=1&&a.week<=53)&&['contract','site'].every(k=>a[k]===undefined||typeof a[k]==='string'&&a[k].trim().length>0&&a[k].length<=80);
}
export function exactWorkspaceAction(text:string,tools:WorkspaceTool[]):WorkspaceAction|null{
 const q=text.toLowerCase().trim().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
 if(/^(?:voice )?help$/.test(q)||q==='what can i do here')return {kind:'workspace.help'};
 if(q==='go back')return {kind:'workspace.back'};if(q==='read this'||q==='read the results')return {kind:'workspace.read'};
 if(q==='scroll down'||q==='scroll up')return {kind:'workspace.scroll',direction:q.endsWith('down')?'down':'up'};
 const stripped=q.replace(/^(?:open|show|review|list|get|find) (?:the )?/,'');const match=tools.filter(t=>t.label.toLowerCase()===q||t.label.toLowerCase()===stripped||t.id===q);
 return match.length===1?{kind:'workspace.run',toolId:match[0].id,args:{}}:null;
}

export function moduleVoiceOriginAllowed(module:string,origin:string){return MODULE_VOICE_ORIGINS[module]===origin||(module==='roster_control'&&origin==='https://dcs-roster-production.up.railway.app');}
export function knownModuleVoiceOrigin(origin:string){return Object.values(MODULE_VOICE_ORIGINS).includes(origin)||origin==='https://dcs-roster-production.up.railway.app';}
