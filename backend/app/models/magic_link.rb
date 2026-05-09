require "openssl"
require "securerandom"

class MagicLink < ApplicationRecord
  TOKEN_TTL = 15.minutes

  belongs_to :user

  validates :token_digest, presence: true, uniqueness: true
  validates :expires_at, presence: true

  scope :outstanding, -> { where(consumed_at: nil).where("expires_at > ?", Time.current) }

  def self.digest_for(raw_token)
    OpenSSL::HMAC.hexdigest("SHA256", token_signing_secret, raw_token.to_s)
  end

  def self.issue!(user:)
    transaction do
      user.magic_links.outstanding.update_all(consumed_at: Time.current)
      raw_token = SecureRandom.urlsafe_base64(32)
      record = create!(
        user: user,
        token_digest: digest_for(raw_token),
        expires_at: TOKEN_TTL.from_now
      )
      [ record, raw_token ]
    end
  end

  def self.find_by_raw_token(raw_token)
    return nil if raw_token.blank?
    find_by(token_digest: digest_for(raw_token))
  end

  def valid_for_use?
    consumed_at.nil? && expires_at.future?
  end

  def consume!
    update!(consumed_at: Time.current)
  end

  def self.token_signing_secret
    Rails.application.key_generator.generate_key("magic-link-token-digest")
  end
  private_class_method :token_signing_secret
end
