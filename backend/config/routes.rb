Rails.application.routes.draw do
  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  get "up" => "rails/health#show", as: :rails_health_check

  post "magic_links" => "magic_links#create", as: :magic_links
  get  "magic_links/:token" => "magic_links#show", as: :magic_link

  get    "me" => "sessions#show", as: :current_user
  delete "sessions/current" => "sessions#destroy", as: :current_session

  if Rails.env.development?
    mount LetterOpenerWeb::Engine, at: "/letter_opener"
  end
end
