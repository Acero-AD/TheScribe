class SessionsController < ApplicationController
  before_action :authenticate!, only: :show

  def show
    render json: {
      id: current_user.id,
      email: current_user.email,
      settings: current_user.settings_attributes
    }
  end

  def destroy
    sign_out
    render json: { ok: true }
  end
end
