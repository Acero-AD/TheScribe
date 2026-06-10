require "uri"

class PushSubscription < ApplicationRecord
  belongs_to :user

  validates :endpoint, presence: true
  validates :p256dh_key, presence: true
  validates :auth_key, presence: true
  validates :endpoint, uniqueness: { scope: :user_id }
  validate :endpoint_is_a_trusted_push_url

  # True when `host` is (or is a subdomain of) an allowlisted push provider.
  def self.allowed_endpoint_host?(host)
    return false if host.blank?
    host = host.downcase
    Rails.application.config.x.push.allowed_endpoint_host_suffixes.any? do |suffix|
      host == suffix || host.end_with?(".#{suffix}")
    end
  end

  private

  # Reject any endpoint that is not an https URL on an allowlisted provider
  # host. This is the SSRF guard for the server-side request the send job
  # later makes; it inherently rejects loopback/link-local/private hosts and
  # plain-http endpoints because none of those are on the allowlist.
  def endpoint_is_a_trusted_push_url
    return if endpoint.blank? # presence validation already covers this

    uri = URI.parse(endpoint)
    unless uri.is_a?(URI::HTTPS) && self.class.allowed_endpoint_host?(uri.host)
      errors.add(:endpoint, "is not a recognized push service URL")
    end
  rescue URI::InvalidURIError
    errors.add(:endpoint, "is not a valid URL")
  end
end
