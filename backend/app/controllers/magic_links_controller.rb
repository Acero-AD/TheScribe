class MagicLinksController < ApplicationController
  GENERIC_MESSAGE = "If that account exists, we sent a link.".freeze
  RATE_LIMIT = 5
  RATE_WINDOW = 60.minutes

  def create
    email = params[:email].to_s.strip.downcase

    unless email.match?(User::EMAIL_REGEX)
      return render json: { errors: { email: [ "is invalid" ] } }, status: :unprocessable_content
    end

    # Defer user creation until we actually issue a link. A rate-limited
    # existing user (or any request that never issues) must not create rows,
    # so anonymous traffic can't grow the users table unbounded.
    user = User.find_by(email: email)

    if user && rate_limited?(user)
      return render json: { message: GENERIC_MESSAGE }, status: :ok
    end

    user ||= User.create!(email: email)
    _link, raw_token = MagicLink.issue!(user: user)
    UserMailer.magic_link(user, raw_token).deliver_later

    render json: { message: GENERIC_MESSAGE }, status: :ok
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors }, status: :unprocessable_content
  end

  # GET is validate-only and never mutates: email-security scanners and
  # link-prefetchers issue GETs, so consuming here would burn the one-time
  # link before the user clicks. Invalid/expired/consumed links bounce to
  # sign-in with an error; a still-valid link hands the (unused) token to the
  # SPA confirm screen, which POSTs to #consume.
  def show
    error = validation_error_for(MagicLink.find_by_raw_token(params[:token]))
    if error
      return redirect_to frontend_url("/sign-in", query: { error: error }),
                         allow_other_host: true
    end

    redirect_to frontend_url("/sign-in/confirm", query: { token: params[:token] }),
                allow_other_host: true
  end

  # POST consumes the link and establishes the session. Re-checks validity
  # because the link may have expired or been consumed since the GET.
  def consume
    link = MagicLink.find_by_raw_token(params[:token])
    error = validation_error_for(link)
    if error
      return render json: { error: { code: error } }, status: :unprocessable_content
    end

    link.consume!
    sign_in(link.user)
    render json: { ok: true }, status: :ok
  end

  private

  # Returns an error code ("invalid" / "consumed" / "expired") when the link
  # cannot be used, or nil when it is valid.
  def validation_error_for(link)
    return "invalid" if link.nil?
    return "consumed" if link.consumed_at.present?
    return "expired" unless link.expires_at.future?
    nil
  end

  def rate_limited?(user)
    user.magic_links.where("created_at > ?", RATE_WINDOW.ago).count >= RATE_LIMIT
  end
end
