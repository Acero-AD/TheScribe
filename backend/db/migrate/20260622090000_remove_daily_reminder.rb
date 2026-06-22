class RemoveDailyReminder < ActiveRecord::Migration[8.1]
  def up
    drop_table :push_subscriptions
    drop_table :reminder_logs
    remove_column :users, :reminder_time
  end

  def down
    add_column :users, :reminder_time, :string

    create_table :reminder_logs do |t|
      t.bigint :user_id, null: false
      t.date :date, null: false
      t.datetime :sent_at, null: false
      t.timestamps
      t.index [ :user_id, :date ], unique: true
      t.index [ :user_id ]
    end
    add_foreign_key :reminder_logs, :users

    create_table :push_subscriptions do |t|
      t.bigint :user_id, null: false
      t.string :endpoint, null: false
      t.string :p256dh_key, null: false
      t.string :auth_key, null: false
      t.timestamps
      t.index [ :user_id, :endpoint ], unique: true
      t.index [ :user_id ]
    end
    add_foreign_key :push_subscriptions, :users
  end
end
