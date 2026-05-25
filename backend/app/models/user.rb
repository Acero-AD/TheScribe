class User < ApplicationRecord
  EMAIL_REGEX = /\A[^@\s]+@[^@\s]+\.[^@\s]+\z/
  REMINDER_TIME_REGEX = /\A([01]\d|2[0-3]):[0-5]\d\z/
  WEEK_STARTS_ON_VALUES = [ 0, 1 ].freeze
  PUBLISHING_CADENCE_VALUES = %w[weekly biweekly].freeze

  has_many :magic_links, dependent: :destroy
  has_many :daily_logs, dependent: :destroy
  has_many :week_logs, dependent: :destroy
  has_many :push_subscriptions, dependent: :destroy
  has_many :reminder_logs, dependent: :destroy

  before_validation :normalize_email

  validates :email,
            presence: true,
            format: { with: EMAIL_REGEX },
            uniqueness: { case_sensitive: false }

  validates :week_starts_on, inclusion: { in: WEEK_STARTS_ON_VALUES }
  validates :publishing_cadence, inclusion: { in: PUBLISHING_CADENCE_VALUES }
  validates :reminder_time, format: { with: REMINDER_TIME_REGEX }, allow_nil: true
  validate :timezone_is_recognized

  def settings_attributes
    {
      reminder_time: reminder_time,
      week_starts_on: week_starts_on,
      publishing_cadence: publishing_cadence,
      timezone: timezone
    }
  end

  private

  def normalize_email
    self.email = email.to_s.strip.downcase if email.present?
  end

  def timezone_is_recognized
    return if timezone.blank?
    return if ActiveSupport::TimeZone[timezone].present?
    errors.add(:timezone, "is not a recognized IANA timezone")
  end
end
