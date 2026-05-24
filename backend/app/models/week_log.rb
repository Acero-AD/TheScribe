class WeekLog < ApplicationRecord
  belongs_to :user

  validates :week_start_date, presence: true
  validates :published, inclusion: { in: [ true, false ] }
  validates :user_id, uniqueness: { scope: :week_start_date }

  def self.for(user:, week_start_date:)
    find_by(user: user, week_start_date: week_start_date) ||
      new(user: user, week_start_date: week_start_date, published: false)
  end
end
