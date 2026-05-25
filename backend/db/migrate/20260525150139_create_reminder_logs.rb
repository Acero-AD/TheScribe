class CreateReminderLogs < ActiveRecord::Migration[8.1]
  def change
    create_table :reminder_logs do |t|
      t.references :user, null: false, foreign_key: true
      t.date :date, null: false
      t.datetime :sent_at, null: false

      t.timestamps
    end

    # Load-bearing for one-reminder-per-user-per-day idempotency: the send job
    # creates this row before invoking web-push and treats a uniqueness
    # violation as "already sent, skip."
    add_index :reminder_logs, [ :user_id, :date ], unique: true
  end
end
