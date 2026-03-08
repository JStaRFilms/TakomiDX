# Future Follow-Ups

## Archive Guardrails

Current caveat:

- The UI currently shows `Archive Workspace` for any workspace that is not already archived.
- The backend archive method does not currently block active or otherwise unsafe states.

Product guardrails to add:

- Do not allow archive while a runtime is still active.
- Do not allow archive while an agent run is still active.
- Do not allow archive while validation or review is still in progress.

Implementation follow-up:

- Disable the archive action in Mission Control when the workspace is in an unsafe state.
- Reject unsafe archive attempts in the backend API, not just the UI.
- Return a clear operator-facing reason when archiving is blocked.
