class WeekLogsController < ApplicationController
  MAX_RANGE_DAYS = 728
  DEFAULT_FROM_OFFSET_WEEKS = 12

  before_action :authenticate!

  def show
    date = parse_date(params[:week_start_date])
    return render_invalid_date if date.nil?

    this_week_start = Time::ForUser.this_week_start(current_user)
    if date > this_week_start
      return render json: { error: { code: "week_not_readable", message: "Future weeks cannot be read." } },
                    status: :unprocessable_content
    end

    log = current_user.week_logs.find_by(week_start_date: date)
    render json: serialize(log, week_start_date: date).merge(publishing_streak: StreakCalculator.publishing_streak(current_user))
  end

  def update
    date = parse_date(params[:week_start_date])
    return render_invalid_date if date.nil?

    this_week_start = Time::ForUser.this_week_start(current_user)
    if date != this_week_start
      return render json: { error: { code: "week_not_editable", message: "Only the current week can be modified." } },
                    status: :unprocessable_content
    end

    log = current_user.week_logs.find_or_initialize_by(week_start_date: date)
    apply_changes!(log)
    log.save!

    render json: serialize(log, week_start_date: date).merge(publishing_streak: StreakCalculator.publishing_streak(current_user))
  end

  def index
    this_week_start = Time::ForUser.this_week_start(current_user)
    default_from = this_week_start - (DEFAULT_FROM_OFFSET_WEEKS * 7)

    if params[:from].present? && parse_date(params[:from]).nil?
      return render_invalid_date
    end
    if params[:to].present? && parse_date(params[:to]).nil?
      return render_invalid_date
    end

    from = parse_date(params[:from]) || default_from
    to = parse_date(params[:to]) || this_week_start

    if from > to
      return render json: { error: { code: "invalid_range", message: "from must be <= to." } },
                    status: :unprocessable_content
    end
    if (to - from).to_i > MAX_RANGE_DAYS
      return render json: { error: { code: "range_too_large", message: "Range may not exceed #{MAX_RANGE_DAYS} days." } },
                    status: :unprocessable_content
    end

    logs = current_user.week_logs.where(week_start_date: from..to).order(:week_start_date)
    render json: logs.map { |log| serialize(log, week_start_date: log.week_start_date) }
  end

  private

  def apply_changes!(log)
    body = params.permit(:published)

    if body.key?(:published)
      log.published = ActiveModel::Type::Boolean.new.cast(body[:published])
    end
  end

  def serialize(log, week_start_date:)
    if log&.persisted?
      {
        week_start_date: log.week_start_date.iso8601,
        published: log.published
      }
    else
      {
        week_start_date: week_start_date.iso8601,
        published: false
      }
    end
  end

  def parse_date(value)
    return nil if value.blank?
    Date.iso8601(value.to_s)
  rescue ArgumentError, TypeError
    nil
  end

  def render_invalid_date
    render json: { error: { code: "invalid_date", message: "Date must be YYYY-MM-DD." } },
           status: :unprocessable_content
  end
end
