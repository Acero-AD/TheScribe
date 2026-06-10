## MODIFIED Requirements

### Requirement: Backend SHALL accept partial PUT bodies idempotently

The backend SHALL accept `{ wrote?, note? }` on `PUT /daily_logs/:date`. Fields not supplied SHALL not be modified. Sending the same `wrote` value multiple times SHALL be a no-op. When `wrote` flips from false to true, `wrote_at` SHALL be set to the current time; when it flips from true to false, `wrote_at` SHALL be cleared to null. The `note` SHALL be bounded by a maximum length; a note exceeding that limit SHALL be rejected with 422 and SHALL NOT be persisted, so a client cannot store unbounded text.

#### Scenario: Toggle wrote on
- **WHEN** the user PUTs `{ wrote: true }` on a row currently `wrote: false`
- **THEN** the row becomes `wrote: true` and `wrote_at` is set to the current time

#### Scenario: Toggle wrote off
- **WHEN** the user PUTs `{ wrote: false }` on a row currently `wrote: true`
- **THEN** the row becomes `wrote: false` and `wrote_at` becomes null

#### Scenario: Re-asserting the same wrote value
- **WHEN** the user PUTs `{ wrote: true }` on a row already `wrote: true`
- **THEN** the row is unchanged and `wrote_at` is not updated

#### Scenario: Note-only update preserves wrote
- **WHEN** the user PUTs `{ note: "edited" }` on a row currently `wrote: true`
- **THEN** the row's `note` is updated to "edited" and `wrote` and `wrote_at` are unchanged

#### Scenario: Empty body returns current state
- **WHEN** the user PUTs `{}` on an existing row
- **THEN** the backend responds 200 with the unchanged row's representation

#### Scenario: Over-length note is rejected
- **WHEN** the user PUTs a `note` whose length exceeds the configured maximum
- **THEN** the backend responds 422 and the row's `note` is not changed
