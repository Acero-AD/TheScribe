class PushConfigController < ApplicationController
  before_action :authenticate!

  def show
    public_key = Rails.application.config.x.vapid.public_key.presence

    if public_key.nil?
      render json: { error: "push_not_configured" }, status: :service_unavailable
      return
    end

    render json: { vapid_public_key: public_key }
  end
end
