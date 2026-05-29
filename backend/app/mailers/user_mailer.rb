class UserMailer < ApplicationMailer
  def magic_link(user, raw_token)
    @user = user
    @url = magic_link_url(token: raw_token)

    mail(
      to: user.email,
      subject: "Sign in to Scribe"
    )
  end
end
