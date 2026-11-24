-- CT-07d STAGED ONLY. CLI #45494707195.
-- One transaction; reuse existing single-action authorization and audit.
begin;
create function public.staff_bulk_comment_moderation(p_action text,p_reason text,p_items jsonb)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare entry jsonb; ids uuid[]:='{}'; commands uuid[]:='{}'; cid uuid; cmd uuid; rev integer; n integer:=0;
begin
 if (select auth.uid()) is null then raise exception 'Moderation unavailable' using errcode='42501';end if;
 if p_action is null or p_action not in ('approve','hide','restore','remove') or p_reason is null
 or char_length(btrim(p_reason)) not between 12 and 1000 or p_reason~'[[:cntrl:]]'
 or p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Invalid batch' using errcode='22023';end if;
 if jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Invalid batch size' using errcode='22023';end if;
 for entry in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(entry)<>'object' then raise exception 'Invalid batch item' using errcode='22023';end if;
  if (select count(*) from jsonb_object_keys(entry))<>3
   or not coalesce(jsonb_typeof(entry->'commentId')='string' and (entry->>'commentId')~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',false)
   or not coalesce(jsonb_typeof(entry->'commandId')='string' and (entry->>'commandId')~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',false)
   or not coalesce(jsonb_typeof(entry->'revision')='number' and (entry->>'revision')~'^[1-9][0-9]{0,9}$',false)
   then raise exception 'Invalid batch item' using errcode='22023';end if;
  if (entry->>'revision')::bigint>2147483647 then raise exception 'Invalid revision' using errcode='22023';end if;
  cid:=(entry->>'commentId')::uuid;cmd:=(entry->>'commandId')::uuid;
  if cid=any(ids) or cmd=any(commands) then raise exception 'Duplicate batch entry' using errcode='22023';end if;
  ids:=array_append(ids,cid);commands:=array_append(commands,cmd);
 end loop;
 -- Existing routine locks staff state, parent and comment; acquiring the
 -- shared lock once first serializes permission changes across the batch.
 perform pg_advisory_xact_lock(202611,2302);
 for entry in select value from jsonb_array_elements(p_items) order by (value->>'commentId')::uuid loop
  cid:=(entry->>'commentId')::uuid;rev:=(entry->>'revision')::integer;cmd:=(entry->>'commandId')::uuid;
  perform public.staff_change_comment_moderation(cid,rev,p_action,p_reason,cmd);
  n:=n+1;
 end loop;
 -- No exception catch: every change and individual audit event rolls back on
 -- any denied/stale/invalid item. No bulk result includes private content.
 return jsonb_build_object('changed',n);
end;
$fn$;
revoke all on function public.staff_bulk_comment_moderation(text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.staff_bulk_comment_moderation(text,text,jsonb) to authenticated;
commit;
