# Preview at http://localhost:3000/rails/mailers/user_mailer
class UserMailerPreview < ActionMailer::Preview
  def magic_link
    user = User.new(id: 1, email: "preview@example.com")
    raw_token = "preview-token-not-real"
    UserMailer.magic_link(user, raw_token)
  end
end
