/**
 * CT-02i: private media drafts require BOTH a completed staff-permission
 * rollout and explicit draft-mode activation. Neither flag is enabled live.
 */
export function privateDraftMediaEnabled(): boolean {
  return process.env.CT_STAFF_ACCESS_V2_ENABLED === 'true'
    && process.env.CT_MEDIA_PRIVATE_DRAFTS_ENABLED === 'true';
}
