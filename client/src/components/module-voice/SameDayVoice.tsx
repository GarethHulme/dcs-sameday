import {useLocation} from 'wouter';
import {useAuth} from '../../lib/auth';
import {apiRequest} from '../../lib/queryClient';
import ModuleVoiceAssistant,{type VoiceTool} from './ModuleVoiceAssistant';
import {VOICE_VIEWS} from './module-voice-views';
import {voiceViewTools,moduleReadTools} from './module-voice-tools';
export default function SameDayVoice(){const {user}=useAuth();const [,navigate]=useLocation();const get=async(path:string)=>{const r=await apiRequest('GET',path);if(!r.ok)throw Error('Same day request failed ('+r.status+')');return r.json();};

 const extra:VoiceTool[]=[{id:'sameday.jobs.read',label:'Current same day job status',kind:'read',run:async a=>{if(a.week||a.contract||a.site)throw Error('Use the Jobs page for contract or historical-period filters');const data=await get('/api/jobs');if(!Array.isArray(data))throw Error('The job source returned no job list');const rows=data.filter((r:any)=>(!a.date||String(r.date||r.jobDate||'').slice(0,10)===a.date)&&(!a.search||JSON.stringify([r.title,r.description,r.pickupPostcode,r.deliveryPostcode]).toLowerCase().includes(a.search.toLowerCase())));return {title:'Same day job evidence',summary:`${rows.length} matching jobs: ${rows.filter((r:any)=>r.status==='open').length} open, ${rows.filter((r:any)=>r.status==='in_progress').length} in progress, ${rows.filter((r:any)=>r.status==='completed').length} completed.`,rows:rows.slice(0,100).map((r:any)=>({label:r.title||r.jobRef||'Job '+r.id,detail:String(r.status)})),source:'Existing authorised same day job list',sourceHref:'#/jobs',limits:'Job counts reflect source statuses. No job has been posted, claimed, cancelled or assigned.'};}}];

return <ModuleVoiceAssistant module="same_day" identity={user as any} verifyIdentity={async()=>get('/api/auth/me')} tools={[...voiceViewTools(VOICE_VIEWS.same_day,navigate),...moduleReadTools('same_day',get),...extra]}/>;
}
