class ApplicationController < ActionController::API
  include ActionController::Cookies

  # CSRF tokens are intentionally not used. This is a JSON-only API protected by:
  #   1. CORS allowlist with `credentials: true` (only the configured frontend
  #      origin can issue credentialed cross-origin requests).
  #   2. Same-site cookies (`SameSite=Lax` in prod; `None; Secure` cross-origin
  #      in dev where the Vite dev server lives on a different port).
  # See `config/initializers/cors.rb` and the session config in `application.rb`.

  before_action :set_current_user

  private

  def set_current_user
    Current.user = User.find_by(id: session[:user_id])
  end

  def current_user
    Current.user
  end

  def signed_in?
    Current.user.present?
  end

  def authenticate!
    return if signed_in?
    render json: { error: "unauthenticated" }, status: :unauthorized
  end

  def sign_in(user)
    reset_session
    session[:user_id] = user.id
    Current.user = user
  end

  def sign_out
    reset_session
    Current.user = nil
  end

  def frontend_url(path = "/sign-in", query: {})
    base = Rails.application.config.frontend_url
    uri = URI.join(base, path)
    uri.query = URI.encode_www_form(query) if query.present?
    uri.to_s
  end
end
