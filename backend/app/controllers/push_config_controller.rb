class PushConfigController < ApplicationController
  before_action :authenticate!

  def show
    render json: { vapid_public_key: Rails.application.config.x.vapid.public_key }
  end
end
