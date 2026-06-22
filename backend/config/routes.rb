Rails.application.routes.draw do
  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  get "up" => "rails/health#show", as: :rails_health_check

  post "magic_links" => "magic_links#create", as: :magic_links
  # GET validates only (prefetch-safe); the SPA confirm screen POSTs to consume.
  get  "magic_links/:token" => "magic_links#show", as: :magic_link
  post "magic_links/:token/consume" => "magic_links#consume", as: :consume_magic_link

  get    "me" => "sessions#show", as: :current_user
  patch  "me/settings" => "me/settings#update", as: :current_user_settings
  delete "sessions/current" => "sessions#destroy", as: :current_session

  # daily_logs: PUT only for update (no PATCH alias). The :date param accepts
  # YYYY-MM-DD; the constraint relaxes the default Rails :id matcher which
  # would otherwise strip the dots/dashes.
  get "daily_logs"       => "daily_logs#index",  as: :daily_logs
  get "daily_logs/:date" => "daily_logs#show",   as: :daily_log,
      constraints: { date: %r{\d{4}-\d{2}-\d{2}} }
  put "daily_logs/:date" => "daily_logs#update",
      constraints: { date: %r{\d{4}-\d{2}-\d{2}} }

  # week_logs: same shape as daily_logs but keyed on the week-start Date
  # (`YYYY-MM-DD`). The server validates the date is the user's current
  # week-start under their `week_starts_on` setting.
  get "week_logs"                  => "week_logs#index", as: :week_logs
  get "week_logs/:week_start_date" => "week_logs#show",  as: :week_log,
      constraints: { week_start_date: %r{\d{4}-\d{2}-\d{2}} }
  put "week_logs/:week_start_date" => "week_logs#update",
      constraints: { week_start_date: %r{\d{4}-\d{2}-\d{2}} }

  # history: bundled read endpoint for the History screen.
  get "history" => "history#show", as: :history

  if Rails.env.development?
    mount LetterOpenerWeb::Engine, at: "/letter_opener"
  end
end
