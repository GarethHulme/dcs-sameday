# Drivr-Sameday operating model

## Product placement

Drivr is the driver and delivery-work platform. Drivr-Sameday is a dedicated service line with its own booking, dispatch, route and client operations.

Keep one canonical People identity for each driver. Core and Drivr remain separate profile partitions and portal experiences. Do not create a third Sameday driver account or compliance record. Keep Sameday's booking and route records in its own domain because they have different lifecycle and dispatch rules from scheduled depot work.

A Portal Hub can be the authenticated front door for DCS Core, Drivr and Drivr-Sameday. It should route people to the right workspace and preserve role and tenant context. It should not replace the focused dispatch workspace with a single overloaded portal.

## Product surfaces

| Surface | Primary user | Responsibility |
| --- | --- | --- |
| Drivr-Sameday Operations | Dispatcher / manager | Booking intake, service promises, driver matching, route planning, exceptions and completion |
| Drivr Portal | Eligible Drivr driver | Sameday opt-in, work offers, assigned route, stop navigation, delivery evidence and support in Drivr branding |
| Core Driver Portal | Eligible Core driver | The same Sameday work functions in the existing Core experience, when Core access is enabled |
| Client workspace | Client / sender | Create bookings, provide stop details, see status, handle exceptions and review proof of delivery |
| Portal Hub | Any authenticated user | Select and launch an authorised product workspace |

Sameday eligibility is service-scoped. A driver's existing Core or Drivr partition determines which portal they use; Sameday access does not move a Core driver into Drivr or merge the two portals. Identity and person-level compliance remain canonical in People.

## System ownership

- **People** owns canonical identity, driver number, contact details, right-to-work and compliance evidence.
- **Drivr Portal and Core Driver Portal** own their separate driver experiences. Both can present Sameday controls to eligible drivers through a common Sameday service API.
- **Roster** owns planned depot work and date-based availability. Its calendar availability is not a live Sameday-presence signal.
- **Drivr-Sameday** owns bookings, structured stops, route sequence, assignment, operational status, exceptions and delivery evidence references.
- **Engage** owns communication rules, delivery and acknowledgement evidence. Sameday publishes verified events; it does not build a second campaign engine.
- **Fleet** supplies vehicle eligibility and, later, approved vehicle telemetry where the work and user consent allow it.

## Current implementation

The legacy Sameday app has its own local users and SQLite database, a separate ad-hoc pool, bookings represented as jobs, manual driver assignment and a basic client portal. SSO currently maps people into the local account table by email. This is not yet canonical Drivr identity sharing.

The dispatch workspace and structured-stop flow are now the first operating slice:

1. Create a booking with one or more ordered delivery addresses, recipient details, parcel counts, delivery windows and instructions.
2. Review bookings in the dispatch board.
3. Manually set stop order while the booking is open.
4. Assign an eligible Sameday pool driver.
5. The driver starts the route, opens each stop in Maps, and marks the booking complete.

The stop order is currently manual. The product does not yet optimize routes, estimate reliable ETAs, stream GPS, record per-stop proof of delivery or identify live driver availability. Exact stop details are hidden from unassigned drivers.

## Driver supply and location

The existing Driver Portal availability API is date-based and syncs work availability to Roster. That is appropriate for calendar commitments, but it does not represent a driver turning on for a same-day dispatch window.

Add a separate Sameday service-presence control in the Drivr Portal and, for eligible Core drivers, the Core Driver Portal. Both should use the same Sameday API contract for service area, vehicle capability, start/end window and current willingness to receive work. Use the canonical driver number as the cross-system key; do not join identities on email alone.

Location should begin only after the driver opts into active Sameday work. Use the minimum update frequency needed for matching or an active delivery, and stop sharing when the driver turns off or finishes the work. A live map should show freshness and accuracy, not imply that an old coordinate is current. The current web app has no location stream or `watchPosition` implementation.

## Engage event contract

Sameday should publish idempotent, timestamped operational events keyed by a stable booking reference and canonical driver number. Initial event types:

- `booking.confirmed`
- `driver.offer.sent`
- `driver.offer.accepted` / `driver.offer.declined`
- `route.started`
- `stop.completed`
- `delivery.exception`
- `booking.completed`

Events should contain only the fields needed for the configured message: event ID, booking reference, driver number, event time, service status, client reference and a verified ETA or exception summary when present. Engage decides whether and how to notify the driver or client and records delivery evidence.

Engage's current Route Updates / Route Progress setup is not a ready-made Sameday tracking feed. The current route-progress implementation reports sending disabled until its source data, driver submission and staff delivery paths are connected. Sameday events need their own source contract and recipient rules; do not activate placeholder messages or confuse route-progress summaries with client tracking.

## Build sequence

1. **Operations foundation — current PR:** dispatch landing, booking intake with structured stops, manual sequence planning, assignment, route start and access-controlled stop details.
2. **Canonical driver connection:** resolve People identity by driver number, surface Sameday eligibility from canonical records, and add service-scoped opt-in in Drivr Portal and Core Driver Portal according to partition and entitlement.
3. **Reliable dispatch supply:** availability window, vehicle and capacity matching, offer / accept / decline, expiry and reassignment. Keep roster calendar availability separate.
4. **Route execution:** approved route optimization, driver navigation, per-stop status, proof of delivery and exception workflow.
5. **Engage and client visibility:** verified event producer, idempotent event delivery, client status page and configurable notifications.
6. **Performance and finance:** quote-to-cost margin, driver settlement, service-level performance and audit.

The next implementation dependency after this PR is canonical driver identity plus the Sameday opt-in contract. It unlocks safe matching and future tracking across the two existing portals without creating a third driver portal.
