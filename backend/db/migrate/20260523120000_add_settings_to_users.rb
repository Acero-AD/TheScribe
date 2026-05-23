class AddSettingsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :reminder_time, :string
    add_column :users, :week_starts_on, :integer, default: 1, null: false
    add_column :users, :publishing_cadence, :string, default: "weekly", null: false
    add_column :users, :timezone, :string
  end
end
