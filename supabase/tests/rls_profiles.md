# RLS policy smoke tests (PR1)

Run after migration + seed on a non-prod project.

## Setup

1. Create three auth users: Developer, Admin, User (INVITED then ACTIVE).
2. Developer profile: `role=DEVELOPER`, `status=ACTIVE`, `owner_id=null`.
3. Admin: `role=ADMIN`, `owner_id=<developer id>`.
4. User: after PR2 customer exists; for PR1 skip User customer_id tests if blocked by constraint.

## Cases

| # | Actor | Action | Expect |
|---|-------|--------|--------|
| 1 | Developer | `select * from profiles` | Sees self + staff-scoped profiles |
| 2 | Admin | `select * from profiles where id = developer` | Allowed (same owner root) |
| 3 | Anon | `select * from profiles` | Empty / denied |
| 4 | Developer JWT | `update profiles set role='ADMIN' where id=self` | Should be blocked in app; DB policy still allows self-update — **service must strip role** (app layer) |
| 5 | Second Developer insert ACTIVE | Unique index `profiles_one_active_developer` | Fail |

## App-layer notes

- Role/status changes only via service-role Server Actions (PR6).
- PR1 login rejects non-ACTIVE.
