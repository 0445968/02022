\set ON_ERROR_STOP on
\i tests/ct07c2b-postgres-reader-reports.sql
\i supabase/migrations/20261124214830_ct07d_bulk_moderation.sql
do $fn$ begin
 if has_function_privilege('anon','public.staff_bulk_comment_moderation(text,text,jsonb)','EXECUTE')
 or has_function_privilege('service_role','public.staff_bulk_comment_moderation(text,text,jsonb)','EXECUTE') then raise exception 'Bulk privilege leak';end if;
end; $fn$;
insert into public.comments(id,story_id,user_id,body,status) values
('41000000-0000-0000-0000-000000000030','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','Bulk comment A','pending'),
('41000000-0000-0000-0000-000000000031','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','Bulk comment B','pending'),
('41000000-0000-0000-0000-000000000032','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Staff own comment','pending');
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare a uuid:='41000000-0000-0000-0000-000000000030'; b uuid:='41000000-0000-0000-0000-000000000031'; own_id uuid:='41000000-0000-0000-0000-000000000032';
 item jsonb; other jsonb; r jsonb; v jsonb;
begin
 item:=jsonb_build_object('commentId',a,'revision',1,'commandId','86000000-0000-0000-0000-000000000001');
 other:=jsonb_build_object('commentId',b,'revision',1,'commandId','86000000-0000-0000-0000-000000000002');
 begin perform public.staff_bulk_comment_moderation('approve','Approve matching community comments',jsonb_build_array(item,other||'{"revision":2}'::jsonb));
 raise exception 'Stale batch succeeded';exception when serialization_failure then null;end;
 v:=public.staff_read_comment_detail(a);
 if v->'comment'->>'status'<>'pending' or jsonb_array_length(v->'history')<>0 then raise exception 'Partial update or audit leaked';end if;
 begin perform public.staff_bulk_comment_moderation('approve','Approve matching community comments',jsonb_build_array(item,other||jsonb_build_object('commentId',own_id)));
 raise exception 'Own comment batch succeeded';exception when insufficient_privilege then null;end;
 v:=public.staff_read_comment_detail(a);
 if v->'comment'->>'revision'<>'1' or jsonb_array_length(v->'history')<>0 then raise exception 'Denied batch changed first row';end if;
 begin perform public.staff_bulk_comment_moderation('approve','Approve matching community comments',jsonb_build_array(item,item));
 raise exception 'Duplicate batch succeeded';exception when invalid_parameter_value then null;end;
 begin perform public.staff_bulk_comment_moderation('approve','Approve matching community comments',jsonb_build_array(item||'{"actorId":"spoof"}'::jsonb));
 raise exception 'Injected field accepted';exception when invalid_parameter_value then null;end;
 begin perform public.staff_bulk_comment_moderation('approve','Approve matching community comments',(select jsonb_agg(item) from generate_series(1,21)));
 raise exception 'Oversized batch succeeded';exception when invalid_parameter_value then null;end;
 r:=public.staff_bulk_comment_moderation('approve','Approve matching community comments',jsonb_build_array(other,item));
 if r->>'changed'<>'2' then raise exception 'Valid batch failed';end if;
 v:=public.staff_read_comment_detail(a);
 if v->'comment'->>'status'<>'published' or v->'comment'->>'revision'<>'2' or jsonb_array_length(v->'history')<>1 then raise exception 'Audit or publication failed';end if;
 begin perform public.staff_bulk_comment_moderation('hide','Replay used command must fail',jsonb_build_array(item||'{"revision":2}'::jsonb,other||'{"revision":2}'::jsonb));
 raise exception 'Command replay succeeded';exception when serialization_failure then null;end;
end; $fn$;
commit;
begin;
set local role anon;
do $fn$ begin
 if (select count(*) from public.comments where id in ('41000000-0000-0000-0000-000000000030','41000000-0000-0000-0000-000000000031'))<>2 then raise exception 'Approved batch not public';end if;
end; $fn$;
rollback;
-- Reader reports the exact approved revision before the bulk hide.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$ declare t timestamptz; v jsonb;begin
 select updated_at into t from public.comments where id='41000000-0000-0000-0000-000000000030';
 v:=public.reader_submit_comment_report('20000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000030',t,'Report exact published comment version');
 if v->'report'->>'status'<>'open' then raise exception 'Reader report failed';end if;
end; $fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare items jsonb; r jsonb;begin
 select jsonb_agg(jsonb_build_object('commentId',id,'revision',2,'commandId',gen_random_uuid())) into items from public.comments where id in ('41000000-0000-0000-0000-000000000030','41000000-0000-0000-0000-000000000031');
 r:=public.staff_bulk_comment_moderation('hide','Temporarily hide selected comments',items);
 if r->>'changed'<>'2' then raise exception 'Bulk hide failed';end if;
end; $fn$;
commit;
begin;
set local role anon;
do $fn$ begin if exists(select 1 from public.comments where id in ('41000000-0000-0000-0000-000000000030','41000000-0000-0000-0000-000000000031')) then raise exception 'Hidden bulk comments public';end if;end; $fn$;
rollback;
do $fn$ begin
 if (select count(*) from newsroom_private.comment_moderation_events where comment_id in ('41000000-0000-0000-0000-000000000030','41000000-0000-0000-0000-000000000031'))<>4 then raise exception 'Missing individual audit events';end if;
 if (select body from public.comments where id='41000000-0000-0000-0000-000000000030')<>'Bulk comment A' then raise exception 'Hide redacted text';end if;
end; $fn$;
select 'CT-07d atomic moderation, per-item audit, stale/self/replay denial and public visibility passed' as result;

-- A bulk moderation event is valid evidence for independent report resolution.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare r jsonb; rid uuid; eid uuid; items jsonb;begin
 select (x->>'id')::uuid into rid from jsonb_array_elements(public.staff_read_report_queue('open',null,0)->'items') x
 where x->>'commentId'='41000000-0000-0000-0000-000000000030';
 r:=public.staff_read_report_detail(rid);
 eid:=(r->'report'->>'actionEventId')::uuid;
 if eid is null or r->'report'->>'reportedRevision'<>'2' or r->'report'->>'commentRevision'<>'3' then raise exception 'Bulk hide evidence missing';end if;
 r:=public.staff_resolve_comment_report(rid,1,3,'actioned','Report resolved by audited bulk hide',eid,gen_random_uuid());
 if r->'report'->>'status'<>'actioned' then raise exception 'Report resolution failed';end if;
 select jsonb_agg(jsonb_build_object('commentId',id,'revision',3,'commandId',gen_random_uuid())) into items from public.comments where id in ('41000000-0000-0000-0000-000000000030','41000000-0000-0000-0000-000000000031');
 perform public.staff_bulk_comment_moderation('restore','Return both comments for fresh review',items);
 if (select count(*) from public.comments where id in ('41000000-0000-0000-0000-000000000030','41000000-0000-0000-0000-000000000031') and status='pending' and moderation_revision=4)<>2 then raise exception 'Restore did not require review';end if;
 select jsonb_agg(jsonb_build_object('commentId',id,'revision',4,'commandId',gen_random_uuid())) into items from public.comments where id in ('41000000-0000-0000-0000-000000000030','41000000-0000-0000-0000-000000000031');
 perform public.staff_bulk_comment_moderation('remove','Permanently redact both selected comments',items);
 if (select count(*) from public.comments where id in ('41000000-0000-0000-0000-000000000030','41000000-0000-0000-0000-000000000031') and status='deleted' and body='[deleted]' and moderation_revision=5)<>2 then raise exception 'Bulk redaction failed';end if;
end; $fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$ begin
 if not exists(select 1 from jsonb_array_elements(public.reader_list_own_reports(0)->'items') x where x->>'commentId'='41000000-0000-0000-0000-000000000030' and x->>'status'='actioned') then raise exception 'Reader did not retain report resolution';end if;
 if not exists(select 1 from public.comments where id='41000000-0000-0000-0000-000000000031' and status='deleted' and body='[deleted]') then raise exception 'Reader lost own removal record';end if;
end; $fn$;
rollback;
select 'CT-07d linked report action, fresh review restoration, irreversible redaction and reader history passed' as result;
