# Permissions and privacy changes

- Students and core members retain own-profile and DP editing. Profile contact email edits do not change verified login ownership or roles.
- Core members can read contacts and Meet responses for every batch; they cannot approve, reject, or delete other members' gallery uploads or manage roles/profiles.
- Public batch/export responses use an explicit field allowlist. Email, phone, address, postcode, DOB, and unknown imported fields are excluded. This does not redact contact information a member voluntarily types inside public biography/memories text.
- Public `/api/meet/names` responses now contain `id`, `name`, `batch`; `email` has been removed. Clients must not use public email hints for account selection/claiming.
- New Meet registrants get a pending directory profile while their event answers are saved. Knowing a name and batch cannot claim an imported record. An exact verified account-email match remains supported for unclaimed records.
- Admins verify identity before approving or explicitly merging a pending signup into the correct imported record. Member ownership and linked Meet registration IDs are updated in one database batch.
- Session/role permissions are rechecked on protected requests; removed core privileges take effect on the next request.

## Compatibility and release checks

No schema migration is required by these fixes, but the actual production schema still needs inspection before deployment. Test the merge on a staging copy with actual foreign keys/triggers before release.

Existing Blogspot/React clients that depend on email fields or the `{ unchanged: true }` shortcut must be updated. Batch responses now always send sanitized entries. The Worker cache uses a new privacy-version key; old responses already stored by browsers/CDNs are not retroactively erased. At deployment, clear relevant external caches and discard old frontend-local directory payloads; the old HTTP cache lifetime was 60 seconds. No deployed data or external caches have been changed here.

Tests use synthetic verified-session fixtures, not real Google credentials. Real Google login, production inventory, and deployment remain pending. Future gallery publication changes are separate from this permission milestone.
