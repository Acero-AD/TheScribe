# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_05_23_062740) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "daily_logs", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "date", null: false
    t.text "note"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.boolean "wrote", default: false, null: false
    t.datetime "wrote_at"
    t.index ["user_id", "date"], name: "index_daily_logs_on_user_id_and_date", unique: true
    t.index ["user_id", "date"], name: "index_daily_logs_on_user_id_and_date_desc", order: { date: :desc }
    t.index ["user_id"], name: "index_daily_logs_on_user_id"
  end

  create_table "magic_links", force: :cascade do |t|
    t.datetime "consumed_at"
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "token_digest", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["token_digest"], name: "index_magic_links_on_token_digest", unique: true
    t.index ["user_id", "expires_at"], name: "index_magic_links_on_user_id_and_expires_at"
    t.index ["user_id"], name: "index_magic_links_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "daily_logs", "users"
  add_foreign_key "magic_links", "users"
end
