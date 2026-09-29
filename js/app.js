/* ==========================================================
   JIGME TENZIN ePORTFOLIO - FINAL PUBLIC SITE SCRIPT
   Robust Supabase loading + media + SPA navigation + marquee.
   ========================================================== */
document.documentElement.classList.remove('no-js');

const FALLBACK = {
  profile:{name:'Jigme Tenzin',intro:'A teacher trainee exploring technology, programming, web development and creative digital solutions.'},
  about:'I am a teacher trainee with a strong interest in Information Technology, digital tools and creative problem-solving.\n\nI enjoy learning by building practical projects and exploring ways technology can make everyday tasks simpler and learning more engaging.\n\nMy interests include web development, programming, ICT education, football, hiking and continuous self-improvement.',
  skills:[
    {name:'Web Development',description:'Responsive websites with HTML, CSS and JavaScript.',level:88,icon:'🌐'},
    {name:'Python Programming',description:'Programming, algorithms and practical problem solving.',level:82,icon:'🐍'},
    {name:'Database & Supabase',description:'SQL, cloud data and modern web backends.',level:78,icon:'🗄️'},
    {name:'UI & UX Design',description:'Clean, colorful and user-friendly interfaces.',level:80,icon:'🎨'},
    {name:'ICT Teaching',description:'Interactive technology learning and lesson design.',level:86,icon:'👨‍🏫'},
    {name:'Problem Solving',description:'Breaking ideas into clear, practical steps.',level:84,icon:'🧩'}
  ],
  education:[
    {period:'2023 — 2027',title:'B.Ed. IT / Digital Technology & Innovation',institution:'Samtse College of Education, Royal University of Bhutan',description:'ICT, programming, pedagogy and educational innovation.'},
    {period:'2017 — 2022',title:'Class 7 — 12, Arts Stream',institution:'Minjiwoong Higher Secondary School',description:'Secondary education with continued interest in technology.'},
    {period:'2008 — 2016',title:'Grade PP — 6',institution:'Lauri Primary School',description:'Foundation for lifelong learning and curiosity.'}
  ],
  projects:[
    {title:'QR Restaurant Ordering System',description:'A responsive restaurant ordering platform with QR-based table access, Supabase data and separate customer/admin experiences.',technologies:'HTML · CSS · JavaScript · Supabase',icon:'🍽️'},
    {title:'School Management System',description:'A digital school dashboard covering students, teachers, results, attendance, admission and notices.',technologies:'Supabase · JavaScript · Vercel',icon:'🏫'},
    {title:'EVMS',description:'A desktop electronic voting management system with nominees, voters, voting and reports.',technologies:'Python · Tkinter · SQLite',icon:'🗳️'},
    {title:'Library Management System',description:'A school library system for registration, borrowing and due-book tracking.',technologies:'Python · Tkinter · SQLite',icon:'📚'}
  ],
  socials:[]
};

const CFG = window.SUPABASE_CONFIG || {};
const configured = typeof supabase !== 'undefined' && CFG.url && /^https?:\/\//i.test(CFG.url) && CFG.anonKey && CFG.anonKey !== 'YOUR_SUPABASE_ANON_KEY';
const db = configured ? supabase.createClient(CFG.url, CFG.anonKey) : null;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const safeUrl = u => { const v=String(u??'').trim(); return /^(https?:\/\/|mailto:|tel:|assets\/|\/|#)/i.test(v) ? v : ''; };
const looksLikeImage = v => /^(https?:\/\/|data:image\/|assets\/)/i.test(String(v??'').trim());

function parseGallery(v){
  if(!v) return [];
  if(Array.isArray(v)) return v.filter(Boolean).map(String);
  try { const a=JSON.parse(v); if(Array.isArray(a)) return a.filter(Boolean).map(String); } catch(e){}
  return String(v).split(/\r?\n|,/).map(x=>x.trim()).filter(Boolean);
}
function videoEmbed(url,label='Watch video'){
  const u=safeUrl(url); if(!u) return '';
  try{
    const x=new URL(u,location.href); let id='';
    if(x.hostname.includes('youtu.be')) id=x.pathname.slice(1).split('/')[0];
    else if(x.hostname.includes('youtube.com')) id=x.searchParams.get('v') || (x.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)||[])[1] || '';
    if(id) return `<div class="media-video-wrap"><iframe class="media-video" src="https://www.youtube.com/embed/${encodeURIComponent(id)}" title="${esc(label)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
    if(x.hostname.includes('vimeo.com')){ const id2=x.pathname.split('/').filter(Boolean).pop(); if(id2) return `<div class="media-video-wrap"><iframe class="media-video" src="https://player.vimeo.com/video/${encodeURIComponent(id2)}" title="${esc(label)}" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`; }
    if(/\.(mp4|webm|ogg)(\?.*)?$/i.test(x.pathname)) return `<div class="media-video-wrap"><video class="media-video" controls preload="metadata" src="${esc(u)}"></video></div>`;
  }catch(e){}
  return `<a class="media-video-link" href="${esc(u)}" target="_blank" rel="noopener">▶ ${esc(label)}</a>`;
}
function galleryHtml(v,alt='Gallery'){
  const imgs=parseGallery(v).filter(looksLikeImage); if(!imgs.length) return '';
  return `<div class="media-gallery">${imgs.map((u,i)=>`<button type="button" class="gallery-thumb" data-gallery-open="${esc(u)}" aria-label="Open image ${i+1}"><img src="${esc(u)}" alt="${esc(alt)} ${i+1}" loading="lazy"></button>`).join('')}</div>`;
}
function paragraphsHtml(t){ return String(t||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean).map(x=>`<p>${esc(x).replace(/\n/g,'<br>')}</p>`).join(''); }

async function queryRows(table){
  if(!db) return null;
  try{
    const res=await db.from(table).select('*');
    if(res.error){ console.warn(`Portfolio: ${table} failed:`,res.error.message); return null; }
    return Array.isArray(res.data)?res.data:[];
  }catch(e){ console.warn(`Portfolio: ${table} failed:`,e); return null; }
}
function sortRows(rows){
  if(!Array.isArray(rows)) return rows;
  return rows.map((r,i)=>({...r,__order:Number.isFinite(Number(r.display_order))?Number(r.display_order):i+1})).sort((a,b)=>a.__order-b.__order);
}
function first(rows,fallback){ return rows && rows.length ? rows[0] : fallback; }
function firstVal(o,keys,def=''){ for(const k of keys){ if(o && o[k]!==undefined && o[k]!==null && String(o[k]).trim()!=='') return o[k]; } return def; }

function renderAbout(row){
  const host=$('#aboutContent'); if(!host) return;
  const r=row||{};
  const before=firstVal(r,['content_before','before_content','intro','content'],FALLBACK.about);
  const middle=firstVal(r,['content_middle','middle_content','body_middle'],'');
  const after=firstVal(r,['content_after','after_content','closing_content'],'');
  const image=looksLikeImage(r.image_url||r.photo_url||r.image) ? `<figure class="about-media about-photo reveal"><img src="${esc(firstVal(r,['image_url','photo_url','image']))}" alt="About Jigme Tenzin" loading="lazy"><figcaption>Moments from my learning journey</figcaption></figure>`:'';
  const video=videoEmbed(firstVal(r,['video_url','video']), 'About my journey');
  const gallery=galleryHtml(firstVal(r,['gallery','gallery_urls','images']),'About');
  host.innerHTML=`<article class="card about-story reveal"><div class="about-story-head"><div class="initials">JT</div><div><span class="media-kicker">My story</span><h4>A journey of learning, teaching and creating</h4></div></div><div class="about-text">${paragraphsHtml(before)}${paragraphsHtml(middle)}${image}${video?`<div class="about-media about-video reveal">${video}</div>`:''}${gallery?`<div class="about-media about-gallery reveal"><h5>More moments</h5>${gallery}</div>`:''}${paragraphsHtml(after)}</div></article><div class="facts reveal"><div class="card"><b>📍</b><span><small>Based in</small><strong>Bhutan</strong></span></div><div class="card"><b>🎓</b><span><small>Current study</small><strong>B.Ed. IT / DTI</strong></span></div><div class="card"><b>🎯</b><span><small>Focus</small><strong>Technology & Education</strong></span></div><div class="card"><b>🚀</b><span><small>Mindset</small><strong>Learn · Build · Improve</strong></span></div></div>`;
}

function normalizeProfile(r){ return {...FALLBACK.profile,...r,name:firstVal(r,['name','full_name'],'Jigme Tenzin'),intro:firstVal(r,['intro','bio','description'],FALLBACK.profile.intro),profile_image:firstVal(r,['profile_image','image_url','photo_url'],''),cv_url:firstVal(r,['cv_url','resume_url','resume','cv'],''),contact_email:firstVal(r,['contact_email','email'],''),contact_phone:firstVal(r,['contact_phone','phone'], '')}; }
function normalizeSkill(r,i){ return {...r,name:firstVal(r,['name','title','skill_name'],'Skill'),description:firstVal(r,['description','details','skill_description'],''),level:Number(firstVal(r,['level','percentage','progress','skill_level'],0))||0,image_url:firstVal(r,['image_url','photo_url','image'],''),video_url:firstVal(r,['video_url','video'],''),gallery:firstVal(r,['gallery','gallery_urls','images'],''),icon:firstVal(r,['icon','emoji'],'✦'),display_order:Number(firstVal(r,['display_order','order','position'],i+1))||i+1}; }
function normalizeEducation(r,i){ return {...r,period:firstVal(r,['period','year','years','date'],'') ,title:firstVal(r,['title','qualification','degree','program'],'Education'),institution:firstVal(r,['institution','school','school_name','college','university'],''),description:firstVal(r,['description','details','summary'],''),image_url:firstVal(r,['image_url','photo_url','image'],''),video_url:firstVal(r,['video_url','video'],''),certificate_url:firstVal(r,['certificate_url','certificate','pdf_url'],''),gallery:firstVal(r,['gallery','gallery_urls','images'],''),display_order:Number(firstVal(r,['display_order','order','position'],i+1))||i+1}; }
function normalizeProject(r,i){ return {...r,title:firstVal(r,['title','name','project_name'],'Untitled project'),description:firstVal(r,['description','details','project_description','summary'],''),technologies:firstVal(r,['technologies','tech','tech_stack','technology'],'') ,image_url:firstVal(r,['image_url','cover_image','photo_url','image'],''),project_url:firstVal(r,['project_url','live_url','demo_url','website_url'],''),github_url:firstVal(r,['github_url','repository_url','repo_url','github'],''),video_url:firstVal(r,['video_url','demo_video','video'],''),gallery:firstVal(r,['gallery','gallery_urls','images','screenshots'],''),icon:firstVal(r,['icon','emoji'],'✦'),display_order:Number(firstVal(r,['display_order','order','position'],i+1))||i+1}; }

function renderSkills(rows){
  const host=$('#skillsGrid'); if(!host)return;
  const data=(rows&&rows.length?rows:FALLBACK.skills).map(normalizeSkill);
  host.innerHTML=data.map(s=>{ const lvl=Math.max(0,Math.min(100,Number(s.level)||0)); const img=looksLikeImage(s.image_url)?s.image_url:''; const icon=img?`<img class="skill-icon skill-icon-img" src="${esc(img)}" alt="${esc(s.name)}" loading="lazy">`:`<span class="skill-icon">${esc(s.icon)}</span>`; return `<article class="card skill-card reveal"><div class="skill-media">${icon}<span class="skill-level">${lvl}%</span></div><div class="skill-card-body"><div class="skill-heading"><h4>${esc(s.name)}</h4><span>${lvl}%</span></div><p>${esc(s.description)}</p><div class="bar"><i data-w="${lvl}"></i></div>${galleryHtml(s.gallery,s.name)?`<div class="skill-extra">${galleryHtml(s.gallery,s.name)}</div>`:''}${videoEmbed(s.video_url,`Watch ${s.name} video`)}</div></article>`; }).join('');
  return data;
}
function renderEducation(rows){
  const host=$('#educationGrid'); if(!host)return;
  const data=(rows&&rows.length?rows:FALLBACK.education).map(normalizeEducation);
  host.innerHTML=data.map(e=>{ const img=looksLikeImage(e.image_url)?`<div class="education-media"><img src="${esc(e.image_url)}" alt="${esc(e.title)}" loading="lazy"></div>`:''; const cert=safeUrl(e.certificate_url)?`<a class="media-action" href="${esc(e.certificate_url)}" target="_blank" rel="noopener">View certificate ↗</a>`:''; return `<article class="card timeline-item reveal">${img}<small>${esc(e.period)}</small><h4>${esc(e.title)}</h4><p class="inst">${esc(e.institution)}</p><p>${esc(e.description)}</p>${galleryHtml(e.gallery,e.title)}${videoEmbed(e.video_url,`Watch ${e.title} video`)}${cert?`<div class="media-actions">${cert}</div>`:''}</article>`; }).join(''); return data;
}
function renderProjects(rows){
  const host=$('#projectsGrid'); if(!host)return;
  const data=(rows&&rows.length?rows:FALLBACK.projects).map(normalizeProject);
  host.innerHTML=data.map(p=>{ const techs=String(p.technologies||'').split(/[·,|;]/).map(x=>x.trim()).filter(Boolean); const live=safeUrl(p.project_url),repo=safeUrl(p.github_url); const links=live||repo?`<div class="project-links">${live?`<a href="${esc(live)}" target="_blank" rel="noopener">Live Demo ↗</a>`:''}${repo?`<a href="${esc(repo)}" target="_blank" rel="noopener">GitHub ↗</a>`:''}</div>`:''; const media=looksLikeImage(p.image_url)?`<div class="project-image"><img src="${esc(p.image_url)}" alt="${esc(p.title)}" loading="lazy"></div>`:`<div class="project-icon">${esc(p.icon)}</div>`; return `<article class="card project-card reveal">${media}<div class="project-body"><div class="project-heading"><span class="project-number">${String(p.display_order).padStart(2,'0')}</span><h4>${esc(p.title)}</h4></div><p>${esc(p.description)}</p>${techs.length?`<div class="tech">${techs.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}${galleryHtml(p.gallery,p.title)?`<div class="project-extra">${galleryHtml(p.gallery,p.title)}</div>`:''}${videoEmbed(p.video_url,`Watch ${p.title} demo`)}${links}</div></article>`; }).join(''); return data;
}

async function load(){
  const [pRows,aRows,sRows,eRows,prRows,soRows]=await Promise.all([queryRows('portfolio_profile'),queryRows('portfolio_about'),queryRows('portfolio_skills'),queryRows('portfolio_education'),queryRows('portfolio_projects'),queryRows('portfolio_socials')]);
  const profile=normalizeProfile(first(pRows,null));
  const aboutRow=first(aRows,{})||{};
  const skills=renderSkills(sortRows(sRows)||null)||FALLBACK.skills;
  const edu=renderEducation(sortRows(eRows)||null)||FALLBACK.education;
  const projects=renderProjects(sortRows(prRows)||null)||FALLBACK.projects;
  renderAbout(aboutRow);

  const setText=(sel,v)=>{const el=$(sel);if(el)el.textContent=v;};
  setText('#profileName',profile.name); setText('#profileIntro',profile.intro); setText('#footerNameBottom',profile.name);
  const bust=u=>u?`${u}${u.includes('?')?'&':'?'}v=${Date.now()}`:'';
  if(profile.profile_image&&looksLikeImage(profile.profile_image)){const u=bust(profile.profile_image); const a=$('#profileImage'),b=$('#brandImg'); if(a)a.src=u;if(b)b.src=u;}
  if(profile.cv_url&&safeUrl(profile.cv_url)){const a=$('#cvLink');if(a){a.href=profile.cv_url;a.setAttribute('download','Jigme-Tenzin-CV.pdf');}}
  const email=String(profile.contact_email||'').trim(),phone=String(profile.contact_phone||'').trim(),ee=$('#footerEmail'),et=$('#footerEmailText'),pe=$('#footerPhone'),pt=$('#footerPhoneText');
  if(ee&&et){ee.href=email?`mailto:${email}`:'#contact';et.textContent=email||'Use the contact form';} if(pe&&pt){pe.style.display=phone?'inline-flex':'none';pe.href=phone?`tel:${phone.replace(/[^+0-9]/g,'')}`:'tel:';pt.textContent=phone;}
  const count=(sel,n)=>{const el=$(sel);if(el)el.dataset.count=String(n);}; count('#skillCount',skills.length);count('#projectCount',projects.length);count('#eduCount',edu.length);
  const socials=(soRows&&soRows.length?soRows:FALLBACK.socials).filter(s=>safeUrl(s.url)); const html=socials.map(s=>`<a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">${looksLikeImage(s.icon)?`<img class="social-icon-img" src="${esc(s.icon)}" alt="">`:esc(s.icon||'↗')} ${esc(s.name||s.platform||'Link')}</a>`).join(''); if($('#socials'))$('#socials').innerHTML=html;if($('#contactSocials'))$('#contactSocials').innerHTML=html;
  observe();
}

let io=null;
function stagger(){document.querySelectorAll('.skills-grid,.projects-grid,.timeline,.facts,.contact-grid,.about-grid').forEach(c=>[...c.children].forEach((el,i)=>el.style.setProperty('--i',i)));}
function show(el){if(!el)return;el.classList.add('visible');el.querySelectorAll('.bar i[data-w]').forEach(b=>{requestAnimationFrame(()=>{b.style.width=b.dataset.w+'%';});});}
function observe(){stagger();const items=document.querySelectorAll('.reveal:not(.visible)');if(!('IntersectionObserver' in window)){items.forEach(show);return;}if(!io)io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){show(x.target);io.unobserve(x.target);}}),{threshold:.08});items.forEach(x=>io.observe(x));}
function runCounts(){document.querySelectorAll('[data-count]').forEach(el=>{const end=Number(el.dataset.count)||0,t0=performance.now(),dur=900;(function step(t){const k=Math.min(1,(t-t0)/dur);el.textContent=Math.round(end*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(step);})(t0);});}
function toast(t){const x=$('#toast');if(!x)return;x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),3000);}
function typing(){const el=$('#typed');if(!el)return;const words=['build digital experiences.','create useful websites.','love learning Python.','teach with technology.'];let w=0,c=0,del=false;(function tick(){const word=words[w];el.textContent=word.slice(0,c);if(!del&&c===word.length){del=true;return setTimeout(tick,1600);}if(del&&c===0){del=false;w=(w+1)%words.length;return setTimeout(tick,350);}c+=del?-1:1;setTimeout(tick,del?35:70);})();}

async function sendMessage(e){e.preventDefault();const status=$('#formStatus'),btn=$('#sendBtn');if(!status||!btn)return;status.className='';status.textContent='Sending...';if(!db){status.className='err';status.textContent='Contact form is not connected yet.';return;}btn.disabled=true;const {error}=await db.from('portfolio_messages').insert({name:$('#cname').value.trim(),email:$('#cemail').value.trim(),message:$('#cmessage').value.trim()});btn.disabled=false;if(error){status.className='err';status.textContent='Could not send message. Please try again later.';return;}status.className='ok';status.textContent='Message sent successfully!';e.target.reset();toast('Thank you! Your message was sent.');}

const pageMessages={home:'Welcome to my digital ePortfolio · Learn · Build · Improve ·',about:'About Me · My journey in technology, education and creativity ·',skills:'Skills · Programming · Web Development · ICT Teaching · Design ·',education:'Education · Learning milestones · Academic growth · Teaching journey ·',projects:'Projects · Real systems · Creative ideas · Digital solutions ·',contact:'Contact · Let’s connect · Share an idea · Build something useful ·'};
let marqueeTimer=null,marqueeX=0,marqueeLast=0,marqueeHalf=0;
function updatePageMarquee(id){const track=$('.marquee-track');if(!track)return;const text=pageMessages[id]||pageMessages.home;track.innerHTML=Array.from({length:8},(_,i)=>`<span${i?' aria-hidden="true"':''}>${esc(text)}</span>`).join('');marqueeX=-Math.max(0,track.scrollWidth/2);marqueeLast=performance.now();requestAnimationFrame(()=>{marqueeHalf=track.scrollWidth/2;});}
function animateMarquee(t){const track=$('.marquee-track');if(track){if(!marqueeLast)marqueeLast=t;const dt=Math.min(50,t-marqueeLast);marqueeLast=t;if(marqueeHalf<=0)marqueeHalf=track.scrollWidth/2;marqueeX+=dt*0.045;if(marqueeX>=0)marqueeX=-marqueeHalf;track.style.transform=`translate3d(${marqueeX}px,0,0)`;}marqueeTimer=requestAnimationFrame(animateMarquee);}

const menuBtn=$('#menuBtn'),nav=$('#nav');
if(menuBtn&&nav){menuBtn.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuBtn.setAttribute('aria-expanded',String(open));});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menuBtn.setAttribute('aria-expanded','false');}));}
const contactForm=$('#contactForm');if(contactForm)contactForm.addEventListener('submit',sendMessage);
const year=$('#year');if(year)year.textContent=new Date().getFullYear();
window.addEventListener('scroll',()=>{const top=$('#topBtn'),prog=$('#progress');if(top)top.style.display=scrollY>500?'block':'none';if(prog){const max=document.documentElement.scrollHeight-innerHeight;prog.style.width=(max>0?Math.min(100,scrollY/max*100):0)+'%';}},{passive:true});
const topBtn=$('#topBtn');if(topBtn)topBtn.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));

document.addEventListener('click',e=>{const btn=e.target.closest('[data-gallery-open]');if(!btn)return;const overlay=document.createElement('div');overlay.className='media-lightbox';overlay.innerHTML=`<button class="lightbox-close" aria-label="Close">&times;</button><img src="${esc(btn.dataset.galleryOpen)}" alt="Portfolio image">`;document.body.appendChild(overlay);const close=()=>overlay.remove();overlay.addEventListener('click',ev=>{if(ev.target===overlay||ev.target.closest('.lightbox-close'))close();});});

document.documentElement.classList.add('spa');
const pages=[...document.querySelectorAll('main > section[id]')];
const navLinks=nav?[...nav.querySelectorAll('a[href^="#"]')]:[];
function showPage(){const id=(location.hash||'#home').slice(1),target=pages.find(p=>p.id===id)||pages[0];if(!target)return;pages.forEach(p=>p.classList.toggle('active',p===target));navLinks.forEach(l=>l.classList.toggle('active',l.getAttribute('href')==='#'+target.id));target.querySelectorAll('.reveal').forEach(show);if(target.id==='home')runCounts();document.title=(target.id==='home'?'Jigme Tenzin':target.id.charAt(0).toUpperCase()+target.id.slice(1)+' · Jigme Tenzin')+' | ePortfolio';updatePageMarquee(target.id);scrollTo({top:0,behavior:'auto'});}
window.addEventListener('hashchange',showPage);

typing();updatePageMarquee((location.hash||'#home').slice(1));requestAnimationFrame(animateMarquee);load().then(()=>{observe();showPage();}).catch(err=>{console.error('Portfolio load failed:',err);renderSkills(null);renderEducation(null);renderProjects(null);renderAbout({});observe();showPage();});
showPage();
