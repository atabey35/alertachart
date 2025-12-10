'use client';

/**
 * Password Form Component (Client-side)
 * Handles form submission for admin sales panel access
 */
export default function PasswordForm() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;

    try {
      const response = await fetch('/api/admin/sales/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        // Redirect to refresh the page and show admin content
        window.location.href = '/admin/sales';
      } else {
        const data = await response.json();
        alert(data.error || 'Yanlış şifre');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Giriş sırasında bir hata oluştu');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] p-8 rounded-lg border border-gray-800 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2 text-center">📊 Admin Sales Panel</h1>
        <p className="text-center text-gray-400 mb-6">Satış takip paneline erişmek için şifre girin</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2 text-gray-300">
              Şifre
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              autoFocus
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              placeholder="Admin şifresini girin"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Giriş Yap
          </button>
        </form>
      </div>
    </div>
  );
}
