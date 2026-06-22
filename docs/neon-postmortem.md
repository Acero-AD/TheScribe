# Postmortem: How a Single-User Rails App Burned Through Neon's Free Compute

> Or: why "serverless, scale-to-zero Postgres" quietly billed me as if it never
> slept — and what Solid Queue had to do with it.

**Status:** Resolved — migrated off Neon to self-hosted Postgres on the existing
Hetzner VPS (Kamal accessory), June 2026.
**Impact:** Recurring database cost for an app with **one** user.
**Root cause:** A constantly-polling job queue (Solid Queue) sharing the primary
database kept Neon's compute endpoint awake ~24/7, defeating scale-to-zero — the
single feature that makes Neon cheap.

---

## TL;DR

Neon is cheap because it **suspends your compute when the database is idle** and
you only pay for the time it's awake. TheScribe runs Solid Queue, Solid Cache,
and Solid Cable **inside the same Postgres database**, and Solid Queue polls that
database **~11 times per second, forever**, plus a heartbeat and a once-a-minute
recurring job. The database was therefore *never idle for 5 minutes in a row*, so
it **almost never suspended**.

The result, measured straight from Neon's API:

| Metric (June billing period, ~18 active days) | Value |
| --- | --- |
| Compute **awake** time | **387 hours** (~21.5 h/day out of 24) |
| Compute consumed | **101 CU-hours** (~5.6 CU-hr/day) |
| Projected over 30 days | **~169 CU-hours/month** |
| Average compute size while awake | 0.26 CU (pinned to the 0.25 floor) |
| Stored data | ~35 MB |
| Human-driven traffic | ~0 |

Neon's Free plan includes roughly **191.9 compute-hours/month**. An app with one
user and 35 MB of data was consuming **~88% of the entire monthly allowance doing
nothing but polling itself.** The smallest amount of real activity tipped it over,
and the "credits" evaporated within days of each reset.

---

## Background: what makes Neon cheap

Neon separates storage from compute. The compute endpoint is a Postgres process
that Neon **auto-suspends after a period of inactivity** (default: 5 minutes) and
**auto-resumes on the next connection**. You're billed for **compute-hours**
(CU-hours = compute size × time awake), not for queries or rows.

For a hobby/single-user app this is supposed to be near-free: nobody's using it at
3 a.m., so the compute sleeps and the meter stops. The entire cost model assumes
**your database is idle most of the time.**

That assumption is the load-bearing wall. This postmortem is about how we knocked
it down without noticing.

---

## What we observed

Credits / the free compute allowance were being consumed "unexpectedly fast even
with a single user." That phrasing is the tell: cost was decoupled from usage.

Pulling the numbers directly from Neon (`neonctl` + the Neon REST API) for project
`TheScribe` (`floral-recipe-58235009`, `aws-eu-central-1`, PG 17, `free_v3` plan):

**Compute settings**
- Autoscaling: `min 0.25 CU → max 2 CU`
- `suspend_timeout_seconds: 0` → Neon's **default** 5-minute auto-suspend (i.e.
  scale-to-zero *was* enabled — it just never got a chance to fire).

**Consumption (current billing period, partial month)**
- `active_time_seconds: 1,394,230` → **387.3 hours awake**
- `compute_time_seconds: 364,470` → **101.2 CU-hours**
- Average CU while awake = 364,470 / 1,394,230 = **0.261 CU** (essentially idle
  CPU — it wasn't working hard, it was just *awake*)
- Storage: ~35 MB. Data transfer: ~2.3 GB.

**The damning detail — the operations log.** Neon records `start_compute` and
`suspend_compute` events. Between **2026-06-05 19:28 UTC** and **2026-06-17 04:48
UTC** there is **not a single `suspend_compute` event**:

```
2026-06-17T04:48:16Z  suspend_compute   finished
        ... ~11.5 days, zero suspends ...
2026-06-05T19:28:35Z  start_compute     finished
```

The compute ran **continuously for ~11.5 days** without ever sleeping. For a
single-user app, that endpoint should have suspended within 5 minutes of
inactivity and stayed asleep for the vast majority of every day. Instead it was
awake **21.5 hours out of every 24**.

Scale-to-zero wasn't broken. It was being actively prevented.

---

## Root cause: the database never got to be idle

TheScribe is a stock Rails 8 "Solid Trifecta" setup. From `config/database.yml`:

> Production uses a single database... **Solid Queue and Solid Cache share this
> primary database** — there are no separate cache/queue/cable databases.

And `config/deploy.yml` sets `SOLID_QUEUE_IN_PUMA: true`, so the Solid Queue
**supervisor runs inside the Puma web container**. The web container is always up
(that's the whole app), which means the queue machinery is *also* always up —
hammering the same database that Neon is trying to put to sleep.

Here's what that machinery does to the database, per `config/queue.yml`:

```yaml
dispatchers:
  - polling_interval: 1      # 1 query/second, forever
    batch_size: 500
workers:
  - queues: "*"
    threads: 3
    polling_interval: 0.1    # 10 queries/second, forever
```

So, with **zero** human traffic, the database receives, continuously:

- **~10 polls/second** from the worker (`polling_interval: 0.1`) — "any jobs ready?"
- **~1 poll/second** from the dispatcher (`polling_interval: 1`) — "any scheduled
  jobs due?"
- **Process heartbeats** (~every 60 s) writing to `solid_queue_processes`
- A **recurring job every single minute** (`config/recurring.yml`):
  ```yaml
  reminder_dispatcher:
    schedule: "* * * * *"     # enqueue + run, every minute
  ```
- An hourly `clear_finished_jobs` sweep, and whatever Solid Cache writes/expiry add.

That's a **floor of ~11 database queries every second, around the clock**, plus a
guaranteed write every minute. The longest the database can possibly stay idle is
a fraction of a second. Neon's 5-minute idle timer **resets ten times a second and
never counts down.**

The compute therefore behaves like an always-on Postgres server — which is exactly
the thing Neon's pricing is designed *not* to charge you for, and exactly the thing
it *does* charge you for once it can't suspend.

### Why the bill is what it is, in one line of math

A 0.25 CU compute awake 24/7 for a month is `0.25 × 24 × 30 = 180 CU-hours`.
Our measured run-rate was **~169 CU-hours/month**. The free allowance is **~191.9
CU-hours/month**. So the polling baseline alone eats **~88–94% of the monthly
allowance before a human touches the app.** There's no headroom left for the actual
product, and the "credits" disappear almost as fast as they reset.

---

## Contributing factors

1. **Defaults optimized for throughput, not for idleness.** Solid Queue's
   `polling_interval: 0.1` is a sensible default for an app that wants snappy job
   pickup on an always-on database. It's actively hostile to a scale-to-zero
   database. Nothing in the framework warns you about this interaction.
2. **The trifecta-on-one-database pattern.** Putting Queue + Cache + (Cable) in the
   primary DB is the recommended modern Rails setup and is great on a normal
   server. On serverless Postgres it converts background bookkeeping into a
   permanent keep-alive ping.
3. **The cost signal was invisible until the bill.** Polling produces no errors, no
   latency, no logs of interest. The only symptom is a billing meter, which you see
   *after* the month, not during it.
4. **A per-minute recurring job** guarantees that even if you tuned the pollers,
   you'd still wake the database 1,440 times a day.

---

## Resolution

Migrated production Postgres **off Neon** and onto the existing Hetzner VPS
(`46.225.164.186`) that already runs the backend, as a **Kamal accessory**
(`postgres:17-alpine`, container `backend-db`), reachable only over the internal
Docker network. Steps (see `openspec/changes/self-host-postgres`):

1. Added a 2 GB swapfile to the 3.7 GB / 0-swap box for headroom.
2. Booted the `db` accessory; added `POSTGRES_PASSWORD`.
3. One-time `pg_dump -Fc` (Neon) → `pg_restore` (accessory).
4. Repointed `DATABASE_URL` to `backend-db:5432`, redeployed, smoke-tested.
5. Left Neon connected-but-archived as a cold fallback during a grace period.

On a server you own, "the database is always awake" is **free** — it's just a
process on a box you're already paying for. The polling that was a liability on
Neon is a non-event on Hetzner. The recurring DB cost went to **$0**.

**Known trade-off (accepted):** self-hosting removes Neon's automatic backups and
point-in-time recovery. Nightly `pg_dump` → R2 is tracked as a follow-up
(`add-db-backups`) and must land before this is "done" operationally.

---

## Lessons / takeaways

- **Scale-to-zero Postgres and a polling job queue are fundamentally at odds.** If
  anything in your app touches the database on a sub-suspend-timeout interval, you
  are paying for an always-on database with serverless pricing — the worst of both
  worlds.
- **Neon's price is a function of *idle time*, not data size or user count.** 35 MB
  and one user meant nothing; what mattered was that the DB was awake 21.5 h/day.
- **Audit what pings your database at rest.** Before trusting scale-to-zero, run the
  app with no users and watch the `start_compute`/`suspend_compute` operations. If
  it doesn't suspend within minutes, find out what's poking it.
- **If you must keep Solid Queue on serverless Postgres**, your options are:
  increase `polling_interval` dramatically (seconds → tens of seconds, trading job
  latency for sleep), drop the per-minute recurring job, move Queue/Cache off the
  serverless DB, or run the queue on a separate always-on tier. None of these are
  free; all of them fight the framework defaults.
- **For a single-user app, a $X/month VPS you already run beats per-CU-hour
  serverless** the moment your workload has *any* always-on component. Serverless
  wins when idle is truly idle.

---

## Appendix: how the numbers were gathered

All figures pulled live from Neon (project `floral-recipe-58235009`):

```bash
# project compute settings + current-period consumption
neonctl projects get floral-recipe-58235009 --org-id <org> --output json
#   → active_time_seconds, compute_time_seconds, suspend_timeout_seconds,
#     autoscaling_limit_min_cu/max_cu, synthetic_storage_size

# suspend/start cadence (proof of continuous awake time)
curl -s "https://console.neon.tech/api/v2/projects/<id>/operations?limit=60" \
  -H "Authorization: Bearer <token>"
```

Derived values:
- Awake hours = `active_time_seconds / 3600` = 387.3 h
- CU-hours = `compute_time_seconds / 3600` = 101.2
- Avg CU while awake = `compute_time_seconds / active_time_seconds` = 0.26
- Run-rate = 101.2 CU-hr ÷ 18 active days × 30 = ~169 CU-hr/month

> Note: Neon's per-day/per-hour consumption *history* endpoint is gated to Scale
> plans, so the day-by-day curve isn't available on the free plan — but the
> period aggregates plus the operations log tell the story unambiguously.
