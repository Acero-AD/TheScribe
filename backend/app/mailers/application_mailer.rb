class ApplicationMailer < ActionMailer::Base
  default from: "The Scribe <no-reply@scribe.local>"
  layout "mailer"
end
