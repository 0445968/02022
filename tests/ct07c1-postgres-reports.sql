\set ON_ERROR_STOP on
\i tests/ct07a-postgres-moderation.sql
\i supabase/migrations/20261124201656_ct07c_audited_reports.sql
-- Legacy report remains explicitly unversioned.
do $fn$ begin
 if (select reported_comment_revision from public.comment_reports where id='42000000-0000-0000-0000-000000000001') is not null then raise exception 'Legacy revision fabricated';end if;
 if has_table_privilege('authenticated','newsroom_private.comment_report_events','INSERT') or has_function_privilege('anon','public.staff_resolve_comment_report(uuid,integer,integer,text,text,uuid,uuid)','EXECUTE') then raise exception 'Report audit privilege leaked';end if;
end; $fn$;
insert into public.comments(id,story_id,user_id,body,status) values
('41000000-0000-0000-0000-000000000010','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','Report target for verified hide','published');
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
insert into public.comment_reports(id,comment_id,reporter_id,reason,reported_comment_revision,review_revision)
values('42000000-0000-0000-0000-000000000010','41000000-0000-0000-0000-000000000010',auth.uid(),'Target for verified action',999,999);
do $fn$ begin
 if not exists(select 1 from public.comment_reports where id='42000000-0000-0000-0000-000000000010' and reported_comment_revision=1 and review_revision=1) then raise exception 'Actual revision not captured';end if;
 begin perform public.staff_read_report_queue('all',null,0);raise exception 'Reader saw staff reports';exception when insufficient_privilege then null;end;
end; $fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare r jsonb; v jsonb; e uuid; id uuid:='42000000-0000-0000-0000-000000000010';
begin
 if exists(select 1 from public.comment_reports where comment_reports.id='42000000-0000-0000-0000-000000000010' and reporter_id<>auth.uid()) then raise exception 'Raw reporter identity exposed';end if;
 r:=public.staff_read_report_detail(id);
 if r->'report'?'reporterId' or r->'report'?'reviewedBy' or r->'report'->>'reportedRevision'<>'1' then raise exception 'Report projection wrong';end if;
 begin perform public.staff_resolve_comment_report(id,1,1,'actioned','Unlinked action not allowed',gen_random_uuid(),gen_random_uuid());raise exception 'False actioned accepted';exception when serialization_failure then null;end;
 r:=public.staff_resolve_comment_report(id,1,1,'reviewed','Investigating reported comment',null,'85000000-0000-0000-0000-000000000001');
 if r->'report'->>'status'<>'reviewed' or r->'report'->>'revision'<>'2' then raise exception 'Review transition failed';end if;
 v:=public.staff_change_comment_moderation('41000000-0000-0000-0000-000000000010',1,'hide','Hide reported comment for policy violation',gen_random_uuid());
 e:=(v->'history'->0->>'id')::uuid;
 begin perform public.staff_resolve_comment_report(id,2,1,'actioned','Stale comment version attempt',e,gen_random_uuid());raise exception 'Stale report decision accepted';exception when serialization_failure then null;end;
 r:=public.staff_resolve_comment_report(id,2,2,'actioned','Report resolved by audited hide',e,'85000000-0000-0000-0000-000000000002');
 if r->'report'->>'status'<>'actioned' or r->'history'->0->>'actionEventId'<>e::text or jsonb_array_length(r->'history')<>2 then raise exception 'Action linkage failed';end if;
 begin perform public.staff_resolve_comment_report(id,3,2,'dismissed','Terminal report cannot change',null,gen_random_uuid());raise exception 'Terminal report changed';exception when serialization_failure then null;end;
 r:=public.staff_resolve_comment_report('42000000-0000-0000-0000-000000000001',1,1,'dismissed','Legacy report investigated and dismissed',null,gen_random_uuid());
 if r->'report'->>'status'<>'dismissed' then raise exception 'Dismiss failed';end if;
end; $fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$ begin
 if not exists(select 1 from public.comment_reports where id='42000000-0000-0000-0000-000000000010' and status='actioned') then raise exception 'Reader own report status lost';end if;
end; $fn$;
rollback;
-- Scope denial and own-report conflict.
insert into public.comments(id,story_id,user_id,body,status) values
('41000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','Second public target','published');
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
insert into public.comment_reports(id,comment_id,reporter_id,reason)
values('42000000-0000-0000-0000-000000000011','41000000-0000-0000-0000-000000000011',auth.uid(),'Own staff report');
do $fn$ begin
 if (public.staff_read_report_detail('42000000-0000-0000-0000-000000000011')->'report'->>'canResolve')::boolean then raise exception 'Own report marked actionable';end if;
 begin perform public.staff_resolve_comment_report('42000000-0000-0000-0000-000000000011',1,1,'dismissed','Attempt own report resolution',null,gen_random_uuid());raise exception 'Own report resolved';exception when insufficient_privilege then null;end;
end; $fn$;
commit;
begin;
insert into public.staff_capability_overrides(membership_id,capability_key,effect,scope,reason,granted_by)
values('10000000-0000-0000-0000-000000000002','comment.manage_reports','deny','all','Remove report management permission','00000000-0000-0000-0000-000000000001');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ begin
 if jsonb_array_length(public.staff_read_report_queue('all',null,0)->'items')<>0 then raise exception 'Denied queue access';end if;
 begin perform public.staff_read_report_detail('42000000-0000-0000-0000-000000000010');raise exception 'Denied detail access';exception when insufficient_privilege then null;end;
end; $fn$;
rollback;
select 'CT-07c.1 private reporter projection, version capture, audited report transitions and linked moderation action passed' as result;
