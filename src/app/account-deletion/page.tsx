export const metadata = {
  title: 'Account deletion | Viora',
  description: 'How to request deletion of your Viora account and what happens next.',
};

export default function AccountDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-slate-800 dark:text-slate-100">
      <h1 className="text-3xl font-semibold tracking-tight">Delete your Viora account</h1>
      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Account deletion is available from an authenticated session. Sign in, open{' '}
        <a className="underline" href="/security">
          Security settings
        </a>
        , and choose <strong>Request account deletion</strong>.
      </p>

      <section className="mt-8 space-y-3 rounded-xl border border-slate-200 p-5 dark:border-slate-700">
        <h2 className="text-lg font-semibold">What happens when you request deletion</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
          <li>The request requires the explicit confirmation <code>DELETE_MY_ACCOUNT</code> and a recently issued access token.</li>
          <li>All connected devices are signed out immediately. Existing sessions stop working.</li>
          <li>Deletion runs after a grace period (7 days by default). You can cancel any time before processing starts.</li>
          <li>After processing, sign-in is disabled and the deletion cannot be undone.</li>
          <li>Your profile identifiers are anonymised. The account record and required financial, audit and chat records are retained in pseudonymous form for integrity and legal obligations.</li>
        </ul>
      </section>

      <section className="mt-6 space-y-3 rounded-xl border border-slate-200 p-5 dark:border-slate-700">
        <h2 className="text-lg font-semibold">Cancel a scheduled deletion</h2>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          Sign in and open Security settings. The current request and its scheduled date are shown there; choose{' '}
          <strong>Cancel deletion</strong> before processing begins. Once processing has started the request can no
          longer be cancelled.
        </p>
      </section>

      <p className="mt-8 text-xs text-slate-500 dark:text-slate-400">
        This page describes the backend policy only. It does not accept deletion requests and never displays account
        information.
      </p>
    </main>
  );
}
