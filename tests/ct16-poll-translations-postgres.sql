\set ON_ERROR_STOP on
begin;
insert into public.staff_memberships(id,auth_user_id,status,member_type,activated_at) values
 ('c1600000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001','active','employee',now()),
 ('c1600000-0000-4000-8000-000000000002','a1500000-0000-4000-8000-000000000002','active','employee',now());
insert into public.staff_member_roles(membership_id,role_preset_id)
 select 'c1600000-0000-4000-8000-000000000001'::uuid,id from public.staff_role_presets where role_key='owner'
 union all select 'c1600000-0000-4000-8000-000000000002'::uuid,id from public.staff_role_presets where role_key='managing_editor';
-- Disposable Owner bootstrap only.
alter table public.staff_role_capabilities disable trigger ct03c_preset_grant_guard;
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
 select p.id,k::public.staff_capability_key,'all' from public.staff_role_presets p cross join unnest(array['newsroom.access','poll.view_manage','poll.edit','poll.publish','story.view_all','byline.manage']) k where p.role_key='owner'
 union all select p.id,k::public.staff_capability_key,'all' from public.staff_role_presets p cross join unnest(array['newsroom.access','poll.view_manage','poll.edit','poll.publish','story.view_all']) k where p.role_key='managing_editor';
alter table public.staff_role_capabilities enable trigger ct03c_preset_grant_guard;
-- Ordinary byline rejection uses service_role, not JWT-authenticated self RPC.
select public.staff_save_onboarding('a1500000-0000-4000-8000-000000000002',0,'Synthetic editor','en',true,1,gen_random_uuid());
set local role service_role;
select public.staff_review_byline('a1500000-0000-4000-8000-000000000001','c1600000-0000-4000-8000-000000000002',1,0,'reject',null,'Owner normal byline review regression',gen_random_uuid());
reset role;
insert into newsroom_private.polls(id,language,question,options,opens_at,closes_at,response_cap,creator,last_editor) values('e1600000-0000-4000-8000-000000000010','en','Synthetic community poll?',array['Yes','No'],now()-interval '1 hour',now()+interval '2 days',100,'a1500000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001');
do $fn$begin
 if has_table_privilege('anon','newsroom_private.poll_placement_state','SELECT') or has_table_privilege('authenticated','newsroom_private.poll_placement_events','INSERT') or has_function_privilege('anon','public.staff_read_poll_placements(uuid)','EXECUTE') then raise exception 'Private placement data exposed';end if;
end;$fn$;
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $fn$
declare pid uuid:='e1600000-0000-4000-8000-000000000010'; p jsonb; placements jsonb:='[{"kind":"homepage","target":"","startsAt":null,"endsAt":null},{"kind":"article","target":"b1500000-0000-4000-8000-000000000001","startsAt":null,"endsAt":null},{"kind":"latest","target":"","startsAt":"2099-01-01T00:00:00Z","endsAt":null}]';
begin
 p:=public.staff_read_poll_placements(pid);if p->>'revision'<>'0' then raise exception 'Unexpected initial placement revision';end if;
 p:=public.staff_lookup_poll_placement_targets('article','ct15',0);
 if jsonb_array_length(p->'items')<>1 or p#>>'{items,0,target}'<>'b1500000-0000-4000-8000-000000000001' then raise exception 'Picker exposed restricted articles';end if;
 begin perform public.staff_change_poll_placements(pid,0,'save','[{"kind":"article","target":"b1500000-0000-4000-8000-000000000002","startsAt":null,"endsAt":null}]','Attempt to attach to draft article');raise exception 'Draft article accepted';exception when invalid_parameter_value then null;end;
 begin perform public.staff_change_poll_placements(pid,0,'save','[{"kind":"homepage","target":"","startsAt":"now","endsAt":null}]','Relative placement timestamp');raise exception 'Relative timestamp accepted';exception when invalid_parameter_value then null;end;
 p:=public.staff_change_poll_placements(pid,0,'save',placements,'Select synthetic page placements');
 if p->>'revision'<>'1' or jsonb_array_length(p->'published')<>0 then raise exception 'Draft placements published';end if;
 begin perform public.staff_change_poll_placements(pid,0,'save',placements,'Try a stale placement edit');raise exception 'Stale save accepted';exception when serialization_failure then null;end;
 begin perform public.staff_change_poll_placements(pid,1,'publish',null,'Attempt to publish draft poll');raise exception 'Draft poll placement published';exception when insufficient_privilege then null;end;
 perform public.staff_change_poll('submit',pid,1,null);
end;$fn$;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000002';
select public.staff_change_poll('approve','e1600000-0000-4000-8000-000000000010',2,null);
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
select public.staff_change_poll('publish','e1600000-0000-4000-8000-000000000010',3,null);
select public.staff_change_poll_placements('e1600000-0000-4000-8000-000000000010',1,'publish',null,'Publish reviewed poll locations');

-- Original independently approved poll, unchanged vote positions.
do $fn$
declare pid uuid:='e1600000-0000-4000-8000-000000000010';s jsonb;fp text;
begin
 s:=public.staff_read_poll_translation(pid);fp:=s->>'sourceFingerprint';
 if s->>'revision'<>'0' or s->>'targetLanguage'<>'es' then raise exception 'Unexpected translation seed';end if;
 begin perform public.staff_change_poll_translation(pid,0,fp,'save','{"question":"Pregunta sintética","options":["Sí","No","Otro"]}','Invalid third option');raise exception 'Changed option count accepted';exception when invalid_parameter_value then null;end;
 begin perform public.staff_change_poll_translation(pid,0,repeat('0',64),'save','{"question":"Pregunta sintética","options":["Sí","No"]}','Stale original fingerprint');raise exception 'Stale source accepted';exception when serialization_failure then null;end;
 s:=public.staff_change_poll_translation(pid,0,fp,'save','{"question":"Pregunta sintética","options":["Sí","No"]}','Save translated poll draft');
 if s->>'revision'<>'1' or s->>'published'<>'false' then raise exception 'Draft exposed';end if;
 perform public.staff_change_poll_translation(pid,1,fp,'submit',null,'Submit translated copy');
 begin perform public.staff_change_poll_translation(pid,2,fp,'approve',null,'Try self approving translation');raise exception 'Self approval accepted';exception when insufficient_privilege then null;end;
 perform set_config('test.poll_translation_fp',fp,true);
end;$fn$;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000002';
select public.staff_change_poll_translation('e1600000-0000-4000-8000-000000000010',2,current_setting('test.poll_translation_fp'),'approve',null,'Independent review of translation');
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
select public.staff_change_poll_translation('e1600000-0000-4000-8000-000000000010',3,current_setting('test.poll_translation_fp'),'publish',null,'Publish reviewed Spanish labels');
reset role;
update newsroom_private.poll_settings set public_enabled=true where singleton;
set local request.jwt.claim.sub='';
set local role anon;
do $fn$begin
 if jsonb_array_length(public.public_list_polls('es',0)->'items')<>0 then raise exception 'Translation activation bypassed';end if;
end;$fn$;
reset role;
update newsroom_private.poll_translation_settings set public_enabled=true where singleton;
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $fn$
declare pid uuid:='e1600000-0000-4000-8000-000000000010';en jsonb;es jsonb;
begin
 en:=public.public_list_polls('en',0)#>'{items,0}';es:=public.public_placed_polls('es','homepage','')#>'{items,0}';
 if en->>'id' is distinct from pid::text or es->>'id' is distinct from pid::text or es->>'question' is distinct from 'Pregunta sintética' or es->'options' is distinct from '["Sí","No"]'::jsonb then raise exception 'Translated projection incorrect';end if;
 perform public.reader_vote_poll(pid,0);
 if public.public_list_polls('es',0)#>>'{items,0,ownChoice}' is distinct from '0' or public.public_list_polls('en',0)#>>'{items,0,ownChoice}' is distinct from '0' or public.reader_vote_poll(pid,0)->>'alreadyVoted'<>'true' then raise exception 'Vote not shared';end if;
 begin perform public.reader_vote_poll(pid,1);raise exception 'Conflicting second ballot accepted';exception when serialization_failure then null;end;
 perform public.staff_change_poll_translation(pid,4,current_setting('test.poll_translation_fp'),'save','{"question":"Nuevo borrador","options":["Sí","No"]}','Edit future wording draft');
 if public.public_list_polls('es',0)#>>'{items,0,question}' is distinct from 'Pregunta sintética' then raise exception 'Draft replaced published wording';end if;
end;$fn$;
reset role;
do $fn$begin
 if (select count(*) from newsroom_private.poll_votes)<>1 or (select count(*) from newsroom_private.polls)<>1 or (select count(*) from newsroom_private.poll_translation_events)<>5 then raise exception 'Duplicate ballot or missing audit';end if;
end;$fn$;
rollback;
select 'CT16 bilingual poll independent review, activation, shared ballot and draft isolation passed' as result;
