-- Executed ONLY after baseline rehearsal and CLI-generated candidate on disposable PG.
begin;
do $fn$
declare sid uuid; before_hash text; after_hash text;
begin
 if exists(select 1 from public.stories where story_type<>'news_report') or exists(select 1 from public.story_revisions where story_type<>'news_report') or exists(select 1 from public.story_versions where story_type<>'news_report') then raise exception 'Legacy default mismatch';end if;
 select id into strict sid from public.stories where slug='ct15-draft';
 before_hash:=newsroom_private.review_snapshot(sid,'draft')->>'fingerprint';
 update public.stories set story_type='analysis' where id=sid;
 after_hash:=newsroom_private.review_snapshot(sid,'draft')->>'fingerprint';
 if before_hash is null or after_hash is null or before_hash=after_hash then raise exception 'Review fingerprint did not include story type';end if;
 begin update public.stories set story_type='made_up' where id=sid;raise exception 'Invalid type accepted';exception when check_violation then null;end;
 begin update public.stories set story_type=null where id=sid;raise exception 'Null type accepted';exception when not_null_violation then null;end;
 if (select story_type from public.stories where id=sid)<>'analysis' then raise exception 'Valid type was not saved';end if;
end;
$fn$;
rollback;
select 'CT16 story type candidate schema and review fingerprint checks passed' as result;
