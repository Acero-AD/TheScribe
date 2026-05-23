class CreateDailyLogs < ActiveRecord::Migration[8.1]
  def change
    create_table :daily_logs do |t|
      t.references :user, null: false, foreign_key: true
      t.date :date, null: false
      t.boolean :wrote, null: false, default: false
      t.datetime :wrote_at
      t.text :note

      t.timestamps
    end

    add_index :daily_logs, [ :user_id, :date ], unique: true
    add_index :daily_logs, [ :user_id, :date ], order: { date: :desc }, name: "index_daily_logs_on_user_id_and_date_desc"
  end
end
