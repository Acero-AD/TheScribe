class DailyLog < ApplicationRecord
  belongs_to :user

  # Bound note size so a client can't store unbounded text in the `note`
  # column. ~10k characters is generous for a daily reflection.
  NOTE_MAX_LENGTH = 10_000

  validates :date, presence: true
  validates :wrote, inclusion: { in: [ true, false ] }
  validates :user_id, uniqueness: { scope: :date }
  validates :note, length: { maximum: NOTE_MAX_LENGTH }, allow_nil: true
end
