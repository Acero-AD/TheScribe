import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../auth/AuthContext'

export function HomeScreen() {
  const { user, signOut } = useCurrentUser()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/sign-in', { replace: true })
  }

  return (
    <main>
      <header>
        <h1>Scoreboard</h1>
        <button type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </header>
      <p>Signed in as {user?.email}.</p>
    </main>
  )
}
