/**
 * Editorial guidance, NOT an Azure es-CO target or automatic substitution.
 * Spanish storage/routing remains es; locale-aware formatting is es-CO.
 */
export const COLOMBIAN_EDITORIAL_STANDARD={
 locale:'es-CO',providerLanguage:'es',register:'professional Colombian news Spanish',
 preferredTerms:[
  {english:'cell phone',preferred:'celular',note:'Prefer in general reporting.'},
  {english:'computer',preferred:'computador',note:'Use contextually; preserve official names.'},
  {english:'parking lot',preferred:'parqueadero',note:'Avoid Spain-specific aparcamiento in ordinary local copy.'},
  {english:'driver’s license',preferred:'licencia de conducción',note:'Prefer official Colombian terminology when reporting Colombian law.'},
  {english:'apartment',preferred:'apartamento',note:'Do not replace direct quotes or proper names.'},
  {english:'bus fare',preferred:'pasaje',note:'Distinguish the fare amount from the ticket.'}
 ],
 rules:['Preserve facts, names, direct quotations and attribution.','Use Colombian vocabulary in context, without forced slang.','Preserve currency denomination; never convert amounts automatically.','Use locale-aware date and number formatting only for structured values.','Send ambiguous terms and manually corrected translations for human review.']
} as const;
