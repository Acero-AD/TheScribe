class DailyLogsController < ApplicationController
  MAX_RANGE_DAYS = 366
  DEFAULT_FROM_OFFSET_DAYS = 90

  before_action :authenticate!

  def show
    date = parse_date(params[:date])
    return render_invalid_date if date.nil?

    today = Time::ForUser.today(current_user)
    if date > today
      return render json: { error: { code: "date_not_readable", message: "Future dates cannot be read." } },
                    status: :unprocessable_content
    end

    log = current_user.daily_logs.find_by(date: date)
    render json: serialize(log, date: date).merge(writing_streak: StreakCalculator.writing_streak(current_user))
  end

  def update
    date = parse_date(params[:date])
    return render_invalid_date if date.nil?

    today = Time::ForUser.today(current_user)
    if date != today
      return render json: { error: { code: "date_not_editable", message: "Only today's log can be modified." } },
                    status: :unprocessable_content
    end

    log = current_user.daily_logs.find_or_initialize_by(date: date)
    apply_changes!(log)
    unless log.save
      return render json: { error: { code: "invalid_log", message: log.errors.full_messages.to_sentence } },
                    status: :unprocessable_content
    end

    render json: serialize(log, date: date).merge(writing_streak: StreakCalculator.writing_streak(current_user))
  end

  def index
    today = Time::ForUser.today(current_user)
    from = parse_date(params[:from]) || (today - DEFAULT_FROM_OFFSET_DAYS)
    to = parse_date(params[:to]) || today

    if params[:from].present? && parse_date(params[:from]).nil?
      return render_invalid_date
    end
    if params[:to].present? && parse_date(params[:to]).nil?
      return render_invalid_date
    end

    if from > to
      return render json: { error: { code: "invalid_range", message: "from must be <= to." } },
                    status: :unprocessable_content
    end
    if (to - from).to_i > MAX_RANGE_DAYS
      return render json: { error: { code: "range_too_large", message: "Range may not exceed #{MAX_RANGE_DAYS} days." } },
                    status: :unprocessable_content
    end

    logs = current_user.daily_logs.where(date: from..to).order(:date)
    render json: logs.map { |log| serialize(log, date: log.date) }
  end

  private

  def apply_changes!(log)
    body = params.permit(:wrote, :note)

    if body.key?(:wrote)
      next_wrote = ActiveModel::Type::Boolean.new.cast(body[:wrote])
      if next_wrote != log.wrote
        log.wrote = next_wrote
        log.wrote_at = next_wrote ? Time.current : nil
      end
    end

    if body.key?(:note)
      raw = body[:note]
      log.note = raw.is_a?(String) && raw.strip.empty? ? nil : raw
    end
  end

  def serialize(log, date:)
    if log&.persisted?
      {
        date: log.date.iso8601,
        wrote: log.wrote,
        wrote_at: log.wrote_at&.iso8601,
        note: log.note
      }
    else
      {
        date: date.iso8601,
        wrote: false,
        wrote_at: nil,
        note: nil
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
