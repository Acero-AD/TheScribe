class ReminderLog < ApplicationRecord
  belongs_to :user

  validates :date, presence: true
  validates :sent_at, presence: true
  validates :date, uniqueness: { scope: :user_id }
end
