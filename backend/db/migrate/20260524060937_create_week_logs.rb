class CreateWeekLogs < ActiveRecord::Migration[8.1]
  def change
    create_table :week_logs do |t|
      t.references :user, null: false, foreign_key: true
      t.date :week_start_date, null: false
      t.boolean :published, null: false, default: false

      t.timestamps
    end

    add_index :week_logs, [ :user_id, :week_start_date ], unique: true
    add_index :week_logs, [ :user_id, :week_start_date ],
              order: { week_start_date: :desc },
              name: "index_week_logs_on_user_id_and_week_start_date_desc"
  end
end
