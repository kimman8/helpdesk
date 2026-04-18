import Navbar from '../components/Navbar'

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold">Users</h1>
      </main>
    </div>
  )
}
