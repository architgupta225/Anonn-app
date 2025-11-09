import Navigation from "@/components/Navigation";

export default function InviteRequired() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navigation />
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="max-w-md w-full text-center bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invite Required</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Access to Anonn is currently limited to invited users. If you believe this is a mistake or you have an invite code, please contact the team.
          </p>
          <a
            className="inline-flex items-center justify-center rounded-md bg-reddit-orange px-4 py-2 text-white hover:bg-reddit-orange/90"
            href="mailto:support@anonn.app?subject=Invite%20Request"
          >
            Request Access
          </a>
        </div>
      </div>
    </div>
  );
}


