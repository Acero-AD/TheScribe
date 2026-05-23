module Time::ForUser
  def self.today(user, now: Time.current)
    zone_name = user.respond_to?(:timezone) ? user.timezone : nil
    zone = (zone_name.present? && ActiveSupport::TimeZone[zone_name]) || Time.zone || ActiveSupport::TimeZone["UTC"]
    now.in_time_zone(zone).to_date
  end
end
