module Me
  class SettingsController < ApplicationController
    PERMITTED_FIELDS = %i[reminder_time week_starts_on publishing_cadence timezone].freeze

    before_action :authenticate!

    def update
      attributes = settings_params
      if current_user.update(attributes)
        render json: current_user.settings_attributes
      else
        render json: { errors: current_user.errors.as_json }, status: :unprocessable_content
      end
    end

    private

    def settings_params
      params.permit(*PERMITTED_FIELDS).to_h.symbolize_keys
    end
  end
end
