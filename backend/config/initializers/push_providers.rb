# Allowlist of host suffixes for Web Push `endpoint` URLs.
#
# `POST /push_subscriptions` stores a client-supplied `endpoint`, and
# `SendReminderJob` later issues a server-side request to it. An unvalidated
# endpoint is therefore an SSRF vector (an attacker could point it at an
# internal address). The model rejects any endpoint that is not an https URL
# whose host matches one of these provider suffixes. Add new push providers
# here as browsers adopt them — no code change required.
Rails.application.config.x.push.allowed_endpoint_host_suffixes = %w[
  fcm.googleapis.com
  push.services.mozilla.com
  notify.windows.com
  wns.windows.com
  push.apple.com
]
