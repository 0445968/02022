\set ON_ERROR_STOP on
\i tests/ct07c1-postgres-reports.sql
\i supabase/migrations/20261124211055_ct07c_reader_reports.sql
do $fn$ begin
 if has_table_privilege('authenticated','public.comment_reports','SELECT')
 or has_column_privilege('authenticated','public.comment_reports','reviewed_by','SELECT')
 or has_column_privilege('authenticated','public.comment_reports','reason','INSERT')
 or has_function_privilege('anon','public.reader_list_own_reports(integer)','EXECUTE')
 or has_function_privilege('anon','public.reader_submit_comment_report(uuid,uuid,timestamptz,text)','EXECUTE') then raise exception 'Raw report or anonymous privilege leaked';end if;
end; $fn$;
insert into public.comments(id,story_id,user_id,body,status) values
('41000000-0000-0000-0000-000000000020','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','New report target','published'),
('41000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','Own reader comment','published'),
('41000000-0000-0000-0000-000000000022','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','Hidden comment','hidden');
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$ declare r jsonb; v jsonb; t timestamptz; id uuid:='41000000-0000-0000-0000-000000000020'; sid uuid:='20000000-0000-0000-0000-000000000001';
begin
 select updated_at into t from public.comments where comments.id=id;
 begin perform public.reader_submit_comment_report(sid,id,t-interval '1 second','Stale displayed comment');raise exception 'Stale comment accepted';exception when serialization_failure then null;end;
 begin perform public.reader_submit_comment_report('20000000-0000-0000-0000-000000000002',id,t,'Wrong story target');raise exception 'Cross story report accepted';exception when insufficient_privilege then null;end;
 begin perform public.reader_submit_comment_report(sid,'41000000-0000-0000-0000-000000000021',t,'Own comment report');raise exception 'Own comment accepted';exception when insufficient_privilege then null;end;
 begin perform public.reader_submit_comment_report(sid,'41000000-0000-0000-0000-000000000022',t,'Hidden target report');raise exception 'Hidden comment accepted';exception when insufficient_privilege then null;end;
 r:=public.reader_submit_comment_report(sid,id,t,'Community guideline concern');
 if (r->>'alreadyReported')::boolean or r->'report'->>'status'<>'open' or r->'report'?'reviewedBy' or r->'report'?'reporterId' then raise exception 'Receipt invalid: %',r;end if;
 v:=public.reader_submit_comment_report(sid,id,t,'Different reason ignored on retry');
 if not (v->>'alreadyReported')::boolean or v->'report' is distinct from r->'report' then raise exception 'Duplicate not recovered';end if;
 v:=public.reader_list_own_reports(0);
 if not exists(select 1 from jsonb_array_elements(v->'items') x where x->>'id'=r->'report'->>'id') or exists(select 1 from jsonb_array_elements(v->'items') x where x->>'id'='42000000-0000-0000-0000-000000000011') then raise exception 'Own history invalid: %',v;end if;
end; $fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare v jsonb;begin
 v:=public.reader_list_own_reports(0);
 if exists(select 1 from jsonb_array_elements(v->'items') x where x->>'commentId'='41000000-0000-0000-0000-000000000020') then raise exception 'Cross reader report leaked';end if;
 perform public.staff_change_comment_moderation('41000000-0000-0000-0000-000000000020',1,'hide','Moderate reader reported comment',gen_random_uuid());
end; $fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$ declare r jsonb;begin
 r:=public.reader_submit_comment_report('20000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000020',now(),'Retry after comment hidden');
 if not (r->>'alreadyReported')::boolean then raise exception 'Existing report recovery lost';end if;
end; $fn$;
rollback;
begin;
update auth.users set is_anonymous=true where id='00000000-0000-0000-0000-000000000005';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$ begin
 begin perform public.reader_list_own_reports(0);raise exception 'Anonymous identity saw reports';exception when insufficient_privilege then null;end;
 begin perform public.reader_submit_comment_report('20000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000020',now(),'Anonymous submission');raise exception 'Anonymous identity submitted';exception when insufficient_privilege then null;end;
end; $fn$;
rollback;
select 'CT-07c.2b verified own reader reports, stale/hidden/own denial, duplicate recovery and raw privacy passed' as result;
