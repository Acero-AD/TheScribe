# Cross-Origin Resource Sharing for the frontend (Vite dev server, etc.).
#
# Allows the frontend origin to call the API with credentials so the
# session cookie is sent on every authenticated request.

allowed_origins =
  case Rails.env
  when "development", "test"
    [ "http://localhost:5173", "http://127.0.0.1:5173" ]
  else
    Array(ENV["FRONTEND_URL"]).reject(&:blank?)
  end

if allowed_origins.any?
  Rails.application.config.middleware.insert_before 0, Rack::Cors do
    allow do
      origins(*allowed_origins)

      resource "*",
        headers: :any,
        credentials: true,
        methods: [ :get, :post, :put, :patch, :delete, :options, :head ]
    end
  end
end
