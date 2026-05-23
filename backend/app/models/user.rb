class User < ApplicationRecord
  EMAIL_REGEX = /\A[^@\s]+@[^@\s]+\.[^@\s]+\z/

  has_many :magic_links, dependent: :destroy
  has_many :daily_logs, dependent: :destroy

  before_validation :normalize_email

  validates :email,
            presence: true,
            format: { with: EMAIL_REGEX },
            uniqueness: { case_sensitive: false }

  private

  def normalize_email
    self.email = email.to_s.strip.downcase if email.present?
  end
end
