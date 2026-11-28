import test from 'node:test';import assert from 'node:assert/strict';
import {parseTerminologyCommand,parseTerminologyState} from '../lib/permissions/translation-terminology-contract.ts';
const entry={term:'Clear Talks',preferred:'Clear Talks',kind:'protected',note:'Brand'};
test('strict owner glossary command contract',()=>{const base={expectedRevision:0,entries:[entry],reason:'Set protected brand names'};assert.deepEqual(parseTerminologyCommand(base),base);for(const patch of [{entries:[entry,entry]},{entries:[{...entry,preferred:'Changed'}]},{expectedRevision:-1},{reason:'short'},{actor:'spoof'}])assert.throws(()=>parseTerminologyCommand({...base,...patch}));assert.deepEqual(parseTerminologyState({revision:1,entries:[entry]}),{revision:1,entries:[entry]});});
