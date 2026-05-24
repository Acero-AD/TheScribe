module Time::ForUser
  def self.today(user, now: Time.current)
    zone_name = user.respond_to?(:timezone) ? user.timezone : nil
    zone = (zone_name.present? && ActiveSupport::TimeZone[zone_name]) || Time.zone || ActiveSupport::TimeZone["UTC"]
    now.in_time_zone(zone).to_date
  end

  def self.this_week_start(user, now: Time.current)
    anchor = user.respond_to?(:week_starts_on) && user.week_starts_on == 0 ? :sunday : :monday
    today(user, now: now).beginning_of_week(anchor)
  end
end
