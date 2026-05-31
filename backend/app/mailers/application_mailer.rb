class ApplicationMailer < ActionMailer::Base
  # Production sets MAILER_FROM to an address on a Resend-verified domain
  # (e.g. "The Scribe <no-reply@scribe.somosbytes.es>"). The default keeps
  # local dev unchanged.
  default from: ENV.fetch("MAILER_FROM", "The Scribe <no-reply@scribe.local>")
  layout "mailer"
end
