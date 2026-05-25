class HistoryController < ApplicationController
  before_action :authenticate!

  def show
    month = parse_month(params[:month])
    return render_invalid_month if month.nil?

    today = Time::ForUser.today(current_user)
    current_month = Date.new(today.year, today.month, 1)
    if month > current_month
      return render json: { error: { code: "month_not_readable", message: "Future months cannot be read." } },
                    status: :unprocessable_content
    end

    month_end = month.end_of_month
    daily_logs = current_user.daily_logs.where(date: month..month_end).order(:date)
    week_logs = current_user.week_logs
      .where(week_start_date: (month - 6.days)..month_end)
      .order(:week_start_date)

    render json: {
      month: format_month(month),
      daily_logs: daily_logs.map { |log| serialize_daily(log) },
      week_logs: week_logs.map { |log| serialize_week(log) },
      writing_streak_current: StreakCalculator.writing_streak(current_user),
      writing_streak_best: StreakCalculator.best_writing_streak(current_user),
      publishing_streak_current: StreakCalculator.publishing_streak(current_user)
    }
  end

  private

  def parse_month(value)
    return nil if value.blank?
    match = value.to_s.match(/\A(\d{4})-(\d{2})\z/)
    return nil unless match
    Date.new(match[1].to_i, match[2].to_i, 1)
  rescue ArgumentError, TypeError
    nil
  end

  def format_month(date)
    "%04d-%02d" % [ date.year, date.month ]
  end

  def serialize_daily(log)
    {
      date: log.date.iso8601,
      wrote: log.wrote,
      wrote_at: log.wrote_at&.iso8601,
      note: log.note
    }
  end

  def serialize_week(log)
    {
      week_start_date: log.week_start_date.iso8601,
      published: log.published
    }
  end

  def render_invalid_month
    render json: { error: { code: "invalid_month", message: "Month must be YYYY-MM." } },
           status: :unprocessable_content
  end
end
