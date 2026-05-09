require_relative "boot"

require "rails/all"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Backend
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # Only loads a smaller set of middleware suitable for API only apps.
    # Middleware like session, flash, cookies can be added back manually.
    # Skip views, helpers and assets when generating a new resource.
    config.api_only = true

    # The frontend that magic-link verification redirects back to.
    config.frontend_url = ENV.fetch("FRONTEND_URL", "http://localhost:5173")

    # Re-enable cookies + session for API-only mode (needed for cookie-based auth).
    # In dev, the frontend (:5173) and backend (:3000) are cross-origin, so the
    # cookie must be SameSite=None; Secure. Chrome treats localhost as a secure
    # context, so Secure cookies work over plain HTTP on localhost.
    config.middleware.use ActionDispatch::Cookies
    config.middleware.use ActionDispatch::Session::CookieStore,
                          key: "_scoreboard_session",
                          same_site: Rails.env.production? ? :lax : :none,
                          secure: !Rails.env.test?,
                          httponly: true
  end
end
