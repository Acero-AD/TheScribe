# Computes the user's current writing and publishing streaks on demand.
#
# Algorithms live in `openspec/specs/streaks/spec.md`. The high-level shape:
#
# - Writing streak: walk back day-by-day from `Time::ForUser.today(user)` through
#   `DailyLog` rows where `wrote = true`, with one-day tolerance for today being
#   unmarked.
# - Publishing streak: cadence-aware. Weekly walks back in 7-day steps from
#   `Time::ForUser.this_week_start(user)` over `WeekLog` rows with
#   `published = true`. Biweekly walks back in 2-week buckets and counts a bucket
#   if either of its two weeks has a published row.
#
# Lookups against `WeekLog` use a 7-day window starting at the anchor date so
# rows created under a previous `week_starts_on` setting still resolve.
class StreakCalculator
  # Bound the walk at four years (one leap day included). Generous enough that
  # nobody we serve will hit it in practice, small enough that a corrupt-data
  # user can't drag the whole table into memory.
  LOOKBACK_DAYS = 1461

  def self.writing_streak(user)
    new(user).writing_streak
  end

  def self.publishing_streak(user)
    new(user).publishing_streak
  end

  def initialize(user)
    @user = user
  end

  def writing_streak
    today = Time::ForUser.today(@user)
    wrote_by_date = load_wrote_by_date(today)

    cursor = today
    today_wrote = wrote_by_date[today] == true
    yesterday_wrote = wrote_by_date[today - 1] == true

    return 0 unless today_wrote || yesterday_wrote
    cursor = today - 1 unless today_wrote

    streak = 0
    while wrote_by_date[cursor] == true
      streak += 1
      cursor -= 1
    end
    streak
  end

  def publishing_streak
    case @user.publishing_cadence
    when "weekly"   then publishing_streak_weekly
    when "biweekly" then publishing_streak_biweekly
    else 0
    end
  end

  private

  def publishing_streak_weekly
    this_week_start = Time::ForUser.this_week_start(@user)
    published_by_anchor = load_published_by_anchor(this_week_start)

    cursor = this_week_start
    this_week = bool(published_by_anchor[this_week_start])
    last_week = bool(published_by_anchor[this_week_start - 7])

    return 0 unless this_week || last_week
    cursor = this_week_start - 7 unless this_week

    streak = 0
    while bool(published_by_anchor[cursor])
      streak += 1
      cursor -= 7
    end
    streak
  end

  def publishing_streak_biweekly
    this_week_start = Time::ForUser.this_week_start(@user)
    published_by_anchor = load_published_by_anchor(this_week_start)

    current_bucket = bucket_published?(published_by_anchor, this_week_start, 0)
    prior_bucket = bucket_published?(published_by_anchor, this_week_start, 1)

    return 0 unless current_bucket || prior_bucket
    cursor_idx = current_bucket ? 0 : 1

    streak = 0
    while bucket_published?(published_by_anchor, this_week_start, cursor_idx)
      streak += 1
      cursor_idx += 1
    end
    streak
  end

  # A bucket of index `idx` is the pair of consecutive weeks
  #   [this_week_start - (idx*14).days, this_week_start - (idx*14 + 7).days]
  # It is "published" if either week has any WeekLog with published = true
  # in its 7-day tolerance window.
  def bucket_published?(published_by_anchor, this_week_start, idx)
    week_a = this_week_start - (idx * 14)
    week_b = week_a - 7
    bool(published_by_anchor[week_a]) || bool(published_by_anchor[week_b])
  end

  # Single query for all DailyLog rows within the lookback window, indexed
  # by date for O(1) lookups in the walk loop.
  def load_wrote_by_date(today)
    from = today - LOOKBACK_DAYS
    rows = @user.daily_logs.where(date: from..today).pluck(:date, :wrote)
    rows.to_h
  end

  # Returns a hash keyed by the user's current anchor date (this_week_start − n*7),
  # value is true if any WeekLog row falls in the 7-day window
  # [anchor, anchor + 6 days] with published = true. This tolerates historical
  # rows created under a previous `week_starts_on` setting.
  def load_published_by_anchor(this_week_start)
    # Bring back two extra weeks past the lookback so a window that begins at
    # the oldest anchor we'll inspect still has its tail in scope.
    from = this_week_start - LOOKBACK_DAYS - 7
    to = this_week_start + 6
    rows = @user.week_logs
      .where(week_start_date: from..to, published: true)
      .pluck(:week_start_date)

    # Sort once descending so we can match each anchor to the latest in-window row.
    sorted = rows.sort.reverse

    anchors_in_window(this_week_start).each_with_object({}) do |anchor, acc|
      window_end = anchor + 6
      hit = sorted.any? { |d| d >= anchor && d <= window_end }
      acc[anchor] = true if hit
    end
  end

  def anchors_in_window(this_week_start)
    # Generate every weekly anchor within the lookback window, plus a couple of
    # extras in case biweekly bucket math walks slightly past LOOKBACK_DAYS.
    count = (LOOKBACK_DAYS / 7) + 4
    (0..count).map { |n| this_week_start - (n * 7) }
  end

  def bool(value)
    value == true
  end
end
