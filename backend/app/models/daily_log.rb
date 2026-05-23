class DailyLog < ApplicationRecord
  belongs_to :user

  validates :date, presence: true
  validates :wrote, inclusion: { in: [ true, false ] }
  validates :user_id, uniqueness: { scope: :date }

  def self.for(user:, date:)
    find_by(user: user, date: date) || new(user: user, date: date, wrote: false)
  end

  def mark_wrote!(value)
    transaction do
      self.wrote = value
      self.wrote_at = value ? Time.current : nil
      save!
    end
  end
end
