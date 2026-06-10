class DailyLog < ApplicationRecord
  belongs_to :user

  validates :date, presence: true
  validates :wrote, inclusion: { in: [ true, false ] }
  validates :user_id, uniqueness: { scope: :date }
end
