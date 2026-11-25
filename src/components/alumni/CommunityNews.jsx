import {useEffect} from 'react';
import {api,apiBase} from '../../lib/api';
import {useResource} from '../../lib/useResource';
import {Status} from './UI';
/** Show published notices and an explicitly approximate visit total on the home page. */
export default function CommunityNews(){const notices=useResource('/api/announcements'),visits=useResource('/api/visits/count');useEffect(()=>{if(!apiBase)return;try{let id=localStorage.getItem('alumni-visitor');if(!id){id=crypto.randomUUID();localStorage.setItem('alumni-visitor',id);}api('/api/visits',{method:'POST',body:{visitor_id:id}}).catch(()=>{});}catch{/* Counting is optional when browser storage is unavailable. */}},[]);return <section className="alumni-page"><h2>From the alumni community</h2><Status resource={notices} empty={!notices.data?.announcements?.length}/><div className="alumni-grid">{notices.data?.announcements?.map(item=><article className="alumni-card" key={item.id}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>{visits.data&&<p>{visits.data.count.toLocaleString()} daily browser visits · approximate total</p>}</section>;}
