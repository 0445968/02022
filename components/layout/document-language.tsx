'use client';
import {useEffect} from 'react';
import type {Locale} from '@/types';

/** Root layouts persist during client navigation; synchronize the actual
 * page or signed-in workspace language without touching any visual styles. */
export function DocumentLanguage({locale}:{locale:Locale}){
 useEffect(()=>{document.documentElement.lang=locale;},[locale]);
 return null;
}
