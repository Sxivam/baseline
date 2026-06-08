# Baseline — Comprehensive Product Metrics Report

> Definitions, Baseline-specific interpretations, and concrete improvement levers for every metric on the product-analytics surface. Written against the actual app architecture (routes, events, LLM calls, email pipeline, marketplace, plan engine, severity logic). No surface-level "improve your funnel" guidance.

---

## 0. Orientation

**Product in one paragraph.** Baseline turns a one-time blood report into an ongoing, nudged habit. A first-time user arrives on `/` and chooses one of two CTAs: book a panel via `/tests` or upload a report at `/upload`. The PDF is parsed by an LLM via OpenRouter. The parsed markers feed `/intake` (adaptive diagnostic), which feeds `/plan` (4-week curated plan with progressive weekly unlock + accountability email capture). After commit, `/dashboard` is home: feeling-first hero, checkable moves, forecast, nudge tile, and the actual email that fires on the scheduled date. The loop closes on screen.

**The loop:** `Test → Baseline (AI) → Plan → Forecast → Nudge & re-test → Test`.

**The North Star:** **First re-tests landed** by month three. Not signups, not parses. The re-test event is the only thing that proves the loop is working at unit-economic scale.

**Today's funnel snapshot (post-launch, the path to instrument):**

```
Landing /            visit
   │
   ├─► Profile  /start             (profile_created)
   │      │
   │      ├─► Marketplace /tests   (panel_viewed → panel_clicked_out)
   │      │
   │      └─► Upload /upload       (parse_started → parse_success | parse_fallback)
   │             │
   │             ├─► Intake /intake (intake_completed)
   │             │
   │             └─► Plan /plan    (plan_generated → email_captured → plan_committed)
   │                    │
   │                    └─► Dashboard /dashboard (week_active, move_completed, reflection_logged)
   │                            │
   │                            └─► Forecast /forecast/* (forecast_viewed)
   │                                   │
   │                                   └─► Nudge email fires (nudge_sent → nudge_opened → nudge_cta_clicked)
   │                                          │
   │                                          └─► RE-TEST (the loop closes)
```

The events above are the bare minimum. Each metric in this report ties back to one or more of them.

---

## A. Acquisition

A creator-led D2C wedge. 85K Instagram followers, 40% match the ICP. The first-touch acquisition story is content: the 3-reel arc, the personal story, the "link in bio." Paid sits on top of organic later.

### Customer Acquisition Cost (CAC)

**Definition.** Total acquisition spend divided by new customers acquired in a window.

**Baseline interpretation.** Today CAC is effectively zero — distribution is the creator's own audience. The metric only becomes meaningful when (a) we start paying to acquire on Meta/Google, or (b) we attribute "creator post" cost as an opportunity cost. The honest framing: blended CAC (₹ spent / paying users gained) versus channel CAC.

**Levers to move it.**
1. Compute organic CAC even when free: time invested on a reel × creator hourly rate ÷ acquired users. Forces the team to value reach honestly.
2. Once paid is on, tier CAC by panel size. Booking a "pizza-priced" test is high-volume / low-AOV; a full-body baseline justifies more spend per acquired user.
3. The share-mechanic referral is the CAC reducer. Build the "share my baseline" card properly and track viral coefficient — every share that converts cuts blended CAC.
4. Segment CAC by feeling-bucket entry (low mood, tired, energy crashes, heart, full body). The "low mood" bucket likely has the cheapest conversion because of the emotional weight; the "heart" bucket has the highest LTV.
5. Don't average CAC across cold and warm channels. Email referrals (warm) versus paid Meta (cold) have wildly different unit economics; the average hides the real picture.

**Watch out for.** Counting "people who downloaded my reel" as acquired customers. Acquisition starts at `profile_created`, not at follow.

---

### Cost per Acquisition (CPA)

**Definition.** Cost per a specific conversion event, not necessarily a paying customer. Often used for top-of-funnel events.

**Baseline interpretation.** Useful at granular conversion points: cost per parse, cost per first plan, cost per re-test. Each of these is a different number with a different acceptable threshold.

**Levers.**
1. Define the CPA event by funnel stage. Top: `profile_created`. Middle: `plan_committed`. Bottom: `first_retest_completed`. Track all three.
2. Compare paid CPA to organic CPA per stage. If paid CPA at `parse_success` is 4× the organic, the creative is wrong, not the channel.
3. Lower CPA at parse by reducing /upload friction — bigger drop target, sample-data sticky button, manual entry above the fold for low-bandwidth users.
4. Lower CPA at plan commit by pre-filling the email from a captured profile (cookie or localStorage), and by celebrating the commit with confetti or a haptic-like motion to reinforce the moment.

---

### Return on Ad Spend (ROAS)

**Definition.** Revenue generated per rupee of ad spend, expressed as a ratio.

**Baseline interpretation.** For us, "revenue" is marketplace commission per booking (~₹300 per booking). ROAS for a campaign that drove 100 panel bookings at ₹50 CAC each = ₹30,000 / ₹5,000 = 6x. Anything under 2-3x in this category is bleeding.

**Levers.**
1. Time-window ROAS honestly: cap LTV inclusion at 90 days for early-stage. Lifetime ROAS sounds great but takes 12+ months to verify.
2. Bid down on channels where ROAS is <2x. Bid up where it's >5x.
3. Pair ROAS with payback period. A 4x ROAS with 14-day payback is a different business than 4x at 9 months.
4. Run a "no-paid-spend" weekly cohort as control. If organic-only ROAS is infinity, paid only adds value if its incremental ROAS clears the threshold against the organic baseline.

---

### Channel Attribution / Multichannel Attribution / Conversion Attribution / Attribution Modeling / Revenue Attribution

**Definition.** Models that assign credit for a conversion across multiple touchpoints in the user journey. Common shapes: last-click, first-click, linear, time-decay, U-shaped, data-driven.

**Baseline interpretation.** Most users will see a reel, follow on Instagram, get a DM nudge, click bio link, land on `/`, bounce, return via Google search a week later, then convert. Last-click would credit Google. First-click would credit the reel. Both lie alone.

**Levers.**
1. **Default to position-based (40-20-40)** until enough volume to justify a data-driven model. First touch gets 40% (the reel surfaced the brand), last touch gets 40% (the search closed it), middle touches share 20%.
2. **UTM discipline.** Every link from any post, story, DM, partner content gets utm_source/medium/campaign. Without this, attribution is fantasy.
3. **Capture referrer at landing.** Store first-touch source + medium in localStorage on `/`. Pass to `plan_committed` event. Use for cohort analysis.
4. **Use Reddit's "self-reported attribution" pattern.** Ask the user at intake or post-commit: "Where did you first hear about Baseline?" Free-text. Compare answers to your UTM data. The gap teaches you which channels you under-credit.
5. **Revenue attribution by channel:** track which channel drove the parse, the first commit, AND the first re-test. The channel that drives re-tests is the channel that drives the business.

---

### Traffic Sources

**Definition.** The breakdown of where landing-page visits originate.

**Baseline interpretation.** Today: ~95% Instagram bio link, ~5% direct/word-of-mouth. Diversification is a Q2 goal, not Q1. Concentrate on the wedge first.

**Levers.**
1. Distinguish IG bio-link, IG story-swipe-up, IG DM, IG comment-CTA. Each is a different intent signal. Bio-link users browse; story-swipe-up users buy.
2. Layer in Google search once organic SEO compounds (Q2). Target queries like "vitamin D test bangalore", "is 1mg or pharmaeasy cheaper".
3. WhatsApp shares are invisible to default analytics (dark social). Treat any direct/no-referrer traffic spike correlated with a creator post as IG dark social, not "organic".
4. Track which posts drive which traffic. A reel that drove 2K visits but no conversions is a brand reel; a reel that drove 800 visits and 60 commits is a conversion reel. Make more of the second.

---

### Marketing Qualified Lead (MQL) / Sales Qualified Lead (SQL)

**Definition.** MQL: a user who's shown enough intent to be worth marketing nurture. SQL: a user who's qualified enough to hand to sales.

**Baseline interpretation.** No sales team. MQL = "completed /start", SQL = "uploaded a report or clicked a panel". The framework still helps for nurture sequencing.

**Levers.**
1. **MQL nurture:** users at MQL state (profile_created but no parse) get an email 24 hours later. "Still curious? Three things people usually want to check first." Soft, never urgent.
2. **SQL re-engagement:** users at SQL (panel_clicked_out) get a 48-hour follow-up email asking if they booked, with a fallback "use sample data" link to keep them in the loop.
3. **Source-tag MQLs for content learning.** If 70% of MQLs come from one reel but only 20% of SQLs do, the reel attracts curious browsers, not committers.

---

### Go-to-Market (GTM) Strategy

**Definition.** The plan for how a product reaches its first users.

**Baseline interpretation.** Creator-led, wedge-first, India-first. The plan is on the story page. The strategy is: prove the loop on 500 real users via the creator audience, then unlock the share mechanic, then expand to broader urban India through paid + SEO.

**Levers.**
1. **Wedge-first discipline.** Refuse to broaden the ICP until the creator audience's metrics stabilize. The temptation to "try paid Meta on day 1" is real and almost always wrong.
2. **Wedge-second sequencing.** Once stable, expand into adjacent creator partnerships (fitness coaches, doctors with audiences) before broad paid.
3. **A separate GTM for the marketplace booking.** That's a transactional flow, not a content flow. Different KPIs, different channels.
4. **GTM for re-tests is different from GTM for first tests.** Re-test acquisition is owned by the nudge cron + the dashboard re-engagement loop, not the creator content.

---

### Bounce Rate

**Definition.** Single-page sessions divided by total sessions.

**Baseline interpretation.** The landing page bounce is a key creative signal. If 70% of reel-driven visits bounce, the reel sold a different product than the landing delivers.

**Levers.**
1. **Match the hook on the landing to the hook on the reel.** If the reel's last line was "I was deficient in D at 24", the landing needs to echo that exact framing in the first 1.5 seconds of scroll.
2. **A/B test the hero copy.** "Don't wait for a health scare" versus "I was healthy on the outside" versus a literal user quote. Measure bounce on each.
3. **Reduce bounce by moving the CTA into the first viewport.** Today the two CTAs sit below the hero. On mobile they're below the fold. Float them.
4. **Bounce-rate by source.** IG bio-link bouncers are different from Google-search bouncers. Treat them as separate cohorts and ship different fixes.

---

## B. Activation, Onboarding & Funnel

### Activation Rate

**Definition.** % of new users who reach a defined "aha" moment within a defined window.

**Baseline interpretation.** Three reasonable activation definitions:
- **Soft:** % of profiles created that complete `parse_success` or manual entry.
- **Medium:** % that reach `/dashboard` with at least one marker rendered.
- **Hard:** % that commit a plan with email captured (`plan_committed`).

The hard definition is closest to the North Star. Choose ONE and stick to it.

**Levers.**
1. **Default to "hard" activation.** Plan_committed is the moment the loop actually starts; anything before is window-shopping.
2. **Reduce friction at the worst funnel step.** Today that's the `/upload` parse step (because of the OpenRouter dependency). Three fallbacks already exist (LLM → manual → demo); make the demo path one-tap-prominent, not a fallback.
3. **Make /intake feel under-90-seconds.** Sticky CTA, progress bar, smart question ordering (easy ones first).
4. **Auto-fill the accountability email** from any browser autofill hint. Saves a typing step at the moment of highest intent.
5. **Celebrate the activation moment.** The "I'm in" button on `/plan` should land with motion (a satisfying confirm). The reward shapes recall.

**Watch out for.** Soft activation rates climb when you remove gates. Don't confuse "reduced friction" with "improved product."

---

### Adoption Rate

**Definition.** % of users who use a specific feature or capability.

**Baseline interpretation.** Per-feature: marketplace, manual entry, intake, plan, forecast detail, move check-off, end-of-week reflection. Each is a separate adoption number.

**Levers per feature.**
- **Marketplace adoption (first-timers):** the intent-first filters are the lever. Track click-through on each concern card; if "Full body" dominates, surface it; if "Low mood" dominates, lead with it on the landing.
- **Manual entry:** today it's a tab; making it a peer to upload (not a fallback) raises adoption for low-trust users.
- **Plan reveal completion:** the progressive unlock is built for this. Track unlock_count per session.
- **Move check-off:** the dashboard feedback loop. If <30% of active users check off any move, the plan reads as content, not a tool. Add a one-tap "set me a reminder" per move.
- **Forecast detail:** if <15% click into the forecast, the dashboard preview is satisfying enough, which is fine. But if forecast detail drives re-test booking, push harder on the CTA.

---

### Feature Adoption

**Definition.** Adoption rate scoped to product features.

**Baseline interpretation.** See Adoption Rate above; same instrumentation. The distinction is granularity: feature adoption is measured per UI element or capability, adoption rate can be measured per cohort.

**Levers.**
1. **In-app discovery.** Surface unused features at moments of low cognitive load (post-commit, post-week-1-complete).
2. **Feature-by-marker:** the doctor callout is a feature that only fires for severe values. Adoption is therefore bounded by population, not by discovery — that's healthy.
3. **The "feature adoption death zone" is 0-30%.** Either drive past 30% by making the feature unavoidable, or kill the feature.

---

### Onboarding / User Onboarding

**Definition.** The sequence from first visit to first valuable use.

**Baseline interpretation.** Landing → start → upload/tests → intake → plan. Five screens, ideally five minutes.

**Levers.**
1. **Trim every screen to the highest-leverage question.** /start has six fields; could /intake skip questions that the profile already implies?
2. **Onboarding completion as a metric, not as a project.** Track funnel drop-off per screen weekly. If /intake drops 30%, fix /intake.
3. **Progressive disclosure.** The plan's progressive week unlock is good onboarding pattern reuse. Apply elsewhere — for example, the marketplace filters could start collapsed.
4. **Onboarding email cadence.** Three emails over the first week: day 0 (welcome + first week's moves), day 4 (mid-week nudge), day 7 (reflection + next week unlock).

---

### Time to Value (TTV)

**Definition.** Time from sign-up to first delivered value.

**Baseline interpretation.** TTV for Baseline = time from `profile_created` to `dashboard_first_view_with_data`. Today, that's probably ~3 minutes if the parse goes well. The hard metric is time to `plan_committed` (5-7 minutes).

**Levers.**
1. **Parse speed is the bottleneck.** Optimize the OpenRouter call: shorter prompt, cached system block, smaller markers JSON.
2. **Skip-able intake for power users.** "Use defaults for everything I haven't answered" CTA gets aggressive users to the plan faster.
3. **Show partial value early.** Even before parse completes, show "Reading your report... here are the markers we'll find" — anchors expectation.
4. **Pre-render the plan-loading skeleton on /intake submit** so the perceived wait is shorter.

---

### Product-Led Growth (PLG)

**Definition.** A strategy where the product itself drives acquisition, conversion, and expansion.

**Baseline interpretation.** Baseline is naturally PLG-shaped: the product creates the moment of surprise ("I was deficient and didn't know"), and that moment is shareable. The share-card mechanic and the nudge email are the two PLG levers.

**Levers.**
1. **Make the baseline shareable** without exposing values. A blurred-marker card with the "I was surprised" line.
2. **Referral mechanic at the post-commit moment** (highest intent). Not the dashboard later.
3. **The nudge email is itself a PLG surface.** It can include a "send to a friend" PS.
4. **In-product PLG hooks:** the doctor callout could include a "share this with my GP" with a clean copy of the marker.

---

### Drop-off Rate / Funnel Drop-off

**Definition.** % of users who exit the funnel at a specific step.

**Baseline interpretation.** Step-by-step drop-off: landing → start → upload → intake → plan → dashboard → forecast → re-test.

**Levers (per step).**
- **Landing → start drop-off:** weakest hook. Try first-person ("I look fine. The inside story might be different.")
- **Start → upload/tests:** profile friction. Reduce fields, autofill if possible.
- **Upload → intake:** parse failure or fatigue. Demo fallback should be one tap; "I'll skip and use sample" should be visible.
- **Intake → plan:** length. Cap questions at 5, make question 6+ optional with default values.
- **Plan → dashboard:** the email capture. Allow "skip and capture later" with a polite reminder later.
- **Dashboard → re-test:** the whole point. Drop-off here is the loop failing.

---

### Conversion Rate / Conversion Funnel / Funnel Analysis

**Definition.** Rate of users moving from one stage to the next, mapped along a defined path.

**Baseline interpretation.** Total conversion (landing → plan_committed) and step conversions. Both matter.

**Levers.**
1. **Instrument every funnel step as a distinct event with consistent naming.** parse_started, parse_success, intake_completed, plan_committed.
2. **Plot weekly funnel by source.** IG bio-link versus Google search will have different shapes; treating them as one cohort obscures problems.
3. **Test step-skipping for repeat users.** A user who already has a profile shouldn't have to fill it again on a new device — login or magic-link.
4. **Two funnels, not one.** First-time funnel (long, 5 steps). Returning-user funnel (short, 1 step: open dashboard). Track separately.

---

### Form Submitted

**Definition.** Event fired when a user successfully submits a form.

**Baseline interpretation.** Multiple form submits in Baseline:
- /start profile form
- /upload manual entry form
- /intake question stream
- /plan email capture
- The "log this stage" form when TRT/PCOS were on (now removed)

**Levers.**
1. **Per-form success rate.** Track submit attempts vs successful submits per form. If /intake has a 60% attempt → success rate, something's broken (probably validation).
2. **Field-level abandonment.** Which field do users abandon at on /start? Probably "city" if free-text; add autocomplete.
3. **Validation strictness.** Email validation regex must catch real errors but not punish edge cases (Gmail dots, plus addressing).
4. **Soft validation > hard.** A red border on a field is friendlier than a blocking modal.

---

### Abandonment Rate

**Definition.** % of users who start an action but don't complete.

**Baseline interpretation.** Distinct from bounce: abandonment is mid-funnel. Apply to /upload (started but didn't drop file), /intake (started but didn't finish), /plan (saw the reveal but didn't capture email).

**Levers.**
1. **Resume-where-you-left-off.** State persists in localStorage; on return, deep-link them to their last step.
2. **Reduce cognitive load at the abandonment hotspot.** If /intake abandons at q5, q5 is too hard.
3. **Re-engagement email at 24h** for abandoners with a captured email. Otherwise, browser push notification opt-in at /plan if email isn't captured.

---

## C. Engagement & Usage

The product is not a daily-use tool — it's a weekly check-in tool. Adjust the DAU/MAU framing accordingly.

### Active User Growth

**Definition.** Net new active users per period.

**Baseline interpretation.** Track week-over-week new actives, separated from total cumulative actives. Growth math: (this_week_actives - last_week_actives) / last_week_actives.

**Levers.**
1. **Distinguish new actives from returning actives.** Returning actives are the loop working; new actives are acquisition.
2. **Compound growth target.** 7-10% WoW for the first three months is achievable from a creator wedge.
3. **Growth-by-source dashboards weekly.** When one source plateaus, double down on the next.

---

### Daily Active Users (DAU) / Weekly Active Users (WAU) / Monthly Active Users (MAU)

**Definition.** Unique active users in a 1-day / 7-day / 30-day window.

**Baseline interpretation.** WAU is the meaningful metric. DAU is wrong-fit for a weekly-check-in product; MAU is too lagging.

**Levers.**
1. **Optimize for WAU, not DAU.** The nudge cadence is weekly; the active definition should match.
2. **Define active as "interacted with own data".** Marketplace browses don't count if no commit; opening dashboard counts even with no edit (because the user is checking their state).
3. **WAU/MAU stickiness ratio.** A 50%+ ratio means people come back weekly — strong for this category.
4. **Cohorted WAU.** Plot WAU by signup week; a healthy product has each cohort plateau above 30% by week 8.

---

### Sessions / Session Duration

**Definition.** A continuous block of user activity; the length of that block.

**Baseline interpretation.** Session count per active user per week. Short focused sessions (3-5 min) are healthier than long browsing ones; this is a check-in tool, not a content tool.

**Levers.**
1. **Aim for 2-3 sessions per active week.** One on Sunday after the nudge, one mid-week to check off moves, one weekend for reflection.
2. **Session quality > duration.** A 90-second session where the user checked off two moves is worth more than a 12-minute browse.
3. **Onboarding session is allowed to be 15+ minutes** (it's the first time). Returning sessions should compress.

---

### Page View / Button Click / Navigation Click / Link Clicks

**Definition.** Granular interaction events.

**Baseline interpretation.** Track at semantic level: `move_marked_done` rather than `button_click[data-id=move-1]`. The semantic event survives refactors.

**Levers.**
1. **Event taxonomy first, instrumentation second.** Define a flat list of ~30 meaningful events with consistent naming. Then wire them.
2. **Page views without semantic meaning are noise.** /dashboard view is meaningful; /upload view is funnel position; /tests view depends on whether they came from the landing's first-timer CTA.
3. **Click depth per page.** How many semantic actions per page view. /dashboard at <2 clicks/view means the page is a dead-end.

---

### Click-Through Rate (CTR)

**Definition.** Clicks divided by impressions, on a specific element or surface.

**Baseline interpretation.** CTR on the nudge email is the most consequential CTR. CTR on "See the nudge" button on dashboard. CTR on each landing CTA.

**Levers.**
1. **Nudge subject lines A/B tested.** "Your Vitamin D is quietly drifting" versus "Three weeks until D drops below the line". Open rate is the surrogate.
2. **CTA placement A/B.** Top vs middle vs sticky bottom on the landing.
3. **Word-level testing on CTAs.** "Get tested today" vs "See my baseline" vs "Find my baseline". Tiny changes move CTR a lot.
4. **CTR by source.** A user from a content reel may CTR differently than a user from a paid ad on the same CTA.

---

### File Download

**Definition.** Event fired when a user downloads a file.

**Baseline interpretation.** Future: downloadable "shareable card" PDF of baseline; downloadable plan; downloadable doctor-share summary. Currently not implemented.

**Levers.**
1. Build the share card PDF. Track downloads as a leading indicator of viral spread.
2. Build a "for-my-doctor" PDF that's a clean, clinical summary. Downloads track power-user engagement.

---

### Feature Usage

**Definition.** Frequency and depth of use per feature.

**Baseline interpretation.** Per feature: average uses per active user per week.

**Levers.** See Feature Adoption — same playbook.

---

### Engagement Metrics / User Engagement

**Definition.** Composite measures of how deeply users use the product.

**Baseline interpretation.** Three-metric composite for Baseline engagement:
1. Week's-moves completion rate (target: 60%+).
2. Nudge email open rate (target: 50%+; high because we ship one per week, soft tone).
3. Re-test completion rate when due (target: 40%+ in v1).

**Levers.**
1. Publish the composite as a single "engagement score" per user; show internal cohorts.
2. Run weekly autopsies on disengaged cohorts: what was the last action before silence?
3. Re-engagement: any user with 14+ days of inactivity gets a "we noticed" email, not a guilt email — frame as a check-in, not a chase.

---

### App Metrics / Mobile Analytics / Website Analytics

**Definition.** Standard telemetry for app and web surfaces.

**Baseline interpretation.** Today Baseline is web-only (responsive). Mobile-specific instrumentation matters because IG traffic is 95%+ mobile.

**Levers.**
1. Add a service worker for offline access to the dashboard. Mobile users in low-signal areas can still check this week's moves.
2. PWA-ify: add to home screen. Track install events.
3. Mobile-specific funnels: are mobile users dropping at /intake more than desktop? Probably yes — keyboard fatigue. Compress the form.

---

### In-app Messaging / Trigger-based Messaging

**Definition.** Messages surfaced in-product, fired by user behavior triggers.

**Baseline interpretation.** Currently we have: end-of-week reflection prompt (triggered by all moves done), severe-marker doctor callout (triggered by severity), the plan tile (always rendered). All trigger-based.

**Levers.**
1. **A trigger-based toast on the dashboard:** if a user hasn't logged any move in 4 days, surface a soft prompt: "How's the sun streak holding?"
2. **A trigger-based modal at week complete:** "Week 1 done. Tap to unlock Week 2." Currently this works only when user taps the continue button; the modal could be pre-emptive.
3. **In-app messaging at the re-test moment:** dashboard banner "It's almost time to re-test ${marker}. Want the same panel as last time?"

---

### Deep Linking

**Definition.** URLs that open a specific in-app screen with context.

**Baseline interpretation.** Today the routes are deep-linkable but state isn't passed. The nudge email could deep-link to `/forecast/vitamin_d?from=nudge` and we'd know the user came from the email.

**Levers.**
1. Add `from=` query params to every email link. Power for attribution.
2. Add `prefilled=` and `selected=` params to /tests for sharing a specific filter combo. "Send your friend this 'Low mood' filter".
3. Add a magic-link login so users on a new device can resume their plan without retyping the profile.

---

### User Flows / Path Analysis

**Definition.** The actual paths users take through the product. Path analysis maps them.

**Baseline interpretation.** Five expected flows:
1. First-timer: landing → tests → external book → return → upload → intake → plan.
2. Has-report: landing → upload → intake → plan.
3. Returning: dashboard → move-check → reflection.
4. Drifter: dashboard → forecast → re-test marketplace → external book.
5. Severe: dashboard → severe banner → doctor callout → external action.

**Levers.**
1. **Track each flow's completion rate.** Drifter flow (#4) is the loop-closing flow; its completion rate is the North Star.
2. **Compare actual paths to expected paths.** Surprise paths reveal product gaps. If 30% of users go landing → /improve directly, the move library is more interesting than we modeled.
3. **Optimize the slowest flow.** First-timer flow has the most steps; collapse where possible.

---

## D. Retention, Churn & Lifecycle

The retention story is the business. For a once-a-year clinical product, normal SaaS retention math doesn't apply.

### Retention Rate / Customer Retention Rate

**Definition.** % of users from a cohort who are still active in a later period.

**Baseline interpretation.** Three retention definitions:
- **Engagement retention:** % of cohort still opening the dashboard week N.
- **Loop retention:** % of cohort that completes a re-test on schedule.
- **Re-test retention:** % of cohort that completes BOTH the first and the second re-test.

The third is the real one.

**Levers.**
1. **Optimize for week-12 retention, not week-1.** Week 1 is the high; the question is what's left at week 12.
2. **The four-week plan is the retention engine for weeks 1-4.** Make week 4 lead organically into "what's next?" Currently it ends in a re-test recommendation; make that feel like the start of run 2.
3. **Re-test reminders cascade.** First reminder at scheduled date. Second at +3 days if no booking. Third at +14 days with a gentler tone.
4. **Surface the user's own historical data prominently** on return. "You logged 11 moves last month. Your D was 28 on the last test. Curious where it is now?"

---

### Cohort Retention / Retention Curves / Retention Analysis

**Definition.** Retention plotted as a curve over time, cohorted by signup period.

**Baseline interpretation.** Plot cohorts by signup week (or by content campaign that drove signup). Curves stabilize, ideally, around 30-40% by week 8 for a weekly-check-in product.

**Levers.**
1. **Compare curves across cohorts.** A cohort with a flatter curve = better product fit. What's different about that cohort? Source? Marker mix? Intake answers?
2. **Cohort by activation depth, not by signup date.** A cohort of users who committed a plan retains differently from a cohort that only parsed.
3. **A "magic moment" cohort:** users who logged at least one move in week 1 versus those who didn't. The first cohort retains 3-4× better in most products.

---

### Net Retention Rate

**Definition.** Revenue retention from a cohort, accounting for upgrades, downgrades, and churn.

**Baseline interpretation.** Pre-monetization, this isn't meaningful. Once monetized: track per-cohort marketplace revenue compared to cohort's first-month spend.

**Levers.**
1. Track gross retention separately from net retention. Gross tells you product-fit; net tells you expansion.
2. Expansion in Baseline = more re-tests per year, more markers tested per visit, sharing-driven new signups attributed to the cohort.

---

### Lifecycle Analysis

**Definition.** Tracking users through stages: new, active, at-risk, churned, reactivated.

**Baseline interpretation.** Five lifecycle stages:
- **Activated:** plan committed.
- **Engaged:** actively logging moves and opening nudges.
- **Drifting:** no activity for 14+ days.
- **Reactivated:** drifted but opened a nudge and returned.
- **Churned:** drifted for 60+ days.

**Levers.**
1. **Different messaging per stage.** Engaged users get encouragement; drifting users get re-engagement; churned users get a soft "we'd love to know what changed."
2. **Reactivation as a metric.** % of drifted users who come back. Re-test reminders are the main reactivation surface.
3. **Healthy lifecycle distribution.** Aim for 40% engaged, 20% drifting, 10% reactivated, 30% churned at month 6. Anything above 50% churned says the product isn't compelling enough on its own.

---

### Churn / Churn Rate

**Definition.** % of users lost in a period.

**Baseline interpretation.** Define churn as 60 days of zero activity. Anything shorter overestimates churn because the product is weekly-check-in.

**Levers.**
1. **Churn ≠ uninstall in a web app.** Use the 60-day silence definition consistently.
2. **Churn cohort autopsies.** Pull a week of churners, look at their last 5 sessions, hypothesize.
3. **Churn correlates with first-week intake completeness.** Users who skipped questions probably churn faster. Test the correlation, then fix the relevant questions.

---

### Churn Analysis / Churn Prediction

**Definition.** Analyzing the causes; predicting which users are about to churn.

**Baseline interpretation.** Once we have 1,000+ users with 8+ weeks of data, train a churn predictor on: weeks since last activity, plan completion rate, severity (severe-marker users probably retain longer because the stakes are higher), source of acquisition.

**Levers.**
1. **Pre-churn interventions.** Users with high predicted-churn-probability get a soft email asking what would help.
2. **Train the model on actions, not just demographics.** "Logged zero moves in week 1" is a far stronger predictor than "is male, 24, vegan".
3. **Don't over-engineer until you have data.** A heuristic ("no nudge open in 21 days") beats a half-trained model.

---

### Survival Analysis

**Definition.** Statistical method for analyzing time-to-event data (here: time to churn).

**Baseline interpretation.** Kaplan-Meier curves of user "survival" (still active) over time. Useful for comparing cohort longevity.

**Levers.**
1. Compare survival curves between users who completed the first plan vs didn't. Magnitude of the gap reveals plan completion's true value.
2. Compare male vs female, urban vs metro, severity tiers. Don't act on raw numbers — confirm with statistical significance.

---

## E. Revenue & Unit Economics

The business model is marketplace commissions (~₹300 per booking, ~2-3 tests per user per year) plus future premium features. The unit economics need scrutiny.

### Average Order Value (AOV)

**Definition.** Average value of a single transaction.

**Baseline interpretation.** AOV for a marketplace booking. The intent-first filter biases AOV: "Full body baseline" panels are ₹1500+; "Low mood" is ₹400-600.

**Levers.**
1. **Bundle recommendations.** When user clicks one panel, suggest a comprehensive panel for ₹200 more. Already partially built (`bundleHint` in /api/recommend-explain).
2. **Surface the higher-AOV bucket prominently.** The "Full body baseline" intent card sits first — this is correct.
3. **Don't manipulate AOV at the cost of conversion.** A user who books a ₹500 panel and re-tests is worth more than a user who refuses to book.

---

### Average Revenue Per User (ARPU)

**Definition.** Total revenue divided by total users.

**Baseline interpretation.** Per active user per month. Total bookings × ~₹300 commission / total actives.

**Levers.**
1. **Re-test cadence is the primary ARPU lever.** A user who tests twice a year is worth 2× a user who tests once.
2. **Upsells inside the loop.** Plan-tied marker recommendations could lift ARPU; "your D is drifting, consider adding the calcium panel" at the re-test moment.
3. **Don't conflate ARPU with ARPPU** (revenue per paying user). The free-to-paid conversion is its own metric.

---

### Customer Lifetime Value (CLV / LTV)

**Definition.** Total revenue from a customer over their lifetime relationship.

**Baseline interpretation.** LTV = (avg tests per year × commission per test) × avg active years × gross margin. With ₹300 × 2.5 × 3 × 0.85 = ~₹1,900 LTV per active user. The number gets interesting at scale and with referral attribution.

**Levers.**
1. **Lengthen active years.** This is retention, see Section D.
2. **Raise tests per year.** Add new test categories: micronutrient panel, hormone panel, sleep cortisol. Each is a re-test opportunity per year.
3. **Raise commission per test.** Better negotiation with labs as volume grows. Or premium markers (genetic tests) at higher commission.
4. **Network LTV.** Each referred user adds to the source user's effective LTV. Track this.

---

### Operating Expenses (OpEx)

**Definition.** Recurring cost of running the business.

**Baseline interpretation.** Today: ~$0/month for hosting (Vercel free), ~$20/month OpenRouter at small scale, ~$0/month Resend (free tier). Scaling 100×: ~$200 hosting, ~$2,000 OpenRouter, ~$100 Resend.

**Levers.**
1. **Cache the parse output** when the same PDF is uploaded twice. Cuts OpenRouter cost.
2. **Use cheaper models for the static-fallback paths** (e.g., Llama 3.3 free for parse, Claude only for nudge copy where quality matters).
3. **Batch nudge sends** to amortize Resend overhead.
4. **Monitor cost-per-active-user weekly.** If it climbs above ₹5/MAU, intervene.

---

### Cart Abandonment

**Definition.** Users who started a checkout but didn't complete.

**Baseline interpretation.** Specific to marketplace: users who clicked a panel CTA but didn't complete the external booking. We can't directly see external completion, but we can see clicks.

**Levers.**
1. **Track panel_clicked_out as a leading indicator.** Pair with a survey 24 hours later: "Did you book?"
2. **Reduce friction at the external transition.** Some labs make booking hard; surface the easier-to-book panels.
3. **Add a "remind me to book" CTA.** If a user is curious but not ready, capture intent for a 24-hour follow-up.

---

## F. Experimentation & Causality

### A/B Testing / Experimentation / Experiment Design

**Definition.** Comparing two variants to measure a causal effect on a metric.

**Baseline interpretation.** At small scale, A/B tests need long durations or large effects to detect. Start with 20%+ effect-size tests, not 2% UX tweaks.

**Levers / discipline.**
1. **Pre-register the hypothesis.** "We expect changing CTA copy to 'Find my baseline' to raise landing → start conversion from 12% to 15%."
2. **Compute the required sample size before launching.** A 3% absolute lift on a 12% baseline at 80% power needs ~3,000 users per variant. Don't run underpowered tests.
3. **One experiment at a time** until you have enough volume for parallel testing.
4. **Hold-out groups.** Always reserve 5% of traffic as a "no changes" control over time to detect non-experimental drift.

---

### Hypothesis Testing / Statistical Significance

**Definition.** Formal framework for inferring whether an observed difference is real.

**Baseline interpretation.** Default to two-sided z-tests on proportion-based metrics (conversion rates), p<0.05. Sequential testing (peeking) is forbidden — fixed sample size or proper sequential methods only.

**Levers.**
1. **State the null hypothesis explicitly.** "There is no difference in landing → start conversion between variant A and variant B."
2. **Pre-compute MDE** (minimum detectable effect) given your traffic. Don't run a test that can't detect a meaningful win.
3. **Use Bayesian-style "probability of being better" reporting** for stakeholder communication; use frequentist tests for decisions.

---

### Causality Analysis

**Definition.** Distinguishing correlation from cause.

**Baseline interpretation.** "Users who log moves churn less" is a correlation. The causal claim is "logging moves causes them to churn less."

**Levers.**
1. **Natural experiments.** Before/after of a feature launch, comparing user cohorts pre and post.
2. **Difference-in-differences.** Compare change in metric for treated cohort vs untreated cohort across the same time window.
3. **Instrumental variables.** Hard but rigorous. For Baseline, the random delay in nudge delivery (some users get delayed Resend sends) could be an IV for nudge open rates.

---

### Key Driver Analysis

**Definition.** Identifying which inputs most strongly predict an output.

**Baseline interpretation.** Run a regression of "weeks active" on: intake completeness, severe-marker count, source of acquisition, plan generated at all, etc. Coefficients tell you which inputs to optimize.

**Levers.**
1. **Don't over-trust regression on observational data** — it's correlational. But it's the first step.
2. **Drivers can be discovered without ML.** Cross-tab the data: of users who retained, what % completed intake fully vs partially?

---

### Heuristic Analysis

**Definition.** Expert-judgment-driven evaluation, often as a precursor to data-driven testing.

**Baseline interpretation.** Heuristic UX evaluation of the demo by 3-5 power users (the "5 friends" the story page references) yielded the moves: plan-before-forecast, feeling-before-marker, marketplace as first hook. That's heuristic analysis at its best.

**Levers.**
1. **Continue the practice quarterly.** Five users, an hour each, structured walkthrough.
2. **Pair heuristic insights with quant.** "Three of five friends skipped the forecast" → check if quant matches.

---

### Correlation Coefficient / Regression Analysis / Multivariate Analysis / Variance Analysis / Mean Absolute Error

**Definition.** Statistical building blocks.

**Baseline interpretation.** Use them to understand data, not to publish. Concrete uses:
- **Correlation:** does intake completeness correlate with retention? (Hypothesis: strongly.)
- **Linear regression:** predict re-test probability from features.
- **Multivariate regression:** control for confounders (age, sex, source).
- **Variance analysis (ANOVA):** does retention differ across source cohorts after controlling for activation depth?
- **Mean absolute error:** for the forecast — how far off are our directional projections from actual re-test values? This tells us whether the credibility line is honest.

**Levers.**
1. Build a small internal dashboard with these computed weekly.
2. Forecast MAE is the most important — if our directional estimates are wildly off, the credibility callout is dishonest. Tune the decay model when it drifts.

---

### Monte Carlo Simulation

**Definition.** Repeated random sampling to estimate the distribution of outcomes.

**Baseline interpretation.** Use it for: the market sizing scenarios on the story page (best, base, worst case under different conversion assumptions), the forecast confidence bands (today we show a deterministic line; a Monte Carlo would let us show "80% confidence the crossing happens between X and Y").

**Levers.**
1. Add Monte Carlo confidence bands to the forecast chart in v2. Visualizes the directional-estimate disclaimer.
2. Run Monte Carlo on the GTM math monthly. Updates the "what if 5% becomes 3%" sensitivity.

---

### Compound Annual Growth Rate (CAGR)

**Definition.** Annualized growth rate over multi-year periods.

**Baseline interpretation.** Diagnostics market growing at 11% CAGR (cited on story page). Internal: target CAGR of WAU once we exit launch noise.

**Levers.**
1. Stop optimizing for week-over-week once monthly is stable; switch to CAGR-style reporting.
2. Use CAGR for forward projections in the data room, not for daily reporting.

---

### Benchmarking

**Definition.** Comparing your numbers to industry/category baselines.

**Baseline interpretation.** Benchmark: diagnostics D2C retention is ~30-40% week-12 across PharmEasy/1mg/HealthifyMe public data. Plan-completion is ~15-25% across health apps. Email open rates: ~25-30% typical, 50%+ for first-party transactional.

**Levers.**
1. **Refresh benchmarks quarterly.** Numbers move; stale benchmarks mislead.
2. **Compare to category, not to SaaS averages.** Health/wellness is its own thing.
3. **Internal benchmarks matter more than external ones long-term.** Once you have your own historical data, that's your benchmark.

---

## G. Analytics Tradecraft

### Analytics / Ad hoc Analysis / Descriptive / Diagnostic / Predictive / Prescriptive Analytics

**Definition.** Five maturity tiers:
1. **Descriptive:** what happened.
2. **Diagnostic:** why it happened.
3. **Predictive:** what will happen.
4. **Prescriptive:** what to do about it.
5. **Ad hoc:** answering a specific question now.

**Baseline interpretation.** Today Baseline does mostly descriptive (the dashboards we'd build) and ad hoc (Shivam pulling numbers for the call). Diagnostic comes next; predictive after that.

**Levers.**
1. **Stage 1: Build descriptive dashboards.** Daily active, weekly funnel, conversion rates, retention curves.
2. **Stage 2: Add diagnostic layers.** Filter the descriptive by source / cohort / segment. Now you can ask why.
3. **Stage 3: Predictive at 1,000+ users.** Churn prediction model, retention forecast.
4. **Stage 4: Prescriptive much later.** "Users like this respond best to this intervention."

---

### Exploratory Data Analysis (EDA)

**Definition.** Open-ended exploration of data to discover patterns without strong priors.

**Baseline interpretation.** Once you have 100+ committed plans, sit with the data for an hour. No questions. Just look. Surprises become hypotheses.

**Levers.**
1. **Schedule monthly EDA sessions.** Block 90 minutes. No agenda. Look.
2. **EDA outputs are screenshots and notes, not reports.** The discoveries are stored as questions for follow-up.

---

### Drill-down Analysis

**Definition.** Progressively segmenting a metric to find where movement came from.

**Baseline interpretation.** If overall conversion drops 10%, drill: by source, by date, by intake length, by browser. Find the cell that moved.

**Levers.**
1. Default dashboards should drill from total → source → cohort with two clicks.
2. The unexpected drilldowns are the most useful. "Conversion dropped after the new landing copy" — is it the copy or the day Instagram changed its algorithm?

---

### Root Cause Analysis

**Definition.** Tracing a problem to its underlying cause.

**Baseline interpretation.** When a metric moves, run "5 whys" before "let's fix it." Most metric drops have one root cause and three symptoms.

**Levers.**
1. **Five whys discipline** on every anomaly above a 15% deviation.
2. **Write the root cause down.** Postmortems compound.

---

### Time Series Analysis / Forecasting / Anomaly Detection / Outlier Detection / Real-time Analytics

**Definition.** Methods for handling data ordered in time.

**Baseline interpretation.**
- **Time series:** plot WAU, conversion, etc. over time.
- **Forecasting:** project the trends. Used internally and as a customer-facing feature (forecast).
- **Anomaly detection:** alert when a metric deviates significantly from prediction.
- **Outlier detection:** identify users or events that are unusual (could be bots, could be insights).
- **Real-time:** live dashboards, used sparingly.

**Levers.**
1. **Don't chase real-time dashboards.** Hourly is fine for almost everything.
2. **Anomaly detection at the right granularity.** Per-source anomaly detection beats global; one channel breaking might be invisible at the global level.
3. **The customer-facing forecast IS time series analysis.** Improve it by tuning the decay model with real re-test data.

---

## H. Behavioral Insight & Segmentation

### Behavioral Analytics / User Behavior Analytics / Behavioral Cohorting

**Definition.** Analyzing what users do (events), not just who they are (attributes).

**Baseline interpretation.** Behavioral cohort examples:
- Users who completed intake in <90 seconds.
- Users who logged at least 1 move in week 1.
- Users who opened the doctor callout.
- Users who clicked panel_clicked_out within 48h of profile_created.

**Levers.**
1. **Behavioral cohorts > demographic cohorts.** "Users who logged a move" predicts retention 5× better than "users aged 22-25".
2. **The high-engagement behavioral cohort is the gold cohort.** Study it. What did they do in their first session?
3. **Re-create the conditions that produced the gold cohort.** If they all came from one reel, make more like that reel.

---

### Audience Segmentation / User Segmentation / Event Segmentation / Dynamic Segmentation

**Definition.** Splitting users into groups based on attributes, behaviors, or contexts. Dynamic means the segmentation updates as users move through stages.

**Baseline interpretation.** Key segments:
- By intake intent (low mood, tired, energy crashes, heart, full body).
- By severity (no severe, 1+ severe).
- By acquisition source.
- By activation depth (parsed only, plan committed, week 1 done).
- By marker mix (D-only attention, multi-marker attention).

**Levers.**
1. **Segments inform messaging.** A user who's severe gets a different nudge cadence than a user who's just watch-tier.
2. **Dynamic segmentation matters.** A user who was "drifting" last week and is "engaged" this week needs different messaging right now.
3. **Don't ship 12 segments. Ship 3-4 strong ones.** Each segment has a different lifecycle, different in-app messaging, different email cadence.

---

### Cluster Analysis / K-means Clustering

**Definition.** Unsupervised methods for grouping similar items.

**Baseline interpretation.** With enough data, cluster users by behavioral fingerprint: open frequency, move-completion rate, marker mix, intake answers. Surface emergent clusters that aren't obvious from one feature.

**Levers.**
1. **Wait until you have 1,000+ users with 4+ weeks of data.** Earlier clustering is noise.
2. **Use cluster labels for outreach, not for product changes.** "Cluster 3" tells you nothing without naming it ("the carb-watcher cohort").

---

### Market Basket Analysis

**Definition.** Finding co-occurrence patterns. E-commerce classic: "people who buy X also buy Y."

**Baseline interpretation.** Which markers cluster together in users? Which moves get done together? If "morning sun" + "post-dinner walk" co-occur in completers, surface them as a paired suggestion.

**Levers.**
1. Run basket analysis on logged moves quarterly. Surface co-occurring moves on the dashboard.
2. Run basket analysis on panel bookings to suggest add-ons.

---

### User Properties / User Persona / User ID / Universally Unique Identifier (UUID)

**Definition.** Attributes attached to users; archetypal personas built from them; the unique identifier that ties data together.

**Baseline interpretation.**
- **UUID:** generate one per profile_created. Persist in localStorage + cookie + Resend recipient metadata. Survives device changes via email login.
- **User properties:** sex, age, diet, sun, city, severity tier, source, activation date, last active.
- **Personas:** "the optimizer", "the worried-well", "the parent-recovering", "the early-career stress-tester".

**Levers.**
1. **UUID hygiene from day 1.** Cross-device identity is hard to retrofit; do it now.
2. **3-4 named personas based on real cohort data, not invented.** Each gets a one-page card on what they want, what they fear, and how Baseline serves them.
3. **User properties as input to dynamic segmentation.**

---

## I. Data Engineering

The plumbing. Without it, every metric in this report is theatre.

### Data Cleansing / Scrubbing / Normalization / Transformation / Enrichment / Integration

**Definition.** The stages of getting data from raw to analysis-ready.

**Baseline interpretation.** Concrete pipeline:
1. **Cleansing:** fix unit mismatches (some PharmEasy reports use mg/dL for HbA1c, others use %). The parse JSON normalizes; double-check.
2. **Normalization:** all timestamps in UTC, all IDs as strings, all marker IDs in canonical form (vitamin_d not Vit D).
3. **Transformation:** derive composite metrics (severity, status, days_since_test) at query time, not at ingest, so changing the rule doesn't require backfill.
4. **Enrichment:** add cohort labels, source tags, sequencing numbers at ingest.
5. **Integration:** Vercel logs → product event store → analytics tool. Choose one analytics tool (PostHog, Amplitude, Mixpanel) and one warehouse (BigQuery/Postgres). Don't over-engineer.

**Levers.**
1. **Single source of truth.** The events table is the source. Dashboards read from it. No off-side spreadsheets.
2. **Schema-on-write for events, schema-on-read for analysis.** Lock event names; allow flexible interpretation.
3. **Idempotency.** Every event should be safe to re-send. Use a UUID per event.

---

### Data Pipeline / Data Sampling

**Definition.** End-to-end flow from event firing to analysis. Sampling: storing/analyzing a subset of events.

**Baseline interpretation.** Pipeline: client fires event → /api/track route (build this) → write to event store → analytics tool consumes. Sample only if cost requires it (we won't at v1 scale).

**Levers.**
1. Don't sample in v1; volume is too low. Sample only when storage cost approaches meaningful spend.
2. Test the pipeline weekly with a "canary event" you fire from a known fixture and verify lands in the dashboard.

---

### Data Mining / Data Visualization

**Definition.** Discovering patterns; presenting findings.

**Baseline interpretation.** Visualization tool: Plotly/Observable for ad-hoc, Metabase/Apache Superset for ongoing dashboards.

**Levers.**
1. Default to small multiples for cohort comparisons; default to lines for time series; default to heatmaps for retention.
2. Show the y-axis from zero unless there's a strong reason not to. Truncated axes lie.

---

### Log-level Data / Clickstream Data / Event Taxonomy / Tag Management / Application Programming Interfaces (APIs)

**Definition.** Granular logs; user behavior streams; the naming scheme for events; the system for adding tracking; programmatic interfaces.

**Baseline interpretation.**
- **Event taxonomy first.** Define ~30 events with clear names. profile_created, parse_started, parse_success (with source: openrouter|demo|manual), intake_started, intake_completed (with question_count), plan_generated, plan_committed, email_captured, week_unlocked (with week_number), move_marked_done (with marker_id, move_id), reflection_logged (with sentiment), severe_callout_shown, doctor_callout_clicked (future), nudge_sent, nudge_opened, nudge_cta_clicked, retest_booked (future), retest_completed (future).
- **Tag management:** until you have a real GTM-like setup, just add events directly in the code.
- **APIs:** internal events API at /api/track. Document its schema in /docs.

**Levers.**
1. **The event taxonomy is the single most important analytics decision.** Spend a half-day defining it. Document it. Enforce it in code review.
2. **Log-level data > clickstream.** Semantic events ("move_marked_done") survive UI refactors; click logs don't.

---

### Leading Indicators / Lagging Indicators

**Definition.** Predictive vs reactive metrics.

**Baseline interpretation.**
- **Leading:** parse success rate, intake completion rate, week-1 move-completion rate. Predict downstream success.
- **Lagging:** retention at week 8, re-test completion rate, LTV. Confirm downstream success.

**Levers.**
1. **Daily dashboards should be leading metrics.** Weekly/monthly dashboards lagging.
2. **When a leading indicator moves, investigate.** When a lagging indicator moves, react.

---

## J. Customer Experience & Voice

### Customer Experience (CX)

**Definition.** The end-to-end experience of being a Baseline user.

**Baseline interpretation.** Five touchpoints:
1. Discovery (reel, story).
2. Landing (the hook).
3. Onboarding (start → upload → intake → plan).
4. Ongoing (dashboard, nudges, re-test).
5. Crisis (severe marker → doctor escalation).

**Levers.**
1. Audit each touchpoint quarterly. Walk it cold.
2. Friend-test (5 users) before launching any redesign of a touchpoint.
3. CX is mostly about consistency. Nothing should surprise you in a bad way across touchpoints.

---

### Customer Journey Mapping

**Definition.** A visualization of the user's experience over time, including their state, action, and emotional response.

**Baseline interpretation.** Maps for each persona (the optimizer, the worried-well, the parent, the early-career stress-tester). Each map identifies the moment of peak emotional engagement and the moment of peak friction.

**Levers.**
1. **Map first, build second.** Before any feature, identify which journey it serves.
2. **Emotional curves are real.** The plan reveal should be peak positive emotion; the severe callout is the only intentional negative-emotion moment. Don't let other moments cause unintended emotional swings.

---

### Net Promoter Score (NPS)

**Definition.** "How likely are you to recommend Baseline?" 0-10 scale. NPS = % promoters (9-10) - % detractors (0-6).

**Baseline interpretation.** Useful as a tracking number, not as a decision-driver. Survey at week 4 (after first plan) and week 12 (after first re-test).

**Levers.**
1. Sample, don't survey-bomb. 10% of users monthly.
2. Pair NPS with a free-text "why" — that's where the value is.
3. Don't optimize for NPS. Optimize for the actions that drive promoter ratings.

---

### User Feedback Loop

**Definition.** The system for capturing, processing, and acting on user feedback.

**Baseline interpretation.** Already exists in three forms:
1. The end-of-week reflection prompt ("All landed / Mixed / Hard").
2. The friend-test process (5 users every quarter).
3. The "send a comment" surface (build this — currently missing).

**Levers.**
1. Build a one-tap "send feedback" surface on the dashboard. Goes to a Notion or Linear automatically.
2. Close the loop visibly. When user feedback shapes a release, mention it: "Based on what you told us..."
3. Public roadmap (future): users can vote on features. Builds investment.

---

### Sentiment Analysis / Qualitative Data

**Definition.** Inferring emotional tone from text; data that isn't numerical.

**Baseline interpretation.** Run sentiment on reflection prompts and any free-text feedback. Track the distribution over time as a leading indicator.

**Levers.**
1. **Don't over-trust sentiment models on short text.** "Hard week" is 2 words; ML reads it negatively but the user might mean "I'm glad I logged it."
2. **Read qualitative data weekly.** 30 minutes scanning all free-text from the week.

---

## K. Product Strategy & Operations

### Product Analytics / Product Management

**Definition.** The analytical discipline of measuring product behavior. The role of managing product strategy and execution.

**Baseline interpretation.** Solo team for now; analytics tooling kept light. PostHog or Amplitude free tier covers v1.

**Levers.**
1. **One owner of metrics.** Everything ladders back to one person's accountability.
2. **Weekly metrics review.** 30 minutes. Not a status update — an investigation.
3. **Trust the funnel, but verify with qualitative.** Numbers can lie; people don't (often).

---

### Product Strategy / Product Roadmap

**Definition.** The plan for what to build and why. The sequencing of those plans.

**Baseline interpretation.** Three roadmap horizons:
- **Now (0-30 days):** ship + measure. Marketplace + scraper + funnel instrumentation.
- **Next (30-90 days):** activate the share mechanic, layer in paid acquisition.
- **Later (90-180 days):** premium features (genetic markers, more lenses), partnership with labs.

**Levers.**
1. **Public-ish roadmap.** What's now / next / later, refreshed monthly. Users see it.
2. **Kill list.** What was on the roadmap and got killed. Discipline signal.

---

### Product Features

**Definition.** Discrete capabilities the product offers.

**Baseline interpretation.** A short feature list:
- Marketplace + intent filter
- LLM parsing with fallbacks
- Adaptive intake
- 4-week plan with progressive unlock
- Dashboard with checkable moves
- Forecast with directional estimate
- Nudge email
- Doctor escalation on severe markers
- Expandable marker detail with natural levers

**Levers.**
1. Track per-feature adoption (see Section B).
2. Kill features that don't reach 30% adoption.
3. Combine features that share usage patterns. E.g., the move library and the plan could merge.

---

### User Stories

**Definition.** Short narrative descriptions of a feature from the user's perspective. "As a [persona], I want [action] so that [outcome]."

**Baseline interpretation.** Examples:
- "As a first-time tester, I want to see what test is cheapest near me so I can take the first step today."
- "As a plan committer, I want to mark moves done quickly so I feel my own progress."
- "As a re-tester, I want the right panel suggested so I don't have to research again."

**Levers.**
1. Every feature has one user story tied to a persona.
2. Acceptance criteria written before code.

---

### SWOT Analysis

**Definition.** Strengths, Weaknesses, Opportunities, Threats.

**Baseline interpretation.**
- **Strengths:** creator distribution, the personal story, the working loop, the technical fallback discipline.
- **Weaknesses:** dependence on creator channel, no defensible moat in software (the parser, the plan, the forecast — all reproducible), no clinical credentials.
- **Opportunities:** category is consolidating fast, no clear winner in the wedge yet, the loop is the first product I've seen that takes the long view.
- **Threats:** big diagnostics players (PharmEasy, 1mg) launching their own subscription products; regulatory shift on health claims; a creator-led product fails when the creator burns out.

**Levers.**
1. Re-run SWOT quarterly.
2. Action each weakness; threats become opportunities if addressed early.

---

## L. The 7-Metric Dashboard

If you only had room for seven metrics on a single dashboard, these are the ones — chosen because together they tell you whether the loop is working:

1. **Weekly Active Users (WAU)** — engagement pulse.
2. **Activation rate (plan_committed / profile_created)** — onboarding health.
3. **Week-8 retention (% of cohort still WAU at week 8)** — product fit.
4. **First re-test landed (count per week)** — the North Star.
5. **Move completion rate (per active user per week)** — plan engagement.
6. **Nudge open rate** — out-of-product engagement, the loop's connective tissue.
7. **Severe-marker doctor callout shown** — safety surface integrity.

Everything else lives in deeper drilldowns.

---

## M. What to Build Next (Analytics-Wise)

In priority order:

1. **Event taxonomy + /api/track route + PostHog or Amplitude integration.** Without this, every metric in this report is theoretical.
2. **UUID generation on profile_created + persistent across sessions.** Cross-device identity.
3. **The 7-metric dashboard rendered weekly.** Send to email; force weekly review.
4. **Cohort-by-source retention curves.** First diagnostic capability.
5. **Funnel drop-off per source.** Surface the worst step per channel.
6. **Friend-test program: 5 new users every 4 weeks.** Qualitative ground truth.
7. **A/B testing tooling at month 3 (when traffic supports it).** GrowthBook or Statsig free tier.
8. **Predictive churn model at month 6 (when data supports it).** Simple logistic regression first.

---

## Appendix: One-line definitions for every term, alphabetical

For the metrics that didn't get their own deep treatment above (mostly because they're covered in adjacent entries), here is the consolidated glossary.

- **Abandonment rate** — % who start an action but don't finish. (See section B.)
- **A/B testing** — comparing two variants for causal effect. (Section F.)
- **Activation rate** — % reaching the "aha" moment. (Section B.)
- **Active user growth** — net new actives per period. (Section C.)
- **Ad hoc analysis** — one-off question answered with data. (Section G.)
- **Adoption rate** — % using a feature. (Section B.)
- **Analytics** — the discipline of measuring product behavior. (Section G.)
- **Anomaly detection** — flagging significant deviations. (Section G.)
- **APIs** — programmatic interfaces. (Section I.)
- **App metrics** — telemetry from apps. (Section C.)
- **Attribution modeling** — assigning credit across touchpoints. (Section A.)
- **Audience segmentation** — grouping users for targeting. (Section H.)
- **AOV** — average value of a single transaction. (Section E.)
- **ARPU** — average revenue per user. (Section E.)
- **Behavioral analytics** — analyzing what users do. (Section H.)
- **Behavioral cohorting** — cohorting on behavior, not attributes. (Section H.)
- **Benchmarking** — comparing your numbers to industry. (Section F.)
- **Bounce rate** — single-page sessions. (Section A.)
- **Button click** — granular interaction event. (Section C.)
- **Cart abandonment** — started but didn't complete checkout. (Section E.)
- **Causality analysis** — distinguishing correlation from cause. (Section F.)
- **Channel attribution** — credit per channel. (Section A.)
- **Churn / churn analysis / churn prediction / churn rate** — lost users. (Section D.)
- **Clickstream data** — sequence of user actions. (Section I.)
- **Click-through rate** — clicks / impressions. (Section C.)
- **Cluster analysis / K-means** — unsupervised grouping. (Section H.)
- **Cohort retention** — retention by signup period. (Section D.)
- **Compound annual growth rate (CAGR)** — annualized multi-year growth. (Section F.)
- **Conversions / conversion attribution / conversion funnel / conversion rate** — funnel math. (Section B.)
- **Correlation coefficient** — strength of linear relationship. (Section F.)
- **Cost per acquisition (CPA)** — cost per conversion event. (Section A.)
- **Customer acquisition cost (CAC)** — cost per acquired customer. (Section A.)
- **Customer experience (CX)** — end-to-end experience. (Section J.)
- **Customer journey mapping** — visualizing the journey. (Section J.)
- **Customer lifetime value (CLV)** — total revenue from a customer. (Section E.)
- **Customer retention rate** — % still active. (Section D.)
- **Daily / Weekly / Monthly active users (DAU/WAU/MAU)** — engagement pulse. (Section C.)
- **Data cleansing / enrichment / integration / mining / normalization / pipeline / sampling / scrubbing / transformation / visualization** — the data layer. (Section I.)
- **Deep linking** — URLs that open specific in-app screens. (Section C.)
- **Descriptive / diagnostic / predictive / prescriptive analytics** — the maturity ladder. (Section G.)
- **Drill-down analysis** — segmenting a metric. (Section G.)
- **Drop-off rate** — % exiting at a step. (Section B.)
- **Dynamic segmentation** — segments that update as users move. (Section H.)
- **Engagement metrics / user engagement** — depth of use. (Section C.)
- **Event segmentation** — grouping by event behavior. (Section H.)
- **Event taxonomy** — the naming scheme for events. (Section I.)
- **Experiment design / experimentation** — A/B and beyond. (Section F.)
- **Exploratory data analysis (EDA)** — open-ended pattern discovery. (Section G.)
- **Feature adoption / feature usage** — per-feature usage stats. (Section B / C.)
- **File download** — download event. (Section C.)
- **Forecasting** — projecting future values. (Section G.)
- **Form submitted** — successful form submission. (Section B.)
- **Funnel analysis / funnel drop-off** — funnel math. (Section B.)
- **Go-to-market (GTM) strategy** — the launch plan. (Section A.)
- **Heuristic analysis** — expert-driven evaluation. (Section F.)
- **Hypothesis testing** — formal inference. (Section F.)
- **In-app messaging** — messages surfaced in product. (Section C.)
- **Key driver analysis** — finding the strongest predictors. (Section F.)
- **K-means clustering** — see cluster analysis. (Section H.)
- **Lagging / leading indicators** — reactive vs predictive metrics. (Section I.)
- **Lifecycle analysis** — stage-based user tracking. (Section D.)
- **Lifetime value (LTV)** — see CLV. (Section E.)
- **Link clicks** — click on a link. (Section C.)
- **Log-level data** — granular event logs. (Section I.)
- **Market basket analysis** — co-occurrence patterns. (Section H.)
- **Marketing qualified lead (MQL)** — high-intent prospect. (Section A.)
- **Mean absolute error** — average prediction error magnitude. (Section F.)
- **Mobile analytics** — telemetry from mobile. (Section C.)
- **Monte Carlo simulation** — outcome distributions via sampling. (Section F.)
- **Multichannel attribution** — credit across multiple channels. (Section A.)
- **Multivariate analysis** — multiple variables simultaneously. (Section F.)
- **Navigation click** — click on a nav element. (Section C.)
- **Net promoter score (NPS)** — recommendation likelihood. (Section J.)
- **Net retention rate** — revenue retention including expansion. (Section D.)
- **Onboarding / user onboarding** — first valuable use. (Section B.)
- **Operating expenses (OpEx)** — recurring cost. (Section E.)
- **Outlier detection** — finding unusual data points. (Section G.)
- **Page view** — page load event. (Section C.)
- **Path analysis** — actual user paths through the product. (Section C.)
- **Predictive analysis / modeling** — forecasting outcomes. (Section G.)
- **Prescriptive analytics** — what-to-do recommendations. (Section G.)
- **Product analytics / management / roadmap / strategy / features** — the product layer. (Section K.)
- **Product-led growth (PLG)** — product as growth engine. (Section B.)
- **Qualitative data** — non-numerical data. (Section J.)
- **Real-time analytics** — live dashboards. (Section G.)
- **Regression analysis** — predicting an output from inputs. (Section F.)
- **Retention analysis / curves / rate** — see Section D.
- **Return on ad spend (ROAS)** — revenue per ad rupee. (Section A.)
- **Revenue attribution** — see channel attribution. (Section A.)
- **Root cause analysis** — finding the underlying cause. (Section G.)
- **Sales qualified lead (SQL)** — sales-ready prospect. (Section A.)
- **Sentiment analysis** — inferring emotional tone. (Section J.)
- **Session duration / sessions** — activity blocks. (Section C.)
- **SQL querying** — the language of relational data. Used throughout your analytics stack; not a metric.
- **Statistical significance** — formal inference threshold. (Section F.)
- **Survival analysis** — time-to-event analysis. (Section D.)
- **SWOT analysis** — strengths/weaknesses/opportunities/threats. (Section K.)
- **Tag management** — managing tracking implementations. (Section I.)
- **Time series analysis** — analyzing time-ordered data. (Section G.)
- **Time to value (TTV)** — time to first value delivered. (Section B.)
- **Traffic sources** — where visits come from. (Section A.)
- **Trigger-based messaging** — messages fired by behavior. (Section C.)
- **Universally unique identifier (UUID)** — unique ID. (Section H.)
- **User behavior analytics** — see behavioral analytics. (Section H.)
- **User feedback loop** — capturing and acting on feedback. (Section J.)
- **User flows** — paths through the product. (Section C.)
- **User ID** — the durable identifier. (Section H.)
- **User onboarding** — see onboarding. (Section B.)
- **User persona / properties / segmentation / stories** — the user layer. (Sections H + K.)
- **Variance analysis** — comparing variance across groups. (Section F.)
- **Website analytics** — telemetry from web. (Section C.)

---

*This report is a living document. As Baseline scales past 1,000 committed plans, several sections (predictive analytics, behavioral cohorting, churn prediction) become tractable and should be revisited. Until then, the descriptive and diagnostic layers are where the leverage lives.*
