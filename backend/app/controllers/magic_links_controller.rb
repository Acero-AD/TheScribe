class MagicLinksController < ApplicationController
  GENERIC_MESSAGE = "If that account exists, we sent a link.".freeze
  RATE_LIMIT = 5
  RATE_WINDOW = 60.minutes

  def create
    email = params[:email].to_s.strip.downcase

    unless email.match?(User::EMAIL_REGEX)
      return render json: { errors: { email: [ "is invalid" ] } }, status: :unprocessable_content
    end

    user = User.find_or_create_by!(email: email)

    if rate_limited?(user)
      return render json: { message: GENERIC_MESSAGE }, status: :ok
    end

    _link, raw_token = MagicLink.issue!(user: user)
    UserMailer.magic_link(user, raw_token).deliver_later

    render json: { message: GENERIC_MESSAGE }, status: :ok
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors }, status: :unprocessable_content
  end

  def show
    link = MagicLink.find_by_raw_token(params[:token])

    if link.nil?
      return redirect_to frontend_url("/sign-in", query: { error: "invalid" }),
                         allow_other_host: true
    end

    if link.consumed_at.present?
      return redirect_to frontend_url("/sign-in", query: { error: "consumed" }),
                         allow_other_host: true
    end

    unless link.expires_at.future?
      return redirect_to frontend_url("/sign-in", query: { error: "expired" }),
                         allow_other_host: true
    end

    link.consume!
    sign_in(link.user)

    redirect_to frontend_url("/"), allow_other_host: true
  end

  private

  def rate_limited?(user)
    user.magic_links.where("created_at > ?", RATE_WINDOW.ago).count >= RATE_LIMIT
  end
end
