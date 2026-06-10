class WeekLog < ApplicationRecord
  belongs_to :user

  validates :week_start_date, presence: true
  validates :published, inclusion: { in: [ true, false ] }
  validates :user_id, uniqueness: { scope: :week_start_date }
end
