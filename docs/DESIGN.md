# Design and reproducible scenarios

## Contract

The robot starts at zero-based `(1,5)`, facing east. The UI uses one-based column/row labels. Direction codes in the export are 0 north, 1 east, 2 south, 3 west. No distance in meters or physical speed is implied. A step is one adjacent grid cell, executed approximately every 650 ms while the visible page is active; browser timer delays can lengthen this interval.

Navigation is deterministic breadth-first search with neighbor order north, east, south, west. Every move is checked against room boundaries and six obstacle cells. There is no diagonal travel. The room and stations are fixed. BFS minimizes grid steps; it does not optimize robot kinematics or turning costs.

State is ready or moving. Information commands work in both states. Navigation/relative movement/turn commands are accepted only when ready. Stop empties the route; subsequent ticks have no effect. A new command cannot silently overwrite active movement. Hidden-tab cancellation prevents a background animation from continuing unobserved.

## Reproduce

1. Refresh. Send `go to the desk`. The route contains 11 steps from `(1,5)` to `(7,2)`, taking a detour around the central wall. There is one arrival event.
2. Refresh. Send `forward 5`. The route crosses obstacle `(4,5)`, so the entire request is rejected and position remains `(1,5)`.
3. Refresh. Send `go to plant`, then press Stop before arrival. Position remains at its last completed cell, route clears and the audit records cancellation.
4. While moving, send `go to dock`. It is rejected with an instruction to stop first. A status request still reports the ongoing route.
5. Use microphone if supported and permitted. Speak `go to desk`; verify the transcript appears for review and does not cause movement until Send. Deny permission or test in a browser without recognition; typed input must remain usable.
6. Export JSON. Compare final pose and steps with the displayed values. All command, planning, step, arrival, stop and reply/rejection events have sequential IDs and ISO timestamps.

## Test boundaries

The Node suite covers parser errors and ambiguity, legal shortest paths, all free start/goal pairs, atomic blocking, relative heading, turns, busy protection, stop, arrival and audit copy isolation. Speech lifecycle tests inject mocks for permissions, start failure, stale results, interruption and errors.

Manual browser checks cover layout, typed command flows, route animation, cancellation and export. Microphone tests require explicit local permission and a functioning browser service. Mock tests cannot replace those checks. This is an educational portfolio demonstration; no real-world robot safety or general conversational understanding is asserted.
