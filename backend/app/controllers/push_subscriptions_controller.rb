class PushSubscriptionsController < ApplicationController
  before_action :authenticate!

  # POST /push_subscriptions
  # Body: { endpoint, p256dh_key, auth_key }. Upserts on (user_id, endpoint):
  # 201 when a new row is persisted, 200 when an existing row is updated.
  def create
    attrs = subscription_params

    subscription = current_user.push_subscriptions.find_or_initialize_by(endpoint: attrs[:endpoint].to_s)
    was_new = subscription.new_record?
    subscription.p256dh_key = attrs[:p256dh_key]
    subscription.auth_key = attrs[:auth_key]

    if subscription.save
      render json: { id: subscription.id }, status: was_new ? :created : :ok
    else
      render json: { error: { code: "invalid_subscription", message: subscription.errors.full_messages.to_sentence } },
             status: :unprocessable_content
    end
  end

  # DELETE /push_subscriptions/current
  # Body or param: { endpoint }. Idempotent: deleting an unknown endpoint
  # (or one belonging to another user) still responds 200.
  def destroy_current
    endpoint = params[:endpoint]
    current_user.push_subscriptions.where(endpoint: endpoint).delete_all if endpoint.present?
    render json: { ok: true }, status: :ok
  end

  private

  def subscription_params
    params.permit(:endpoint, :p256dh_key, :auth_key)
  end
end
