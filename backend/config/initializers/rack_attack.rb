# Per-IP throttle for magic-link requests.
#
# The per-email limit (MagicLinksController) caps how often one address can be
# targeted; this caps a single source spraying requests across many distinct
# emails, which is what bounds unbounded user creation. Counts are kept in
# Rails.cache (Solid Cache in production; the null store in test means the
# throttle is inert there unless a test swaps in a real store).
class Rack::Attack
  # Explicit so the store is predictable: Solid Cache in production, the null
  # store in test (which makes the throttle inert unless a test swaps it).
  self.cache.store = Rails.cache

  throttle("magic_links/ip", limit: 10, period: 1.hour) do |request|
    request.ip if request.post? && request.path == "/magic_links"
  end
end
