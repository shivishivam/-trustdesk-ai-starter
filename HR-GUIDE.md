# Trust Desk: simple team operations (pilot)

Open `/team` on the existing Node server. The AI workspace at `/` is unchanged. No AI call, new API key, paid service or bank integration is required by this module.

## Owner setup
1. Login as Admin using the existing TRUSTDESK_ADMIN_TOKEN.
2. Add name and unique staff code. Privately share the generated personal employee key; do not share the admin token. Key is shown once; reset it if lost or exposed.
3. Staff use the same HTTPS `/team` address on their own phones with Employee selected.
4. Review attendance, enter a manually calculated final INR amount and salary month, save draft, review and approve. After paying separately, record the actual external reference. This module never sends money or verifies bank settlement.

## Why these features?
| Feature | Use | Benefit / limit |
|---|---|---|
| Personal employee access | Staff enter their own key | Staff cannot access others' records or payout APIs; key possession is not identity proof |
| Location check-in/out | Consent then tap a big button | Timestamped location snapshot; no background surveillance; GPS may be spoofed |
| Working timer | Visible after check-in | Elapsed shift time, including breaks, not payable hours |
| Attendance history | Owner reviews in/out + accuracy | Missing check-outs and duplicate open sessions are visible/blocked |
| Payout draft and approval | Manually reviewed final amount | Separates preparation, approval and external payment record; same admin, not independent maker-checker |
| Activity log + disk save | Automatic | App events retained across process restart on persistent disk; not tamper-proof |

## Comparison scope
The inspected starter was an AI task workspace with HR-labelled drafting agents, not an attendance/payroll product. This pilot adds concrete record flows. factoHR's public plans list attendance, payroll, face recognition and premium geofencing (https://factohr.com/plans/); this pilot does NOT claim parity with them.

Not implemented: salary computation, PF/ESI/TDS, payslips, geofence enforcement, face recognition, leave/shift policies, live tracking, bank transfer or independent finance approver roles. No pricing/billing was changed. Prior alert's quarterly-billing observation is not itself an HR product feature.

## Deployment and privacy gate
Use one Node process only, a persistent `data/` directory, authenticated HTTPS, encrypted disk/backups, employee notice and an agreed retention/access process. Do not use production employee data before those controls are ready. JSON writes are serialized and atomically renamed, but this is not a multi-instance database. On data corruption startup fails instead of silently wiping HR history. `data/hr.json` includes personal location and salary data; never commit it. Employee keys are SHA-256 hashed at rest; keys remain in browser memory only. Reload logs out.

Location requires HTTPS (localhost allowed) and fresh <=100m accuracy. Permission denied or weak GPS produces an error, not a false successful punch. No offline punches or manual correction in this pilot; contact admin for exceptions. Hours include breaks and overnight sessions. Owner must verify and resolve exceptions outside this pilot before calculating wages.

## Verification
Run `node --test hr.test.js` and `node --check server.js`. Validate on real iPhone Safari/Android over HTTPS before rollout. Do not deploy HR records using GitHub Pages: the repository's separate root index.html is not this server-backed module.
